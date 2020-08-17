const {google} = require("googleapis")
const moment = require("moment")

const sheets = google.sheets({version: 'v4'});

/**
 * Responds to requests to push data to spreadsheet.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.sspush = (req, res) => {
  const referer = req.get("referer") || "";
  if (!referer.match(new RegExp("^http(s)?://(www\\.)?happycansnow.com"))) {
    console.log("BLOCKED sspush request from", referer)
  }
  else if (!req.query.a) {
    console.log("BLOCKED request missing params")
  }
  else {
    var spreadsheetId = "1_HBEK3Jc6tG0ad4xoxMZTAVfklTGFg42WOqO5mEFoNI";
    var range = "A1";
    var row = [ moment().format(), req.query.a, req.query.b, req.query.c, req.query.d ]
    appendSheetRow(spreadsheetId, range, row);
  }
  res.status(200).type("text/plain").end("OK");
}

function getJwt() {
  var credentials = require("./credentials.json");
  return new google.auth.JWT(
    credentials.client_email, null, credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

function getApiKey() {
  var obj = require("./api.json");
  return obj.apiKey;
}

function appendSheetRow(spreadsheetId, range, row) {
  sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: range,
    auth: getJwt(),
    key: getApiKey(),
    valueInputOption: 'RAW',
    resource: {values: [row]}
  }, function(err, result) {
    if (err) {
      throw err;
    }
    else {
      console.log('Updated sheet: ' + result.data.updates.updatedRange);
    }
  });
}
