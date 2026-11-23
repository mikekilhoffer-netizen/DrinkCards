# Changelog

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
