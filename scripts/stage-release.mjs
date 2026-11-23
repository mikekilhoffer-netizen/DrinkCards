// Collects exactly what the update location needs into release/, ready to
// upload. Run after `npm run dist` - it builds nothing itself, so it can't
// publish something different from what was just built.
//
//   Drink Cards-Setup-<version>.exe   the installer people run
//   Drink Cards-Setup-<version>.exe.blockmap   (harmless extra; enables
//                                     differential downloads if ever wired up)
//   latest.yml                        what every installed copy reads to
//                                     notice a new version - UPLOAD THIS LAST

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'))
const distDir = path.join(root, pkg.build.directories.output)
const outDir = path.join(root, 'release')

// Read the installer name from latest.yml rather than guessing it -
// electron-builder rewrites spaces in artifact names.
const manifestPath = path.join(distDir, 'latest.yml')
if (!fs.existsSync(manifestPath)) {
  console.error(`No latest.yml in ${distDir}. Run "npm run dist" first.`)
  process.exit(1)
}
const manifest = fs.readFileSync(manifestPath, 'utf-8')
const manifestVersion = manifest.match(/^version:\s*['"]?([^'"\r\n]+)/m)?.[1]?.trim()
const installer = manifest.match(/^path:\s*['"]?([^'"\r\n]+)/m)?.[1]?.trim()

// If these disagree, every machine is told to update and then handed the
// build it already has.
if (manifestVersion !== pkg.version) {
  console.error(`latest.yml says ${manifestVersion} but package.json says ${pkg.version}.`)
  console.error('Rebuild with "npm run dist" (and let it finish) before staging.')
  process.exit(1)
}
if (!installer || !fs.existsSync(path.join(distDir, installer))) {
  console.error(`latest.yml names "${installer}", which isn't in ${distDir}.`)
  process.exit(1)
}

// Start empty so a stale installer from an older version can't ride along.
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

for (const name of [installer, `${installer}.blockmap`, 'latest.yml']) {
  const from = path.join(distDir, name)
  if (!fs.existsSync(from)) continue
  fs.copyFileSync(from, path.join(outDir, name))
  console.log(`  ${name}  (${(fs.statSync(from).size / 1024 / 1024).toFixed(1)} MB)`)
}

console.log(`\nStaged Drink Cards ${pkg.version} in release/`)
console.log(`Upload to ${pkg.build.publish[0].url} - installer + blockmap first, latest.yml LAST.`)
