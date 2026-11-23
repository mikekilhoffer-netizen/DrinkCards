import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isSafeLocalImagePath, isAllowedExternalUrl, isAllowedFeed,
  isSafeInstallerName, sanitizeImportedRecipes, sanitizeRecipeInput, findDangerousSwitch
} from '../electron/main/safety.mjs'
import { normalizeUnit } from '../src/units.mjs'

test('photo paths: local drive images only', () => {
  assert.ok(isSafeLocalImagePath('C:\\Users\\me\\Pictures\\mojito.jpg'))
  assert.ok(isSafeLocalImagePath('D:/photos/a.PNG'))
  // UNC / remote: would leak NTLM credentials
  assert.equal(isSafeLocalImagePath('\\\\attacker.example\\share\\x.jpg'), false)
  assert.equal(isSafeLocalImagePath('//attacker.example/share/x.jpg'), false)
  assert.equal(isSafeLocalImagePath('\\\\?\\C:\\x.jpg'), false)
  assert.equal(isSafeLocalImagePath('\\\\.\\pipe\\x.jpg'), false)
  assert.equal(isSafeLocalImagePath('http://attacker.example/x.jpg'), false)
  assert.equal(isSafeLocalImagePath('file:///C:/x.jpg'), false)
  // wrong type of file / data streams / junk
  assert.equal(isSafeLocalImagePath('C:\\Windows\\win.ini'), false)
  assert.equal(isSafeLocalImagePath('C:\\a.txt:hidden.jpg'), false)
  assert.equal(isSafeLocalImagePath('C:\\a.jpg\0.exe'), false)
  assert.equal(isSafeLocalImagePath(''), false)
  assert.equal(isSafeLocalImagePath(null), false)
  assert.equal(isSafeLocalImagePath({}), false)
})

test('external links: https only', () => {
  assert.ok(isAllowedExternalUrl('https://buy.stripe.com/abc'))
  for (const bad of [
    'http://example.com', 'file:///C:/Windows/System32/calc.exe', 'ms-msdt:/id x',
    'search-ms:query=x', 'javascript:alert(1)', 'C:\\x.exe', 'https://user:pw@evil.example', 'not a url'
  ]) assert.equal(isAllowedExternalUrl(bad), false, bad)
})

test('update feeds: https or folder, never plain http', () => {
  assert.ok(isAllowedFeed('https://updates.guestflowweather.com/drinkcards/'))
  assert.ok(isAllowedFeed('\\\\server\\apps\\drinkcards'))
  assert.ok(isAllowedFeed('Z:\\apps\\drinkcards'))
  assert.ok(isAllowedFeed(''))
  for (const bad of ['http://updates.example/', 'ftp://x/', 'file:///C:/x', '\\\\?\\C:\\x', 'relative\\path'])
    assert.equal(isAllowedFeed(bad), false, bad)
})

test('installer names from latest.yml: bare .exe only', () => {
  assert.ok(isSafeInstallerName('Drink Cards-Setup-1.1.2.exe'))
  for (const bad of [
    '..\\..\\Windows\\System32\\calc.exe', '../evil.exe', 'C:\\evil.exe', 'sub/evil.exe',
    'evil.bat', 'evil.lnk', 'evil.exe.js', 'evil.cmd', 'https://evil.example/x.exe', ''
  ]) assert.equal(isSafeInstallerName(bad), false, bad)
})

test('AI output: only recipe fields survive, as bounded strings', () => {
  const hostile = JSON.parse(`[{
    "name": "Mojito", "glass": "Highball", "method": "Build", "note": "",
    "photo_path": "\\\\\\\\attacker.example\\\\x.jpg",
    "category": "x", "id": 5, "__proto__": {"polluted": true},
    "ingredients": [{"amount": 1.5, "unit": "cups", "name": "Rum", "extra": "x"}, "junk", null],
    "garnishes": "not an array"
  }, "not a recipe", null]`)
  const out = sanitizeImportedRecipes(hostile, normalizeUnit)
  assert.equal(out.length, 1)
  assert.deepEqual(Object.keys(out[0]).sort(), ['garnishes', 'glass', 'ingredients', 'method', 'name', 'note'])
  assert.equal(out[0].photo_path, undefined)
  assert.deepEqual(out[0].ingredients[0], { amount: '1.5', unit: 'cup', name: 'Rum' })
  assert.deepEqual(out[0].ingredients[1], { amount: '', unit: '', name: '' })
  assert.deepEqual(out[0].garnishes, [])
  assert.equal({}.polluted, undefined)
  // size limits
  const big = sanitizeImportedRecipes([{ name: 'x'.repeat(10000), ingredients: Array(500).fill({ name: 'a' }) }], normalizeUnit)
  assert.equal(big[0].name.length, 200)
  assert.equal(big[0].ingredients.length, 50)
  assert.equal(sanitizeImportedRecipes(Array(500).fill({ name: 'a' }), normalizeUnit).length, 50)
  // a single object instead of an array still works
  assert.equal(sanitizeImportedRecipes({ name: 'Solo' }, normalizeUnit)[0].name, 'Solo')
})

test('recipes from the page: known fields only, strings only', () => {
  const r = sanitizeRecipeInput({
    name: "x'); DROP TABLE recipes;--", category: { evil: 1 }, glass: 12, id: 99, created_at: 'x',
    photo_path: '\\\\attacker.example\\x.jpg',
    ingredients: [{ amount: 1, unit: 'cups', name: { toString: 'x' } }, null, 'junk'],
    garnishes: 'not an array'
  }, normalizeUnit)
  assert.deepEqual(Object.keys(r).sort(), ['category', 'garnishes', 'glass', 'ingredients', 'method', 'name', 'note', 'photo_path'])
  assert.equal(r.name, "x'); DROP TABLE recipes;--") // stored as text, never executed (queries are parameterized)
  assert.equal(r.category, '')
  assert.equal(r.glass, '12')
  assert.equal(r.photo_path, '')
  assert.deepEqual(r.ingredients[0], { amount: '1', unit: 'cup', name: '' })
  assert.deepEqual(r.garnishes, [])
  assert.deepEqual(sanitizeRecipeInput(null, normalizeUnit).ingredients, [])
  assert.deepEqual(sanitizeRecipeInput([1, 2], normalizeUnit).name, '')
})

test('dangerous command-line switches are spotted in any spelling', () => {
  const exe = 'C:\\Programs\\Drink Cards.exe'
  for (const argv of [
    [exe, '--remote-debugging-port=9222'], [exe, '--REMOTE-DEBUGGING-PORT=1'], [exe, '-remote-debugging-port=1'],
    [exe, '--remote-debugging-pipe'], [exe, '--inspect'], [exe, '--inspect-brk=9229'], [exe, '--no-sandbox'],
    [exe, '--disable-web-security'], [exe, '--js-flags=--allow-natives-syntax'], [exe, 'ok', '--proxy-server=x:1'],
    [exe, '/remote-debugging-port=9222'], [exe, '/NO-SANDBOX']
  ]) assert.ok(findDangerousSwitch(argv), argv.join(' '))
  assert.equal(findDangerousSwitch([exe]), null)
  assert.equal(findDangerousSwitch([exe, '--user-data-dir=C:\\x', '--lang=en-US']), null)
  // the exe path itself is never treated as a switch
  assert.equal(findDangerousSwitch(['--no-sandbox']), null)
})
