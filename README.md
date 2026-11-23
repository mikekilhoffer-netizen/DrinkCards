# Drink Cards

A Windows desktop app for building, organizing and printing drink recipe cards.
Runs entirely on your machine (local SQLite via sql.js). Optional AI import
reads a photo of a paper recipe card using Claude — bring your own Anthropic
API key, entered in Settings.

## Install

Download the latest `Drink Cards-Setup-<version>.exe` and run it. The app
checks for updates each time it starts.

Your data lives in `%APPDATA%\drinkcards\` and survives updates and uninstalls.

## Develop

```
npm install
npm run dev        # run with hot reload
npm test           # unit tests
npm run release    # build installer + stage update files in release/
```

Stack: Electron 32, electron-vite, React 18, sql.js.

Publishing updates: see [docs/PUBLISHING-UPDATES.md](docs/PUBLISHING-UPDATES.md).
