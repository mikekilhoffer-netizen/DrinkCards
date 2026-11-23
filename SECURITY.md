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
- The page never holds the API key (only "has key" + last 4 characters).
- IPC handlers accept calls only from the app's own top frame.
- Changing the update location requires a native confirmation dialog.
- Downloads are blocked; printing always shows the print dialog.
- Packaged app: no DevTools, no menu; refuses debugging / sandbox-stripping
  command-line switches (see DANGEROUS_SWITCHES in safety.mjs).
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

## Outside the app
- The update host (R2 bucket, custom domain) refuses unauthenticated writes.
  Whoever holds the Cloudflare login can publish to every installed copy:
  that login is the most valuable thing to protect. Don't leave a long-lived
  wrangler login on the build machine; use 2FA on Cloudflare and GitHub.
- Installers are unsigned, so users can't tell a real one from a fake by
  looking. Code signing is the fix.

## Checking
`npm test` covers the validation rules. Before a release that touches any of
the above, also run the packaged app against the in-page attack probes
(see git history for the 1.1.2 and 1.1.3 security passes). To drive the
shipped code with a debug port, launch the dev Electron binary against the
built app.asar - the packaged exe refuses debug switches by design.
