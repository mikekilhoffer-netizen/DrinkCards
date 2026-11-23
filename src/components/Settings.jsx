import { useState, useEffect } from 'react'

// Software updates: current version, a manual check that reports errors (the
// launch banner deliberately doesn't), and the update location, which can be
// pointed elsewhere (e.g. a shared folder) without a rebuild.
function UpdatesSection() {
  const [version, setVersion] = useState('')
  const [feed, setFeed] = useState('')
  const [defaultFeed, setDefaultFeed] = useState('')
  const [status, setStatus] = useState(null) // { kind: 'info'|'error'|'update', text, data? }
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.api.app.getVersion().then(setVersion)
    window.api.updates.getFeed().then(({ feed, defaultFeed }) => {
      setFeed(feed)
      setDefaultFeed(defaultFeed)
    })
  }, [])

  const check = async () => {
    setBusy(true)
    setStatus(null)
    try {
      await window.api.updates.setFeed(feed)
    } catch (err) {
      setBusy(false)
      // Cancelled or refused: show what's actually saved again.
      window.api.updates.getFeed().then(({ feed }) => setFeed(feed))
      const msg = String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
      return setStatus({ kind: 'error', text: msg })
    }
    const res = await window.api.updates.check()
    setBusy(false)
    if (!res.ok) return setStatus({ kind: 'error', text: res.error })
    if (res.data.updateAvailable) {
      setStatus({ kind: 'update', text: `Version ${res.data.latestVersion} is available.`, data: res.data })
    } else {
      setStatus({ kind: 'info', text: `You're up to date (latest published: ${res.data.latestVersion}).` })
    }
  }

  const download = async () => {
    try {
      await window.api.updates.openDownload()
      setStatus({ kind: 'info', text: 'Downloading in your browser — close Drink Cards before running the installer.' })
    } catch (err) {
      setStatus({ kind: 'error', text: String(err?.message ?? err) })
    }
  }

  const reset = async () => {
    await window.api.updates.resetFeed()
    setFeed(defaultFeed)
    setStatus(null)
  }

  return (
    <div className="settings-section">
      <h3>Software Updates</h3>
      <p className="settings-help">
        This is version <strong>{version}</strong>. Drink Cards checks for a newer version each time it starts.
      </p>
      <label className="form-label">Update location</label>
      <div className="api-key-row">
        <input
          type="text"
          className="input input-full"
          value={feed}
          onChange={(e) => setFeed(e.target.value)}
          spellCheck={false}
        />
        {feed !== defaultFeed && (
          <button type="button" className="btn btn-secondary" onClick={reset}>Default</button>
        )}
      </div>
      <div className="update-check-row">
        <button type="button" className="btn btn-secondary" onClick={check} disabled={busy}>
          {busy ? 'Checking…' : 'Check for updates'}
        </button>
        {status?.kind === 'update' && (
          <button type="button" className="btn btn-primary" onClick={download}>Get the update</button>
        )}
      </div>
      {status && (
        <p className={status.kind === 'error' ? 'settings-error' : 'settings-note'}>{status.text}</p>
      )}
    </div>
  )
}

export default function Settings({ onClose, errorMessage }) {
  // The saved key never comes back to this screen - only whether there is
  // one and its last four characters. Typing here replaces it.
  const [apiKey, setApiKey] = useState('')
  const [status, setKeyStatus] = useState({ hasKey: false, hint: '' })
  const [saved, setSaved] = useState(false)
  const [masked, setMasked] = useState(true)

  const refreshStatus = () => window.api.settings.getApiKeyStatus().then(setKeyStatus)
  useEffect(() => { refreshStatus() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!apiKey.trim()) return
    await window.api.settings.setApiKey(apiKey)
    setApiKey('')
    await refreshStatus()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleRemove = async () => {
    await window.api.settings.setApiKey('')
    setApiKey('')
    await refreshStatus()
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
            <p className="settings-note">
              {status.hasKey
                ? <>A key is saved (ending in <strong>&hellip;{status.hint}</strong>). Paste a new one below to replace it.</>
                : 'No key saved yet.'}
            </p>
            <div className="api-key-row">
              <input
                type={masked ? 'password' : 'text'}
                className="input input-full"
                placeholder={status.hasKey ? 'Paste a new key to replace the saved one' : 'sk-ant-...'}
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
              {status.hasKey && (
                <button type="button" className="btn btn-secondary" onClick={handleRemove}>
                  Remove
                </button>
              )}
            </div>
            <p className="settings-note">
              Your key is stored only on this computer and sent only to Anthropic when scanning a photo.
              Each recipe scan costs approximately $0.001&ndash;$0.003.
            </p>
          </div>

          <UpdatesSection />

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
