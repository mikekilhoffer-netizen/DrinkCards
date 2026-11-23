import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

let db = null
let dbPath = null

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    glass TEXT DEFAULT '',
    method TEXT DEFAULT '',
    photo_path TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    amount TEXT DEFAULT '',
    unit TEXT DEFAULT '',
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    type TEXT DEFAULT 'ingredient',
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );
`

const MIGRATIONS = [
  `ALTER TABLE recipes ADD COLUMN category TEXT DEFAULT ''`
]

export async function initDatabase() {
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs()
  dbPath = join(app.getPath('userData'), 'recipes.db')

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
    runMigrations()
  } else {
    db = new SQL.Database()
    db.run(SCHEMA)
    persist()
  }
}

function runMigrations() {
  for (const migration of MIGRATIONS) {
    try {
      db.run(migration)
      persist()
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

function persist() {
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

function query(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function run(sql, params = []) {
  db.run(sql, params)
}

function hydrateRecipe(recipe) {
  return {
    ...recipe,
    ingredients: query(
      `SELECT * FROM ingredients WHERE recipe_id = ? AND type = 'ingredient' ORDER BY sort_order ASC`,
      [recipe.id]
    ),
    garnishes: query(
      `SELECT * FROM ingredients WHERE recipe_id = ? AND type = 'garnish' ORDER BY sort_order ASC`,
      [recipe.id]
    )
  }
}

function saveItems(recipeId, items, type) {
  run(`DELETE FROM ingredients WHERE recipe_id = ? AND type = ?`, [recipeId, type])
  items.forEach((item, i) => {
    run(
      `INSERT INTO ingredients (recipe_id, amount, unit, name, sort_order, type) VALUES (?, ?, ?, ?, ?, ?)`,
      [recipeId, item.amount || '', item.unit || '', item.name || '', i, type]
    )
  })
}

export function getAllRecipes() {
  const recipes = query(`SELECT * FROM recipes ORDER BY category ASC, name ASC`)
  return recipes.map(hydrateRecipe)
}

export function getRecipeById(id) {
  const rows = query(`SELECT * FROM recipes WHERE id = ?`, [id])
  if (!rows.length) return null
  return hydrateRecipe(rows[0])
}

export function createRecipe(data) {
  const { name, category, glass, method, photo_path, note, ingredients = [], garnishes = [] } = data
  run(
    `INSERT INTO recipes (name, category, glass, method, photo_path, note) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, category || '', glass || '', method || '', photo_path || '', note || '']
  )
  const [{ id }] = query(`SELECT last_insert_rowid() as id`)
  saveItems(id, ingredients, 'ingredient')
  saveItems(id, garnishes, 'garnish')
  persist()
  return getRecipeById(id)
}

export function updateRecipe(id, data) {
  const { name, category, glass, method, photo_path, note, ingredients = [], garnishes = [] } = data
  run(
    `UPDATE recipes SET name=?, category=?, glass=?, method=?, photo_path=?, note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, category || '', glass || '', method || '', photo_path || '', note || '', id]
  )
  saveItems(id, ingredients, 'ingredient')
  saveItems(id, garnishes, 'garnish')
  persist()
  return getRecipeById(id)
}

export function deleteRecipe(id) {
  run(`DELETE FROM ingredients WHERE recipe_id = ?`, [id])
  run(`DELETE FROM recipes WHERE id = ?`, [id])
  persist()
  return { success: true }
}
