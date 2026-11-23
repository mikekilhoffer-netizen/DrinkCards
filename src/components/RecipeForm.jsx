import { useState } from 'react'

const UNITS = ['oz', 'ea.', 'dash', 'tsp', 'tbsp', 'ml', 'cl', 'barspoon', 'rinse', 'float', 'splash', 'drop', 'pinch']

const emptyItem = () => ({ amount: '', unit: 'oz', name: '' })

export default function RecipeForm({ recipe, isImported, importCurrent, importTotal, existingCategories = [], onSave, onSkip, onCancel }) {
  const [name, setName] = useState(recipe?.name || '')
  const [category, setCategory] = useState(recipe?.category || '')
  const [glass, setGlass] = useState(recipe?.glass || '')
  const [method, setMethod] = useState(recipe?.method || '')
  const [note, setNote] = useState(recipe?.note || '')
  const [photoPath, setPhotoPath] = useState(recipe?.photo_path || '')
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients?.length ? recipe.ingredients.map((i) => ({ ...i })) : [emptyItem()]
  )
  const [garnishes, setGarnishes] = useState(
    recipe?.garnishes?.length ? recipe.garnishes.map((i) => ({ ...i })) : [emptyItem()]
  )

  const updateItem = (list, setList, index, field, value) => {
    const updated = [...list]
    updated[index] = { ...updated[index], [field]: value }
    setList(updated)
  }

  const addItem = (setList) => (e) => {
    e.preventDefault()
    setList((prev) => [...prev, emptyItem()])
  }

  const removeItem = (list, setList, index) => (e) => {
    e.preventDefault()
    if (list.length === 1) return
    setList(list.filter((_, i) => i !== index))
  }

  const handlePhotoSelect = async (e) => {
    e.preventDefault()
    const path = await window.api.dialog.openPhoto()
    if (path) setPhotoPath(path)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return alert('Drink name is required.')
    onSave({
      name: name.trim(),
      glass: glass.trim(),
      category: category.trim(),
      method: method.trim(),
      note: note.trim(),
      photo_path: photoPath,
      ingredients: ingredients.filter((i) => i.name.trim()),
      garnishes: garnishes.filter((i) => i.name.trim())
    })
  }

  const renderItemSection = (list, setList, label, singular) => (
    <div className="form-section">
      <div className="form-section-label">{label}</div>
      <div className="items-list">
        {list.map((item, i) => (
          <div key={i} className="item-row">
            <input
              type="text"
              className="input input-amount"
              placeholder="Amt"
              value={item.amount}
              onChange={(e) => updateItem(list, setList, i, 'amount', e.target.value)}
            />
            <select
              className="input input-unit"
              value={item.unit}
              onChange={(e) => updateItem(list, setList, i, 'unit', e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="input input-name"
              placeholder={`${singular} name`}
              value={item.name}
              onChange={(e) => updateItem(list, setList, i, 'name', e.target.value)}
            />
            <button
              className="btn-remove"
              onClick={removeItem(list, setList, i)}
              title="Remove row"
              disabled={list.length === 1}
            >
              &#215;
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-add" onClick={addItem(setList)}>
        + Add {singular}
      </button>
    </div>
  )

  return (
    <div className="form-view">
      <div className="toolbar">
        <button className="btn btn-secondary" onClick={onCancel}>
          {importCurrent ? 'Cancel Import' : '\u2190 Cancel'}
        </button>
        <span className="toolbar-title">
          {importCurrent
            ? `Importing Recipe ${importCurrent} of ${importTotal}`
            : recipe ? 'Edit Recipe' : 'New Recipe'}
        </span>
        {importCurrent && (
          <div className="import-progress-dots">
            {Array.from({ length: importTotal }, (_, i) => (
              <span key={i} className={`import-dot${i < importCurrent ? ' import-dot-done' : i === importCurrent - 1 ? ' import-dot-active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      <form className="recipe-form" onSubmit={handleSubmit}>
        {isImported && (
          <div className="import-banner">
            {importCurrent && importTotal > 1
              ? <><strong>Recipe {importCurrent} of {importTotal} — AI auto-filled from your photo.</strong> Review, correct if needed, then save or skip.</>
              : <><strong>AI auto-filled this recipe from your photo.</strong> Review each field, make any corrections, then click Save.</>
            }
          </div>
        )}
        <div className="form-section">
          <label className="form-label">Drink Name *</label>
          <input
            type="text"
            className="input input-full"
            placeholder="e.g. Peach Smash"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-section">
          <label className="form-label">Category</label>
          <input
            type="text"
            className="input input-full"
            placeholder="e.g. Signature Drinks, Classics, Mocktails"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            {existingCategories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div className="form-row-2">
          <div className="form-section">
            <label className="form-label">Glass</label>
            <input
              type="text"
              className="input input-full"
              placeholder="e.g. 12 oz. Highball"
              value={glass}
              onChange={(e) => setGlass(e.target.value)}
            />
          </div>
          <div className="form-section">
            <label className="form-label">Method</label>
            <input
              type="text"
              className="input input-full"
              placeholder="e.g. Shake & strain"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>
        </div>

        {renderItemSection(ingredients, setIngredients, 'Ingredients', 'Ingredient')}
        {renderItemSection(garnishes, setGarnishes, 'Garnishes', 'Garnish')}

        <div className="form-section">
          <label className="form-label">Note (optional)</label>
          <input
            type="text"
            className="input input-full"
            placeholder="e.g. * Serve over large 2x2 square ice cube"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="form-section">
          <label className="form-label">Photo (optional)</label>
          <div className="photo-row">
            {photoPath && (
              <img src={`file://${photoPath}`} alt="Preview" className="photo-preview" />
            )}
            <div className="photo-buttons">
              <button className="btn btn-secondary" onClick={handlePhotoSelect}>
                {photoPath ? 'Change Photo' : 'Select Photo...'}
              </button>
              {photoPath && (
                <button
                  className="btn btn-danger"
                  onClick={(e) => {
                    e.preventDefault()
                    setPhotoPath('')
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary btn-large">
            {importCurrent && importCurrent < importTotal ? `Save & Next \u2192` : 'Save Recipe'}
          </button>
          {onSkip && (
            <button type="button" className="btn btn-secondary btn-large" onClick={onSkip}>
              Skip
            </button>
          )}
          {!importCurrent && (
            <button type="button" className="btn btn-secondary btn-large" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
