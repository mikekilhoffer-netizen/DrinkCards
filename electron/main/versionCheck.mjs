// Pure helpers for the update check - no Electron imports, so tests can load them.

// "1.10.0" is newer than "1.9.0", which a string compare gets backwards.
// Non-numeric segments count as 0, so a malformed remote version means
// "no update offered" rather than a crash.
export function isNewer(candidate, current) {
  const parse = (v) =>
    String(v)
      .trim()
      .replace(/^v/i, '')
      .split(/[.\-+]/)
      .map((part) => {
        const n = Number(part)
        return Number.isFinite(n) ? n : 0
      })
  const a = parse(candidate)
  const b = parse(current)
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (left !== right) return left > right
  }
  return false
}

// latest.yml is a few predictable top-level lines; reading them directly avoids
// a YAML dependency. If the shape ever changes this returns null, not a wrong answer.
export function parseManifest(text) {
  const field = (name) =>
    text.match(new RegExp(`^${name}:\\s*['"]?([^'"\\r\\n]+)['"]?\\s*$`, 'm'))?.[1]?.trim() ?? null
  const version = field('version')
  if (!version) return null
  const fileName =
    field('path') ??
    text.match(/^\s*-\s*url:\s*['"]?([^'"\r\n]+)['"]?\s*$/m)?.[1]?.trim() ??
    null
  return { version, fileName, releaseDate: field('releaseDate') }
}
