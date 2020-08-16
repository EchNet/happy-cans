# happy-cans: a Google Cloud Platform project.

Find out whether potential customers reside within the service area before accepting service requests.

Target site: happycansnow.com

## Contents:

`template.js`  Client logic.

`admin` App Engine app that edits config, including the service area map.

`sspush` Cloud Function that sends usage information to the back end.

`chromextension` Chrome extension that writes the script tag into the target site.

## Setup

Place a copy of credentials.json into the admin and sspush folders.

## Bugs

There is as yet no provision for dev vs. prod modes.  You are working with live data.  Watch out.
