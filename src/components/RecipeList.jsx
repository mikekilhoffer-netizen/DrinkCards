import { photoSrc } from '../photo'
import { useState, useMemo } from 'react'

export default function RecipeList({ recipes, loading, onNew, onImport, onView, onEdit, onDelete, onSettings, onPrint, onAbout }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const categories = useMemo(() => {
    const cats = [...new Set(recipes.map((r) => r.category).filter(Boolean))].sort()
    return cats
  }, [recipes])

  const filtered = recipes.filter((r) => {
    if (categoryFilter !== 'all') {
      if (categoryFilter === '__none__' && r.category) return false
      if (categoryFilter !== '__none__' && r.category !== categoryFilter) return false
    }
    const q = search.toLowerCase()
    if (!q) return true
    if (r.name.toLowerCase().includes(q)) return true
    if (r.ingredients?.some((i) => i.name.toLowerCase().includes(q))) return true
    if (r.garnishes?.some((i) => i.name.toLowerCase().includes(q))) return true
    return false
  })

  // Group filtered recipes by category for display
  const grouped = useMemo(() => {
    const groups = {}
    for (const r of filtered) {
      const cat = r.category || ''
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(r)
    }
    return groups
  }, [filtered])

  const showGrouped = categoryFilter === 'all' && categories.length > 0 && !search

  return (
    <div className="list-view">
      <header className="list-header">
        <h1 className="list-title">Drink Recipe Book Creator</h1>
        <div className="list-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or ingredient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {categories.length > 0 && (
            <select
              className="input category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__none__">Uncategorized</option>
            </select>
          )}
          {import.meta.env.DEV && (
            <button className="btn btn-import" onClick={onImport}>
              &#128247; Import from Photo
            </button>
          )}
          <button className="btn btn-primary" onClick={onNew}>
            + New Recipe
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onPrint(categoryFilter !== 'all' ? categoryFilter : null)}
            title="Print recipes"
            disabled={recipes.length === 0}
          >
            &#128438; Print
          </button>
          <button className="btn btn-icon" onClick={onSettings} title="Settings">
            &#9881;
          </button>
          <button className="btn btn-secondary" onClick={onAbout} title="About">
            About
          </button>
        </div>
      </header>

      <div className="list-body">
        {loading ? (
          <p className="empty-state">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {search || categoryFilter !== 'all'
              ? 'No recipes match your filter.'
              : 'No recipes yet. Click \u201c+ New Recipe\u201d or \u201cImport from Photo\u201d to get started.'}
          </p>
        ) : showGrouped ? (
          // Grouped by category view
          Object.entries(grouped)
            .sort(([a], [b]) => (a || 'zzz').localeCompare(b || 'zzz'))
            .map(([cat, catRecipes]) => (
              <div key={cat || '__none__'} className="category-group">
                <div className="category-group-header">
                  {cat || 'Uncategorized'}
                  <button
                    className="btn-print-cat"
                    onClick={() => onPrint(cat || null)}
                    title={`Print ${cat || 'uncategorized'} recipes`}
                  >
                    &#128438;
                  </button>
                </div>
                <div className="recipe-grid">
                  {catRecipes.map((recipe) => (
                    <RecipeThumb
                      key={recipe.id}
                      recipe={recipe}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))
        ) : (
          // Flat grid view
          <div className="recipe-grid">
            {filtered.map((recipe) => (
              <RecipeThumb
                key={recipe.id}
                recipe={recipe}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecipeThumb({ recipe, onView, onEdit, onDelete }) {
  return (
    <div className="recipe-thumb" onClick={() => onView(recipe)}>
      <div className="thumb-photo">
        {recipe.photo_path
          ? <img src={photoSrc(recipe.photo_path)} alt={recipe.name} />
          : <div className="thumb-no-photo">No photo</div>
        }
      </div>
      <div className="thumb-info">
        <div className="thumb-name">{recipe.name}</div>
        {recipe.glass && <div className="thumb-glass">{recipe.glass}</div>}
      </div>
      <div className="thumb-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-secondary" onClick={() => onEdit(recipe)}>Edit</button>
        <button className="btn btn-danger" onClick={() => onDelete(recipe.id)}>Delete</button>
      </div>
    </div>
  )
}
