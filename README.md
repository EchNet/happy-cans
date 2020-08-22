# happy-cans: a Google Cloud Platform project.

Find out whether potential customers reside within the service area before accepting service requests.

Target site: happycansnow.com

## Contents:

`template.js`  Client logic.

`admin` App Engine app that edits config, including the service area map.

`sspush` Cloud Function that sends usage information to the back end.

`chromextension` Chrome extension that writes the script tag into the target site.

## Setup

Copy a credentials.json with service account credentials into the admin and sspush folders.

Place an api.json file consisting of one value, apiKey, into the admin folder.  The API key must grant access to the Maps and Places APIs.

Place an api.json file consisting of one value, apiKey, into the sspush folder.  The API key must grant access to the Sheets API.

## Bugs

There is as yet no provision for dev vs. prod modes.  You are working with live data.  Watch out.
