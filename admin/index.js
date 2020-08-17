const fs = require("fs");
const moment = require("moment")
const express = require("express")
const Mustache = require("mustache")
const querystring = require("querystring")
const {Storage} = require("@google-cloud/storage")
const storage = new Storage()
const metadata = require('gcp-metadata');
const {OAuth2Client} = require('google-auth-library');

const PORT = process.env.PORT || 3000;

const server = express()
  .get("/admin", handleGet)
  .post("/admin", handlePost)
  .use(express.static("static"))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))
const oAuth2Client = new OAuth2Client();

/**
 * Serve GET request for the admin form.
 */
async function handleGet(req, res) {
  try {
    console.log("Handle GET")
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
async function handlePost(req, res) {
  try {
    console.log("Handle POST")
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
  const html = Mustache.render(
      formTemplate,
      Object.assign({}, config, { adminApiKey: getAdminApiKey() }))
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

async function getEmailOfAuthUser(req) {
  try {
    const assertion = req.header("X-Goog-IAP-JWT-Assertion");
    if (assertion) {
      const info = await validateAssertion(assertion);
      console.log(info)
      if (info.email) {
        return info.email;
      }
    }
  }
  catch (error) {
    console.log(error);
  }
  return "(unknown)"
}

let aud; // Cache externally fetched information for future invocations

async function validateAssertion(assertion) {
  // Check that the assertion's audience matches ours
  if (!aud && (await metadata.isAvailable())) {
    let project_number = await metadata.project('numeric-project-id');
    let project_id = await metadata.project('project-id');
    aud = '/projects/' + project_number + '/apps/' + project_id;
  }

  // Fetch the current certificates and verify the signature on the assertion
  const response = await oAuth2Client.getIapPublicKeys();
  const ticket = await oAuth2Client.verifySignedJwtWithCertsAsync(
    assertion,
    response.pubkeys,
    aud,
    ['https://cloud.google.com/iap']
  );
  return ticket.getPayload();
}

function getAdminApiKey() {
  var obj = require("./api.json");
  return obj.apiKey;
}

module.exports = server;
