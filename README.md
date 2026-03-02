# Bitbucket Review Live Folder

A Chrome extension that creates a “live tab group” containing Bitbucket Pull Requests (PRs) that need your review. Tabs are opened automatically when a new PR needs your review and closed when the PR is no longer relevant.

## Features
- Fetches **OPEN** PRs where you are requested as a reviewer.
- Auto‑managed tab group with a stable name and live count.
- Configurable auto‑refresh interval.
- Options page for Bitbucket credentials (username/email + app password).

## Requirements
- Node.js & npm
- Google Chrome (Developer Mode to load the extension)

## Install
```bash
npm install
```

## Build
```bash
npm run build
```

Build output is located in `dist/`.

## Load Extension (Chrome)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder

## Options Setup
Open the extension Options and set:
- **Bitbucket Username / Email**
- **App Password**
- **Auto‑refresh Interval**

Click **Save Settings**.

## Project Structure