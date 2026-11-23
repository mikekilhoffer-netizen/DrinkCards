import { photoSrc } from '../photo'
import { useState, useMemo } from 'react'

// A single recipe card block — will not split across pages
function PrintRecipeBlock({ recipe, showCategoryHeader }) {
  const { name, category, glass, method, photo_path, note, ingredients = [], garnishes = [] } = recipe
  return (
    <div className="print-recipe-block">
      {showCategoryHeader && category && (
        <div className="print-category-header">{category}</div>
      )}
      <div className="print-card">
        <div className="print-card-header">
          <span className="print-card-title">{name}</span>
        </div>
        <div className="print-card-body">
          <div className="print-card-left">
            <div className="print-card-photo">
              {photo_path
                ? <img src={photoSrc(photo_path)} alt={name} />
                : <div className="print-no-photo">No photo</div>
              }
            </div>
            <div className="print-card-meta">
              <div className="print-label">GLASS</div>
              <div className="print-value">{glass || '\u2014'}</div>
              <div className="print-label">METHOD</div>
              <div className="print-value">{method || '\u2014'}</div>
            </div>
          </div>
          <div className="print-card-divider" />
          <div className="print-card-right">
            {ingredients.length > 0 && (
              <div className="print-section">
                <div className="print-section-label">INGREDIENTS</div>
                {ingredients.map((item, i) => (
                  <div key={i} className="print-item-row">
                    <span className="print-amount">{item.amount}</span>
                    <span className="print-unit">{item.unit}</span>
                    <span className="print-name">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
            {garnishes.length > 0 && (
              <div className="print-section">
                <div className="print-section-label">GARNISHES</div>
                {garnishes.map((item, i) => (
                  <div key={i} className="print-item-row">
                    <span className="print-amount">{item.amount}</span>
                    <span className="print-unit">{item.unit}</span>
                    <span className="print-name">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
            {note && <div className="print-note">{note}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// Category divider — forces a page break before and after when printing
function CategoryDividerBlock({ category }) {
  return (
    <div className="print-divider-block">
      <div className="print-divider-content">
        <div className="print-divider-line" />
        <div className="print-divider-name">{category}</div>
        <div className="print-divider-line" />
      </div>
    </div>
  )
}

export default function PrintPreview({ recipes, initialCategory, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all')
  const [showCategoryHeader, setShowCategoryHeader] = useState(false)
  const [showDividers, setShowDividers] = useState(true)
  const [duplex, setDuplex] = useState(true)
  const [printing, setPrinting] = useState(false)

  const categories = useMemo(() => {
    return [...new Set(recipes.map((r) => r.category).filter(Boolean))].sort()
  }, [recipes])

  const items = useMemo(() => {
    const filtered =
      selectedCategory === '__none__' ? recipes.filter((r) => !r.category)
      : selectedCategory === 'all'    ? [...recipes]
      :                                  recipes.filter((r) => r.category === selectedCategory)

    filtered.sort((a, b) => {
      const ca = a.category || ''
      const cb = b.category || ''
      if (ca !== cb) return ca.localeCompare(cb)
      return a.name.localeCompare(b.name)
    })

    if (!showDividers || selectedCategory !== 'all') {
      return filtered.map((r) => ({ type: 'recipe', recipe: r }))
    }

    // Interleave category dividers between groups
    const result = []
    let lastCat = null
    for (const recipe of filtered) {
      const cat = recipe.category || ''
      if (cat !== lastCat) {
        if (cat) result.push({ type: 'divider', category: cat })
        lastCat = cat
      }
      result.push({ type: 'recipe', recipe })
    }
    return result
  }, [recipes, selectedCategory, showDividers])

  const recipeCount = items.filter((i) => i.type === 'recipe').length

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const result = await window.api.print.job({ duplex, silent: false })
      if (!result.success && result.errorType) {
        console.error('Print failed:', result.errorType)
      }
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="print-preview-view">

      {/* Toolbar — hidden when printing */}
      <div className="print-preview-toolbar no-print">
        <button className="btn btn-secondary" onClick={onClose}>&#8592; Back</button>
        <span className="print-preview-title">
          Print Preview &mdash; {recipeCount} recipe{recipeCount !== 1 ? 's' : ''}
        </span>

        <div className="print-preview-options">
          <select
            className="print-option-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__none__">Uncategorized</option>
          </select>

          <label className="print-option">
            <input type="checkbox" checked={showCategoryHeader} onChange={(e) => setShowCategoryHeader(e.target.checked)} />
            Category header on cards
          </label>

          {selectedCategory === 'all' && (
            <label className="print-option">
              <input type="checkbox" checked={showDividers} onChange={(e) => setShowDividers(e.target.checked)} />
              Category divider pages
            </label>
          )}

          <label className="print-option">
            <input type="checkbox" checked={duplex} onChange={(e) => setDuplex(e.target.checked)} />
            Double-sided (duplex)
          </label>
        </div>

        <button className="btn btn-primary" onClick={handlePrint} disabled={printing}>
          &#128438; {printing ? 'Printing…' : 'Print'}
        </button>
      </div>

      {/* Preview area */}
      <div className="print-pages-container">
        {recipeCount === 0 ? (
          <p style={{ color: '#bbb', marginTop: 40, fontSize: 15 }}>No recipes to print.</p>
        ) : (
          <div className="print-flow">
            {items.map((item, i) =>
              item.type === 'divider'
                ? <CategoryDividerBlock key={i} category={item.category} />
                : <PrintRecipeBlock key={i} recipe={item.recipe} showCategoryHeader={showCategoryHeader} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
