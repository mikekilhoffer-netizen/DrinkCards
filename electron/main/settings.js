import { app, safeStorage } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

function settingsPath() {
  return join(app.getPath('userData'), 'settings.json')
}

function load() {
  try {
    if (existsSync(settingsPath())) {
      const data = JSON.parse(readFileSync(settingsPath(), 'utf-8'))
      if (data && typeof data === 'object' && !Array.isArray(data)) return data
    }
  } catch {}
  return {}
}

function save(data) {
  writeFileSync(settingsPath(), JSON.stringify(data, null, 2))
}

// The API key is encrypted with Windows DPAPI (via safeStorage), so a copy of
// settings.json - a backup, a synced profile, a file grabbed off the disk - is
// useless on any other account or machine. Keys saved by older versions in
// plain text are encrypted the first time they're read.
const canEncrypt = () => {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function storeKey(settings, key) {
  delete settings.anthropicApiKey
  delete settings.anthropicApiKeyEnc
  if (!key) return
  if (canEncrypt()) {
    settings.anthropicApiKeyEnc = safeStorage.encryptString(key).toString('base64')
  } else {
    // No OS key store available (rare on Windows): fall back to the old format
    // rather than losing the key.
    settings.anthropicApiKey = key
  }
}

export function getApiKey() {
  const settings = load()
  if (typeof settings.anthropicApiKeyEnc === 'string') {
    try {
      return safeStorage.decryptString(Buffer.from(settings.anthropicApiKeyEnc, 'base64'))
    } catch {
      // Encrypted under a different Windows account/profile - can't be read
      // here. Treat as "no key"; Settings will ask for it again.
      return ''
    }
  }
  const legacy = typeof settings.anthropicApiKey === 'string' ? settings.anthropicApiKey : ''
  if (legacy && canEncrypt()) {
    storeKey(settings, legacy)
    save(settings)
  }
  return legacy
}

export function setApiKey(key) {
  const settings = load()
  storeKey(settings, String(key ?? '').trim().slice(0, 500))
  save(settings)
}

// An explicitly saved location wins, including an empty one - someone who
// cleared the box is saying "don't check", and the default shouldn't override that.
export function getUpdateFeed(defaultFeed) {
  const value = load().updateFeedUrl
  return typeof value === 'string' ? value : defaultFeed
}

export function setUpdateFeed(url) {
  const settings = load()
  settings.updateFeedUrl = String(url ?? '').trim().slice(0, 1000)
  save(settings)
}

export function resetUpdateFeed() {
  const settings = load()
  delete settings.updateFeedUrl
  save(settings)
}
