const fs = require("fs");
const moment = require("moment")
const express = require("express")
const Mustache = require("mustache")
const querystring = require("querystring")
const {google} = require("googleapis")
const {Storage} = require("@google-cloud/storage")
const apiKeys = require("./api.json");

const storage = new Storage()
const sheets = google.sheets({version: 'v4'});

const PORT = process.env.PORT || 3000;

const server = express()
  .get("/admin", (req, res) => res.redirect("/admin/happy-cans"))
  .get("/admin/:siteId", handleGetForm)
  .post("/admin/:siteId", handlePostForm)
  .use(express.static("static"))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

/**
 * Serve GET request for the admin form.
 */
async function handleGetForm(req, res) {
  try {
    console.log("Handle GET admin", req.params.siteId)
    const siteHandler = new SiteHandler(req.params.siteId)
    const config = await siteHandler.loadConfig();
    await siteHandler.respondWithForm(res, config);
  }
  catch (error) {
    console.log(error);
    res.status(500).send(error.toString())
  }
}

/**
 * Serve POST request to save new config.
 */
async function handlePostForm(req, res) {
  try {
    console.log("Handle POST admin", req.params.siteId)
    const siteHandler = new SiteHandler(req.params.siteId)
    const oldConfig = await siteHandler.loadConfig();
    const newConfig = await parsePostParams(req);
    const jsTemplate = await siteHandler.loadJsTemplate();
    await siteHandler.saveConfig(newConfig)
    await siteHandler.saveLog(req, oldConfig, newConfig)
    await siteHandler.saveJs(jsTemplate.replace('"***CONFIG***"', JSON.stringify(newConfig)))
    await siteHandler.respondWithForm(res, newConfig)
  }
  catch (error) {
    console.log(error);
    res.status(500).send(error.toString())
  }
}

class SiteHandler {
  constructor(siteId) {
    if (siteId === "happy-cans") {
      Object.assign(this, {
        codeBucketName: "code-happycansnow-com",
        configBucketName: "admin-happycansnow-com",
        configFileName: "config.json",
        jsFileName: "servreq.js",
        formPath: "./form.html",
        logDirName: "logs",
        spreadsheetId: "1_HBEK3Jc6tG0ad4xoxMZTAVfklTGFg42WOqO5mEFoNI",
        mapConfig: {
          center: { lat: 32.783333, lng: -79.933333 },
          zoom: 11
        }
      })
    }
    else if (siteId === "demo") {
      Object.assign(this, {
        codeBucketName: "code-happycansnow-com",
        configBucketName: "admin-happycansnow-com",
        configFileName: "demo-config.json",
        jsFileName: "demo-servreq.js",
        formPath: "./form.html",
        logDirName: "demo-logs",
        spreadsheetId: "1RJdXv9NezenMVWQQIRPn6tGsZAX_cqnPxKEPxtU48CQ",
        mapConfig: {
          center: { lat: 32.016667, lng: -81.116667 },
          zoom: 11
        }
      })
    }
    else {
      throw "Bad site ID";
    }
  }
  async loadConfig() {
    console.log("Load config")
    try {
      var data = await loadStorageObject(this.configBucketName, this.configFileName)
      const obj = JSON.parse(data)
      console.log(obj)
      return obj
    }
    catch (e) {
      return {}
    }
  }
  async saveConfig(data) {
    console.log("Save config")
    await saveStorageObject(this.configBucketName, this.configFileName, JSON.stringify(data), "application/json")
  }
  async loadFormTemplate() {
    console.log("Load form template")
    return fs.readFileSync(this.formPath, "utf8")
  }
  async loadJsTemplate() {
    console.log("Load JS template")
    return await loadStorageObject(this.configBucketName, "template.minified.js")
  }
  async saveLog(req, oldConfig, newConfig) {
    const logEntry = {
      datetime: moment().format(),
      oldConfig: oldConfig,
      newConfig: newConfig,
      url: req.protocol + '://' + req.get("host") + req.originalUrl
      // TODO: log email of auth user
    }
    const logFileName = this.logDirName + "/log-" + moment().format() + ".json";
    await saveStorageObject(this.configBucketName, logFileName, JSON.stringify(logEntry), "application/json")
  }
  async saveJs(data) {
    console.log("Save JS ")
    await saveStorageObject(this.codeBucketName, this.jsFileName, data, "application/javascript")
  }
  async respondWithForm(res, config) {
    const formTemplate = await this.loadFormTemplate()
    const pinsData = await this.loadPinsData()
    const mapConfig = this.mapConfig;
    const html = Mustache.render(
        formTemplate,
        Object.assign({}, config, {
          adminApiKey: apiKeys.mapsApiKey,
          pinsData: JSON.stringify(pinsData),
          mapConfig: JSON.stringify(mapConfig)
        }))
    res.status(200).send(html)
  }
  async loadPinsData() {
    const range = "Page1"
    const response = await sheets.spreadsheets.values.get({
      auth: getJwt(),
      key: apiKeys.sheetsApiKey,
      spreadsheetId: this.spreadsheetId,
      range,
      valueRenderOption: "UNFORMATTED_VALUE"
    })
    return formatPinsData(response.data.values);
  }
}

function loadStorageObject(bucketName, path) {
  return new Promise((resolve, reject) => {
    const rStream = storage.bucket(bucketName).file(path).createReadStream()
    var buf = "";
    rStream.on("data", function(data) {
      buf += data;
    })
    rStream.on("end", function() {
      console.log("Loaded", bucketName, path, buf.replace("\n", "").substring(0, 40), "...")
      resolve(buf)
    })
    rStream.on("error", function(e) {
      reject(e)
    })
  })
}

function saveStorageObject(bucketName, path, data, mimeType) {
  return new Promise((resolve, reject) => {
    const wStream = storage.bucket(bucketName).file(path).createWriteStream({
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=20"
      },
      contentType: mimeType
    })
    wStream.on("finish", function() {
      resolve()
    })
    wStream.on("error", function(e) {
      reject(e)
    })
    console.log("Saving", bucketName, path, data.replace("\n", "").substring(0, 40), "...")
    wStream.end(data);
  })
}

function parsePostParams(req) {
  return new Promise((resolve, reject) => {
    var buf = "";
    req.on("data", function(data) {
      buf += data;
    })
    req.on("end", function() {
      console.log("Parse POST params", buf)
      const params = querystring.parse(buf)
      resolve(params)
    })
  })
}

function formatPinsData(rows) {
  const insideCoords = [];
  const outsideCoords = [];

  function parseCoords(coordsString) {
    const parts = coordsString.split(",");
    return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) }
  }

  rows.forEach((row) => {
    try {
      const coords = row[2];
      const inArea = row[3];
      switch (inArea) {
      case "Y":
        insideCoords.push(parseCoords(coords))
        break;
      case "N":
        outsideCoords.push(parseCoords(coords))
        break;
      }
    }
    catch (e) {
      console.log(e.toString());
      // On to the next.
    }
  })
  return { insideCoords, outsideCoords }
}


function getJwt() {
  var credentials = require("./credentials.json");
  return new google.auth.JWT(
    credentials.client_email, null, credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

module.exports = server;
