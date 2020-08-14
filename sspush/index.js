const {google} = require("googleapis")

/**
 * Responds to requests to push data to spreadsheet.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.sspush = (req, res) => {
  var jwt = getJwt();
  var apiKey = req.query.apiKey;
  var spreadsheetId = "1_HBEK3Jc6tG0ad4xoxMZTAVfklTGFg42WOqO5mEFoNI";
  var range = 'A1';
  var row = [ req.query.a, req.query.b, req.query.c, req.query.d ]
  appendSheetRow(jwt, apiKey, spreadsheetId, range, row);
  res.status(200).type("text/plain").end("OK");
}

function getJwt() {
  var credentials = require("./credentials.json");
  return new google.auth.JWT(
    credentials.client_email, null, credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

function appendSheetRow(jwt, apiKey, spreadsheetId, range, row) {
  const sheets = google.sheets({version: 'v4'});
  sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: range,
    auth: jwt,
    key: apiKey,
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
