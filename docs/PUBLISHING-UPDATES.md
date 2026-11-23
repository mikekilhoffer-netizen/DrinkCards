# Publishing an update

Every installed copy of Drink Cards checks one location on launch:

    https://updates.guestflowweather.com/drinkcards/

(`DEFAULT_UPDATE_FEED` in `electron/main/updates.js`, and `build.publish` in
`package.json` — keep the two the same.) Any machine can be pointed somewhere
else under Settings → Software Updates, including a shared folder
(`\\server\apps\drinkcards`), without a rebuild.

The host is the same Cloudflare R2 bucket ScanLedger uses (custom domain
`updates.guestflowweather.com`), just a different folder: `drinkcards/`.

---

## Every release

0. **Log in for this release only:** `npx wrangler login` (browser click).
   The login can write to the whole Cloudflare account, so it is not left on
   the machine between releases - see step 7.

1. **Bump `version` in `package.json`.** That number is what every installed
   copy compares itself against. Same version = nobody is offered the update.
2. **Add a line to `CHANGELOG.md`.**
3. **Build and stage:**

   ```
   npm run release
   ```

   Runs the tests, builds, packages the installer into `dist-desktop/`, then
   copies exactly what belongs on the host into `release/`. It refuses if
   `latest.yml` and `package.json` disagree on the version.
4. **Upload the contents of `release/`** (e.g. `npx wrangler r2 object put "scanledger-updates/drinkcards/<file>" --file "release/<file>" --remote`) into the bucket's `drinkcards/`
   folder, keeping file names exactly. **Installer and blockmap first,
   `latest.yml` last** — so no machine is told about an installer that isn't
   there yet. Overwrite the old `latest.yml`; older installers can stay.
5. **Check from the app**: Settings → Software Updates → *Check for updates*.
6. **Commit and push**, and tag it: `git tag v1.2.0 && git push --tags`.
7. **Log out:** `npx wrangler logout`.

---

## What a user's machine does

- On launch it fetches `latest.yml` (a few hundred bytes) and compares versions.
  Offline or host down → nothing is shown.
- If newer: a banner — *Get the update* opens the installer download.
- Running the installer replaces the app in place. Recipes, photos, the API key
  and settings live in `%APPDATA%\drinkcards\` and are never touched by
  install, update or uninstall.

## Handing the app to a new person

Send them the latest `Drink Cards-Setup-<version>.exe` (or the direct link in
the `drinkcards/` folder). It installs blank — no recipes, no API key. AI photo
import asks for their own Anthropic key in Settings.

## Notes

- **Unsigned builds**: SmartScreen warns on first run ("More info" → "Run
  anyway"). A code-signing certificate is the only real fix.
- **Rolling back**: re-upload an older `latest.yml`. Machines only offer
  *higher* versions, so anyone already on the newer build must reinstall by hand.
