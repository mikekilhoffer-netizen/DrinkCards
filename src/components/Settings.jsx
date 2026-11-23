import { useState, useEffect } from 'react'

export default function Settings({ onClose, errorMessage }) {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [masked, setMasked] = useState(true)

  useEffect(() => {
    window.api.settings.getApiKey().then((key) => {
      if (key) setApiKey(key)
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    await window.api.settings.setApiKey(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>&#215;</button>
        </div>

        <form onSubmit={handleSave} className="settings-body">
          {errorMessage && (
            <div className="settings-error">{errorMessage}</div>
          )}

          <div className="settings-section">
            <h3>AI Recipe Import</h3>
            <p className="settings-help">
              Paste your Anthropic API key to enable &ldquo;Import from Photo&rdquo; &mdash; snap a photo
              of a paper recipe card and the app will read it automatically.
              Get a key at <strong>console.anthropic.com</strong>.
            </p>
            <label className="form-label">Anthropic API Key</label>
            <div className="api-key-row">
              <input
                type={masked ? 'password' : 'text'}
                className="input input-full"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                spellCheck={false}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMasked((m) => !m)}
              >
                {masked ? 'Show' : 'Hide'}
              </button>
            </div>
            <p className="settings-note">
              Your key is stored only on this computer and sent only to Anthropic when scanning a photo.
              Each recipe scan costs approximately $0.001&ndash;$0.003.
            </p>
          </div>

          <div className="settings-footer">
            <button type="submit" className="btn btn-primary">
              {saved ? 'Saved ✓' : 'Save Key'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
