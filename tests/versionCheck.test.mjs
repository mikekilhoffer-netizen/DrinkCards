import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNewer, parseManifest } from '../electron/main/versionCheck.mjs'

test('isNewer compares numerically, not as strings', () => {
  assert.equal(isNewer('1.10.0', '1.9.0'), true)
  assert.equal(isNewer('1.9.0', '1.10.0'), false)
  assert.equal(isNewer('1.1.0', '1.0.0'), true)
  assert.equal(isNewer('1.1', '1.1.0'), false)
  assert.equal(isNewer('v2.0.0', '1.9.9'), true)
  assert.equal(isNewer('1.0.0', '1.0.0'), false)
  assert.equal(isNewer('garbage', '1.0.0'), false)
})

test('parseManifest reads electron-builder latest.yml', () => {
  const yml = [
    'version: 1.1.0',
    'files:',
    '  - url: Drink-Cards-Setup-1.1.0.exe',
    '    sha512: abc==',
    '    size: 123',
    'path: Drink-Cards-Setup-1.1.0.exe',
    'sha512: abc==',
    "releaseDate: '2026-11-22T12:00:00.000Z'",
    ''
  ].join('\r\n')
  assert.deepEqual(parseManifest(yml), {
    version: '1.1.0',
    fileName: 'Drink-Cards-Setup-1.1.0.exe',
    releaseDate: '2026-11-22T12:00:00.000Z'
  })
})

test('parseManifest falls back to files[0].url and rejects junk', () => {
  assert.equal(parseManifest('version: 2.0.0\nfiles:\n  - url: a.exe\n').fileName, 'a.exe')
  assert.equal(parseManifest('<html>not found</html>'), null)
})
