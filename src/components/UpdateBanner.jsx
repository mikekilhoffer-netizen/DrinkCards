import { useEffect, useState } from 'react'

// Asks once, on launch, whether a newer version has been published, and says
// so quietly if one has. A failed check (offline, host down) shows nothing -
// Settings → Software updates has a button that does report errors.
//
// It never installs anything itself: the installer replaces the running
// program, so it needs the app closed and a person present.
export default function UpdateBanner() {
  const [update, setUpdate] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [opening, setOpening] = useState(false)
  const [opened, setOpened] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    window.api.updates
      .check()
      .then((res) => {
        if (!cancelled && res.ok && res.data.updateAvailable) setUpdate(res.data)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  if (!update || dismissed) return null

  const getInstaller = async () => {
    setOpening(true)
    setError(null)
    try {
      await window.api.updates.openDownload()
      setOpened(true)
    } catch (err) {
      setError(String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="update-banner" role="status">
      <span>
        Drink Cards {update.latestVersion} is available &mdash; you have {update.currentVersion}.
        {opened && ' Downloading in your browser — close Drink Cards before running the installer.'}
        {error && <span className="update-banner-error"> {error}</span>}
      </span>
      <span className="update-banner-actions">
        {!opened && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={opening || !update.downloadUrl}
            onClick={getInstaller}
          >
            {opening ? 'Opening…' : 'Get the update'}
          </button>
        )}
        {/* Session-only: the next launch asks again. */}
        <button type="button" className="update-banner-dismiss" onClick={() => setDismissed(true)}>
          Not now
        </button>
      </span>
    </div>
  )
}
