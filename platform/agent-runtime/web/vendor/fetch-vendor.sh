#!/usr/bin/env bash
# Refresh the locally-vendored browser runtime for the Engine-Room UI.
# React/ReactDOM/Babel are committed under web/vendor/js/ so the UI is local-first
# (no runtime CDN, CSP-safe). Run this only to bump the pinned versions; the app
# ships with these files already vendored.
set -euo pipefail
cd "$(dirname "$0")/js"

REACT=18.3.1
BABEL=7.29.0

curl -sSL -o react.production.min.js      "https://unpkg.com/react@${REACT}/umd/react.production.min.js"
curl -sSL -o react-dom.production.min.js  "https://unpkg.com/react-dom@${REACT}/umd/react-dom.production.min.js"
curl -sSL -o babel.min.js                 "https://unpkg.com/@babel/standalone@${BABEL}/babel.min.js"

echo "vendored: react@${REACT}, react-dom@${REACT}, @babel/standalone@${BABEL}"
# Note: the Helm design bundle (web/vendor/helm/_ds_bundle.js) + tokens are vendored
# separately from context/design/handoff and are not fetched here.
