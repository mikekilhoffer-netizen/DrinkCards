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

export function setApiKey(key) {
  const settings = load()
  settings.anthropicApiKey = key.trim()
  save(settings)
}
