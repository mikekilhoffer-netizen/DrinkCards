# Changelog

## 1.1.2 — 2026-11-23
Security hardening (no change to how the app looks or works):
- Electron 32 → 45: picks up two years of Chromium and Electron security fixes.
- Photo import can no longer be steered (by text in a photo) into setting a
  drink photo to a network path, which would have leaked the Windows login hash.
- Photos load only from local drives, only image files.
- The app is served from its own app:// origin instead of file://, so page
  script can't read files on disk. Window is sandboxed; only the app's own
  functions are exposed to it.
- Links open in the browser only if they are https. Dropped files and other
  navigation can no longer replace the app window.
- Photo import reads only the file chosen in the dialog.
- Updates: https or folder locations only; the installer named by the update
  file must be a plain .exe name.
- API key is encrypted with Windows DPAPI (existing keys converted automatically).
- Packaged app is locked down: can't be used as a Node runtime, ignores
  NODE_OPTIONS/--inspect, refuses to start if its files were modified.

## 1.1.1 — 2026-11-23
- Fixed: a unit the dropdown didn't list (e.g. "cups" from a photo) showed as "oz"
  but saved and printed as the original. Unknown units now show as
  "(not in list)" so what you see is what gets saved.
- Added units: cup, pt, qt, L, shot, top, part, and (none).
- Photo import maps spellings like "cups", "ounces", "Tbsp.", "z" onto the list.
- Existing recipes: recognized units are corrected on first launch (e.g. "z" → "oz", "squirt" → "splash");
  a backup of the database is saved first as recipes.before-unit-fix-<date>.db.

## 1.1.0 — 2026-11-22
- Checks for a newer version on launch and offers the installer in a banner.
- Settings → Software Updates: current version, manual check, and a
  configurable update location (URL or shared folder).
- About screen shows the real version number.

## 1.0.0
- First release: recipe cards, photo import with Claude (bring your own
  Anthropic API key), category print layouts.
