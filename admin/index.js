const Mustache = require("mustache")
const querystring = require("querystring")
const {Storage} = require("@google-cloud/storage")
const storage = new Storage()

/**
 * Responds to admin HTTP requests.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.admin = (req, res) => {
  if (req.method == "GET") {
    handleGet(req, res);
  }
  else if (req.method == "POST") {
    handlePost(req, res);
  }
  else {
    res.status(400).send("Bad method")
  }
}

function handleGet(req, res) {
  console.log("Handle GET")
  loadConfig()
  .then((config) => {
    respondWithForm(res, config)
  })
  .catch((error) => {
    res.status(500).send(error.toString())
  })
}

function handlePost(req, res) {
  console.log("Handle POST")
  parsePostParams(req)
  .then((config) => {
    return loadJsTemplate()
    .then((jsTemplate) => {
      return saveJs(jsTemplate.replace('"***CONFIG***"', JSON.stringify(config)))
      .then(() => {
        return saveConfig(config)
        .then(() => {
          respondWithForm(res, config)
        })
      })
    })
  })
  .catch((error) => {
    res.status(500).send(error.toString())
  })
}

function loadConfig() {
  return new Promise((resolve, reject) => {
    console.log("Load config")
    loadStorageObject("admin-happycansnow-com", "config.json")
    .then((data) => {
      const obj = JSON.parse(data)
      console.log(obj)
      resolve(obj)
    })
    .catch(reject)
  })
}

function saveConfig(data) {
  console.log("Save config")
  return saveStorageObject("admin-happycansnow-com", "config.json", JSON.stringify(data), "application/json")
}

function loadFormTemplate() {
  console.log("Load form template")
  return loadStorageObject("admin-happycansnow-com", "form.html")
}

function loadJsTemplate() {
  console.log("Load JS template")
  return loadStorageObject("admin-happycansnow-com", "template.minified.js")
}

function saveJs(data) {
  console.log("Save JS ")
  return saveStorageObject("code-happycansnow-com", "servreq.js", data, "application/javascript")
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

function respondWithForm(res, config) {
  loadFormTemplate()
  .then((formTemplate) => {
    res.status(200).send(Mustache.render(formTemplate, config))
  })
  .catch((error) => {
    res.status(500).send(error.toString())
  })
}

function loadStorageObject(bucketName, path) {
  return new Promise((resolve, reject) => {
    const rStream = storage.bucket(bucketName).file(path).createReadStream()
    var buf = "";
    rStream.on("data", function(data) {
      buf += data;
    })
    rStream.on("end", function() {
      console.log("Loaded", buf.replace("\n", "").substring(0, 40), "...")
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
    console.log("Saving", data.replace("\n", "").substring(0, 40), "...")
    wStream.end(data);
  })
}
