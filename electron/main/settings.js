import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

function settingsPath() {
  return join(app.getPath('userData'), 'settings.json')
}

function load() {
  try {
    if (existsSync(settingsPath())) {
      return JSON.parse(readFileSync(settingsPath(), 'utf-8'))
    }
  } catch {}
  return {}
}

function save(data) {
  writeFileSync(settingsPath(), JSON.stringify(data, null, 2))
}

export function getApiKey() {
  return load().anthropicApiKey || ''
}

// An explicitly saved location wins, including an empty one - someone who
// cleared the box is saying "don't check", and the default shouldn't override that.
export function getUpdateFeed(defaultFeed) {
  const value = load().updateFeedUrl
  return typeof value === 'string' ? value : defaultFeed
}

export function setUpdateFeed(url) {
  const settings = load()
  settings.updateFeedUrl = String(url ?? '').trim()
  save(settings)
}

export function resetUpdateFeed() {
  const settings = load()
  delete settings.updateFeedUrl
  save(settings)
}

export function setApiKey(key) {
  const settings = load()
  settings.anthropicApiKey = key.trim()
  save(settings)
}
