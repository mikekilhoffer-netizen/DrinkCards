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

// A recipe arriving from the page over IPC. Same idea as the AI reply: only
// known fields, as bounded strings, so bad input can't half-write a recipe
// or put objects where the database expects text.
export function sanitizeRecipeInput(data, normalizeUnit) {
  const d = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  return {
    name: str(d.name, 200),
    category: str(d.category, 100),
    glass: str(d.glass, 200),
    method: str(d.method, 500),
    note: str(d.note, 2000),
    photo_path: isSafeLocalImagePath(d.photo_path) ? d.photo_path : '',
    ingredients: sanitizeItems(d.ingredients, normalizeUnit),
    garnishes: sanitizeItems(d.garnishes, normalizeUnit)
  }
}

// Command-line switches that open the app to remote control or strip its
// protections. Anything running as the user could add these to a shortcut;
// the packaged app refuses to start with them.
export const DANGEROUS_SWITCHES = [
  'remote-debugging-port', 'remote-debugging-pipe', 'remote-debugging-address', 'remote-allow-origins',
  'inspect', 'inspect-brk', 'inspect-port', 'inspect-publish-uid', 'debug', 'debug-brk',
  'no-sandbox', 'disable-web-security', 'disable-site-isolation-trials', 'allow-file-access-from-files',
  'allow-running-insecure-content', 'ignore-certificate-errors', 'js-flags', 'disable-features',
  'enable-features', 'proxy-server', 'proxy-pac-url', 'host-resolver-rules', 'host-rules',
  'load-extension', 'disable-gpu-sandbox', 'utility-and-browser', 'renderer-cmd-prefix',
  'gpu-launcher', 'utility-cmd-prefix', 'browser-subprocess-path'
]

// argv as Windows hands it over. Chromium on Windows accepts --x, -x and /x,
// in any case, with or without an = value.
export function findDangerousSwitch(argv) {
  for (const raw of argv.slice(1)) {
    const m = /^(?:--?|\/)([a-z0-9-]+)(=.*)?$/i.exec(String(raw))
    if (m && DANGEROUS_SWITCHES.includes(m[1].toLowerCase())) return m[1]
  }
  return null
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
