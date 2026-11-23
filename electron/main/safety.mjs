// Pure validation helpers for anything that crosses a trust boundary:
// paths from the renderer, data from the AI, URLs handed to the OS, and
// file names read from an update manifest. No Electron imports, so the
// test suite can exercise every rule directly.

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

// A photo must be an image file on a local drive letter: "C:\...\x.jpg".
// Rejected on purpose:
//   \\server\share\x.jpg, //server/x.jpg - opening a UNC path makes Windows
//       authenticate to that server, leaking the user's NTLM hash
//   \\?\ and \\.\ device paths
//   C:\a.txt:stream.jpg - alternate data streams (a ':' after the drive)
//   anything that isn't an image extension
export function isSafeLocalImagePath(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 1024) return false
  if (!/^[A-Za-z]:[\\/]/.test(p)) return false
  if (p.indexOf(':', 2) !== -1) return false
  if (/[\0\r\n]/.test(p)) return false
  const lower = p.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

// Only plain web links may be handed to the OS. file:, ms-msdt:, search-ms:,
// and other registered protocols have all been used to launch programs.
export function isAllowedExternalUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && !u.username && !u.password
  } catch {
    return false
  }
}

// Update locations: https, or a local/network folder. Plain http is refused
// because anyone on the network path could substitute the installer.
export function isAllowedFeed(feed) {
  if (typeof feed !== 'string') return false
  const f = feed.trim()
  if (f === '') return true // "don't check"
  if (/^https:\/\//i.test(f)) return isAllowedExternalUrl(f)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(f)) return false // http:, ftp:, file:, ...
  return /^[A-Za-z]:[\\/]/.test(f) || /^\\\\[^\\?.][^\\]*\\/.test(f)
}

// The installer name comes from latest.yml on the update host. It must be a
// bare file name (no folders, no "..") ending in .exe, so a tampered manifest
// can't point the "Get the update" button at some other file or script.
export function isSafeInstallerName(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 200) return false
  if (/[\\/:\0\r\n]/.test(name) || name.includes('..')) return false
  return /\.exe$/i.test(name)
}

// The AI's reply is untrusted: text in the photo can steer it. Keep only the
// fields a recipe has, as bounded strings - in particular never photo_path,
// which the form would otherwise load as an image.
const str = (v, max) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').slice(0, max)

function sanitizeItems(items, normalizeUnit) {
  if (!Array.isArray(items)) return []
  return items.slice(0, 50).map((i) => ({
    amount: str(i?.amount, 20),
    unit: normalizeUnit(str(i?.unit, 30)),
    name: str(i?.name, 200)
  }))
}

export function sanitizeImportedRecipes(parsed, normalizeUnit) {
  const list = Array.isArray(parsed) ? parsed : [parsed]
  return list
    .filter((r) => r && typeof r === 'object')
    .slice(0, 50)
    .map((r) => ({
      name: str(r.name, 200),
      glass: str(r.glass, 200),
      method: str(r.method, 500),
      note: str(r.note, 2000),
      ingredients: sanitizeItems(r.ingredients, normalizeUnit),
      garnishes: sanitizeItems(r.garnishes, normalizeUnit)
    }))
}
