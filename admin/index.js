const fs = require("fs");
const moment = require("moment")
const express = require("express")
const Mustache = require("mustache")
const querystring = require("querystring")
const {google} = require("googleapis")
const {Storage} = require("@google-cloud/storage")
const {OAuth2Client} = require('google-auth-library');
const apiKeys = require("./api.json");

const storage = new Storage()
const sheets = google.sheets({version: 'v4'});

const PORT = process.env.PORT || 3000;

const server = express()
  .get("/admin", handleGetForm)
  .post("/admin", handlePostForm)
  .use(express.static("static"))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))
const oAuth2Client = new OAuth2Client();

/**
 * Serve GET request for the admin form.
 */
async function handleGetForm(req, res) {
  try {
    console.log("Handle GET /admin")
    const config = await loadConfig();
    await respondWithForm(res, config);
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
    console.log("Handle POST /admin")
    const oldConfig = await loadConfig();
    const newConfig = await parsePostParams(req);
    const jsTemplate = await loadJsTemplate();
    await saveConfig(newConfig)
    await saveLog(req, oldConfig, newConfig)
    await saveJs(jsTemplate.replace('"***CONFIG***"', JSON.stringify(newConfig)))
    await respondWithForm(res, newConfig)
  }
  catch (error) {
    console.log(error);
    res.status(500).send(error.toString())
  }
}

async function loadConfig() {
  console.log("Load config")
  const data = await loadStorageObject("admin-happycansnow-com", "config.json")
  const obj = JSON.parse(data)
  console.log(obj)
  return obj
}

async function saveConfig(data) {
  console.log("Save config")
  await saveStorageObject("admin-happycansnow-com", "config.json", JSON.stringify(data), "application/json")
}

async function loadFormTemplate() {
  console.log("Load form template")
  return fs.readFileSync("./form.html", "utf8")
}

async function loadJsTemplate() {
  console.log("Load JS template")
  return await loadStorageObject("admin-happycansnow-com", "template.minified.js")
}

async function saveLog(req, oldConfig, newConfig) {
  const logEntry = {
    datetime: moment().format(),
    oldConfig: oldConfig,
    newConfig: newConfig,
    url: req.protocol + '://' + req.get("host") + req.originalUrl
    // TODO: log email of auth user
  }
  const logFileName = "logs/log-" + moment().format() + ".json";
  await saveStorageObject("admin-happycansnow-com", logFileName, JSON.stringify(logEntry), "application/json")
}

async function saveJs(data) {
  console.log("Save JS ")
  await saveStorageObject("code-happycansnow-com", "servreq.js", data, "application/javascript")
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

async function respondWithForm(res, config) {
  const formTemplate = await loadFormTemplate()
  const pinsData = await loadPinsData()
  const html = Mustache.render(
      formTemplate,
      Object.assign({}, config, {
        adminApiKey: apiKeys.mapsApiKey,
        pinsData: JSON.stringify(pinsData)
      }))
  res.status(200).send(html)
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

async function loadPinsData() {
  const spreadsheetId = "1_HBEK3Jc6tG0ad4xoxMZTAVfklTGFg42WOqO5mEFoNI";
  const range = "Page1"
  const response = await sheets.spreadsheets.values.get({
    auth: getJwt(),
    key: apiKeys.sheetsApiKey,
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE"
  })
  return formatPinsData(response.data.values);
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
