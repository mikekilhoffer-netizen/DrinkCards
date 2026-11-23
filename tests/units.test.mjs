import { test } from 'node:test'
import assert from 'node:assert/strict'
import { UNITS, normalizeUnit } from '../src/units.mjs'

test('photo spellings map onto the dropdown units', () => {
  assert.equal(normalizeUnit('cups'), 'cup')
  assert.equal(normalizeUnit('Cups'), 'cup')
  assert.equal(normalizeUnit('cup'), 'cup')
  assert.equal(normalizeUnit('ounces'), 'oz')
  assert.equal(normalizeUnit('z'), 'oz')
  assert.equal(normalizeUnit('shots'), 'shot')
  assert.equal(normalizeUnit('oz.'), 'oz')
  assert.equal(normalizeUnit('fl oz'), 'oz')
  assert.equal(normalizeUnit('Tbsp.'), 'tbsp')
  assert.equal(normalizeUnit('T'), 'tbsp')
  assert.equal(normalizeUnit('t'), 'tsp')
  assert.equal(normalizeUnit('teaspoons'), 'tsp')
  assert.equal(normalizeUnit('dashes'), 'dash')
  assert.equal(normalizeUnit('squirt'), 'splash')
  assert.equal(normalizeUnit('each'), 'ea.')
  assert.equal(normalizeUnit('ea'), 'ea.')
  assert.equal(normalizeUnit('bar spoon'), 'barspoon')
  assert.equal(normalizeUnit('liters'), 'L')
})

test('blank and missing units mean "no unit"', () => {
  assert.equal(normalizeUnit(''), '')
  assert.equal(normalizeUnit(undefined), '')
  assert.equal(normalizeUnit(null), '')
  assert.ok(UNITS.includes(''))
})

test('unknown units pass through unchanged so the form can show them', () => {
  assert.equal(normalizeUnit('scoop'), 'scoop')
  assert.equal(normalizeUnit('  sprig '), 'sprig')
})

test('every canonical unit maps to itself', () => {
  for (const u of UNITS) assert.equal(normalizeUnit(u), u)
})
