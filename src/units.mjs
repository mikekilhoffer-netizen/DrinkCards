// The units a recipe line can use, shared by the form (dropdown), the AI
// import prompt, and normalization of whatever the AI or older data supplies.
// '' means "no unit" (e.g. "Top with soda").
export const UNITS = [
  'oz', 'ml', 'cl', 'cup', 'pt', 'qt', 'L',
  'tsp', 'tbsp', 'barspoon',
  'shot', 'dash', 'drop', 'splash', 'rinse', 'float', 'top', 'part', 'pinch',
  'ea.', ''
]

export const unitLabel = (u) => (u === '' ? '(none)' : u)

// Spellings seen on real recipe cards → the canonical unit above.
const ALIASES = {
  oz: 'oz', z: 'oz', ounce: 'oz', ounces: 'oz', 'fl oz': 'oz', floz: 'oz', 'fluid ounce': 'oz', 'fluid ounces': 'oz',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  cl: 'cl', centiliter: 'cl', centiliters: 'cl', centilitre: 'cl', centilitres: 'cl',
  cup: 'cup', cups: 'cup', c: 'cup',
  pt: 'pt', pint: 'pt', pints: 'pt',
  qt: 'qt', quart: 'qt', quarts: 'qt',
  l: 'L', liter: 'L', liters: 'L', litre: 'L', litres: 'L', ltr: 'L',
  tsp: 'tsp', tsps: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', t: 'tsp',
  tbsp: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  barspoon: 'barspoon', barspoons: 'barspoon', 'bar spoon': 'barspoon', 'bar spoons': 'barspoon', bsp: 'barspoon',
  shot: 'shot', shots: 'shot',
  dash: 'dash', dashes: 'dash',
  drop: 'drop', drops: 'drop',
  splash: 'splash', splashes: 'splash', squirt: 'splash', squirts: 'splash',
  rinse: 'rinse', float: 'float', top: 'top', 'top with': 'top',
  part: 'part', parts: 'part',
  pinch: 'pinch', pinches: 'pinch',
  ea: 'ea.', each: 'ea.', whole: 'ea.', pc: 'ea.', pcs: 'ea.', piece: 'ea.', pieces: 'ea.',
  none: '', '-': ''
}

// Returns a unit from UNITS when it recognizes the input; otherwise returns
// the input trimmed, so the form can show it as-is rather than silently
// displaying a different unit than the one that will be saved.
export function normalizeUnit(raw) {
  if (raw == null) return ''
  const trimmed = String(raw).trim()
  if (UNITS.includes(trimmed)) return trimmed
  // 'T' (capital) is tablespoon by convention; lowercase 't' is teaspoon.
  if (trimmed === 'T' || trimmed === 'T.') return 'tbsp'
  const key = trimmed.toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ')
  return key in ALIASES ? ALIASES[key] : trimmed
}
