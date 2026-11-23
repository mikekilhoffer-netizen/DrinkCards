import { useState, useEffect, useMemo } from 'react'
import RecipeList from './components/RecipeList'
import RecipeForm from './components/RecipeForm'
import RecipeCard from './components/RecipeCard'
import Settings from './components/Settings'
import PrintPreview from './components/PrintPreview'
import About from './components/About'
import UpdateBanner from './components/UpdateBanner'

export default function App() {
  const [view, setView] = useState('list') // 'list'|'create'|'edit'|'detail'|'print'
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [printCategory, setPrintCategory] = useState(null) // null = all
  const [showAbout, setShowAbout] = useState(false)

  // Multi-recipe import queue
  const [importQueue, setImportQueue] = useState([])
  const [importIndex, setImportIndex] = useState(0)

  const loadRecipes = async () => {
    setLoading(true)
    const data = await window.api.recipe.getAll()
    setRecipes(data)
    setLoading(false)
  }

  useEffect(() => { loadRecipes() }, [])

  // Derive unique categories from loaded recipes
  const existingCategories = useMemo(
    () => [...new Set(recipes.map((r) => r.category).filter(Boolean))].sort(),
    [recipes]
  )

  // ── Normal CRUD ──────────────────────────────────────────────

  const handleView = (recipe) => { setSelected(recipe); setView('detail') }
  const handleCreate = () => { setSelected(null); setView('create') }
  const handleEdit = (recipe) => { setSelected(recipe); setView('edit') }

  const handleSave = async (data) => {
    if (selected && view === 'edit') {
      await window.api.recipe.update(selected.id, data)
    } else {
      await window.api.recipe.create(data)
    }
    await loadRecipes()
    setView('list')
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return
    await window.api.recipe.delete(id)
    await loadRecipes()
    setView('list')
  }

  const back = () => { setSelected(null); setView('list') }

  // ── AI import flow ───────────────────────────────────────────

  const handleImport = async () => {
    setImportError(null)
    const { hasKey } = await window.api.settings.getApiKeyStatus()
    if (!hasKey) {
      setShowSettings(true)
      setImportError('Please add your Anthropic API key in Settings first, then try Import again.')
      return
    }

    const imagePath = await window.api.dialog.openRecipePhoto()
    if (!imagePath) return

    setImporting(true)
    const result = await window.api.ai.importFromPhoto(imagePath)
    setImporting(false)

    if (!result.ok) {
      if (result.error === 'NO_API_KEY') {
        setShowSettings(true)
        setImportError('Please add your Anthropic API key in Settings.')
      } else if (result.error?.startsWith('IMAGE_TOO_LARGE:')) {
        alert(`That image is ${result.error.split(':')[1]} MB — the limit is 5 MB. Please use a smaller photo.`)
      } else {
        alert(`Could not read the recipe from that photo.\n\nError: ${result.error}\n\nYou can enter the recipe manually instead.`)
      }
      return
    }

    const queue = result.data
    if (!queue.length) { alert('No recipes were found in that photo. Try a clearer image.'); return }

    setImportQueue(queue)
    setImportIndex(0)
    setSelected(queue[0])
    setView('create')
  }

  const handleSaveImport = async (data) => {
    await window.api.recipe.create(data)
    advanceQueue(importIndex + 1)
  }

  const handleSkipImport = () => advanceQueue(importIndex + 1)

  const handleCancelImport = async () => {
    setImportQueue([]); setImportIndex(0)
    await loadRecipes(); setView('list')
  }

  const advanceQueue = async (nextIndex) => {
    if (nextIndex < importQueue.length) {
      setImportIndex(nextIndex)
      setSelected(importQueue[nextIndex])
    } else {
      setImportQueue([]); setImportIndex(0)
      await loadRecipes(); setView('list')
    }
  }

  const isInImportFlow = view === 'create' && importQueue.length > 0

  // ── Print ────────────────────────────────────────────────────

  const handlePrint = (category) => {
    setPrintCategory(category)
    setView('print')
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <>
      {view !== 'print' && <UpdateBanner />}

      {importing && (
        <div className="import-overlay">
          <div className="import-spinner">
            <div className="spinner" />
            <p>Reading recipes from photo&hellip;</p>
          </div>
        </div>
      )}

      {showSettings && (
        <Settings
          onClose={() => { setShowSettings(false); setImportError(null) }}
          errorMessage={importError}
        />
      )}

      {showAbout && <About onClose={() => setShowAbout(false)} />}

      {view === 'list' && (
        <RecipeList
          recipes={recipes}
          loading={loading}
          onNew={handleCreate}
          onImport={handleImport}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSettings={() => setShowSettings(true)}
          onAbout={() => setShowAbout(true)}
          onPrint={handlePrint}
        />
      )}

      {(view === 'create' || view === 'edit') && (
        <RecipeForm
          key={isInImportFlow ? `import-${importIndex}` : 'manual'}
          recipe={selected}
          isImported={view === 'create' && selected !== null}
          importCurrent={isInImportFlow ? importIndex + 1 : null}
          importTotal={isInImportFlow ? importQueue.length : null}
          existingCategories={existingCategories}
          onSave={isInImportFlow ? handleSaveImport : handleSave}
          onSkip={isInImportFlow ? handleSkipImport : null}
          onCancel={isInImportFlow ? handleCancelImport : back}
        />
      )}

      {view === 'detail' && selected && (
        <div className="detail-view">
          <div className="toolbar">
            <button className="btn btn-secondary" onClick={back}>&#8592; Back to list</button>
            <button className="btn btn-primary" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-secondary" onClick={() => handlePrint(selected.category || null)}>&#128438; Print</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
          <RecipeCard recipe={selected} />
        </div>
      )}

      {view === 'print' && (
        <PrintPreview
          recipes={recipes}
          initialCategory={printCategory}
          onClose={back}
        />
      )}
    </>
  )
}
