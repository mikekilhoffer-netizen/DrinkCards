import { app } from 'electron'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getUpdateFeed } from './settings.js'
import { isNewer, parseManifest } from './versionCheck.mjs'
import { isAllowedFeed, isSafeInstallerName } from './safety.mjs'

// Checking for a newer build. Same scheme as ScanLedger: electron-builder
// writes a small latest.yml next to every installer, and publishing a release
// is copying the installer + latest.yml to one static location. Every installed
// copy reads that file on launch and compares versions.
//
// The feed can be an HTTPS folder or a plain folder path (mapped drive or
// \\server\share), so a business with a file share can host updates itself.
//
// Nothing is installed automatically - the banner opens the installer download,
// and the person runs it with the app closed.

export const DEFAULT_UPDATE_FEED = 'https://updates.guestflowweather.com/drinkcards/'

// Only https is ever fetched; isAllowedFeed refuses plain http up front.
const isHttp = (feed) => /^https:\/\//i.test(feed)
const MAX_MANIFEST_BYTES = 64 * 1024

function checkSize(text) {
  if (text.length > MAX_MANIFEST_BYTES) throw new Error('The update file is too large to be a latest.yml.')
  return text
}

function manifestLocation(feed) {
  if (/\.ya?ml$/i.test(feed)) return feed
  if (isHttp(feed)) return `${feed.replace(/\/+$/, '')}/latest.yml`
  return join(feed, 'latest.yml')
}

async function readManifest(location) {
  if (!isHttp(location)) return checkSize(await readFile(location, 'utf-8'))

  // Cache-buster: a CDN holding yesterday's latest.yml looks exactly like
  // "you're up to date", which nobody would think to question.
  const url = `${location}${location.includes('?') ? '&' : '?'}_=${Date.now()}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    if (!res.ok) throw new Error(`The update location answered ${res.status}.`)
    // A redirect must not have downgraded the connection to plain http.
    if (!/^https:\/\//i.test(res.url)) throw new Error('The update location redirected to an insecure address.')
    return checkSize(await res.text())
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('The update location took too long to answer.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function checkForUpdate() {
  const feed = getUpdateFeed(DEFAULT_UPDATE_FEED).trim()
  const currentVersion = app.getVersion()
  if (!feed) throw new Error('No update location is set.')
  if (!isAllowedFeed(feed)) {
    throw new Error('The update location must be an https:// address or a folder path.')
  }

  const location = manifestLocation(feed)
  let text
  try {
    text = await readManifest(location)
  } catch (err) {
    throw new Error(`Couldn't read update details from ${location}. ${err.message}`)
  }

  const manifest = parseManifest(text)
  if (!manifest) throw new Error(`Found a file at ${location} but couldn't read a version from it.`)

  // The installer name comes from the update host; a tampered latest.yml must
  // not be able to point the button at "..\..\something" or a script.
  if (manifest.fileName && !isSafeInstallerName(manifest.fileName)) {
    throw new Error(`The update lists an installer named "${manifest.fileName}", which isn't a plain .exe name. Not offering it.`)
  }

  let downloadUrl = null
  if (manifest.fileName) {
    const folder = location.replace(/[\\/][^\\/]+$/, '')
    downloadUrl = isHttp(feed)
      ? `${folder}/${encodeURIComponent(manifest.fileName)}`
      : join(folder, manifest.fileName)
  }

  return {
    currentVersion,
    latestVersion: manifest.version,
    updateAvailable: isNewer(manifest.version, currentVersion),
    downloadUrl,
    releaseDate: manifest.releaseDate,
    feed
  }
}
