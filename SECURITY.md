# Security notes

What the app defends against, and the rules that keep it that way. If a
change breaks one of these, it needs a good reason.

## Untrusted inputs
- **AI import output.** Text in a photo can steer the model. Its reply passes
  through `sanitizeImportedRecipes` (electron/main/safety.mjs): known fields
  only, bounded strings, never `photo_path`.
- **Anything from the page (renderer).** Treated as untrusted by the main
  process: photo paths are re-checked on save and on display, the AI import
  reads only the file just chosen in the dialog, update locations are
  validated.
- **The update host.** `latest.yml` may only name a bare `.exe`; feeds must be
  https or a folder. Note the installer itself is unsigned, so the update
  channel is only as trustworthy as the Cloudflare account and the domain -
  keep 2FA on both.

## Window
- Served from `app://drinkcards/` (never `file://`), with a CSP header.
- `sandbox: true`, `contextIsolation: true`, no Node in the page; preload
  exposes only `window.api`.
- No navigation away from the app, no new windows, no `<webview>`, no
  permissions (camera, etc.). External links: https only.
- Photos load via `dc-photo://`, which serves only image files on a local
  drive letter - never UNC paths (NTLM hash leak).

## Package
Electron fuses (package.json `build.electronFuses`): no RunAsNode, no
NODE_OPTIONS, no --inspect, asar integrity enforced, file:// privileges off.

## Secrets
The Anthropic API key is encrypted with Windows DPAPI (`safeStorage`).

## Checking
`npm test` covers the validation rules. Before a release that touches any of
the above, also run the packaged app against the in-page attack probes
(see git history for the 1.1.2 security pass).
