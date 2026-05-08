# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server with HMR (Chrome only)
npm run build          # Type-check + production build → dist/
npm run build:firefox  # Build Chrome first, then patch and package → time-master-firefox.zip
npm run test           # Run unit tests (Vitest)
npm run typecheck      # vue-tsc --noEmit only
```

Run a single test file: `npx vitest run src/lib/time.test.ts`

Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `dist/`  
Load in Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → `dist-firefox/manifest.json`

## Architecture

### Two entry points, one Vue app

`src/popup/` and `src/standalone/` each have an `index.html` + `main.ts` that mount the same `src/App.vue` with a `mode` prop (`'popup'` | `'standalone'`). The standalone window is opened via `chrome.runtime.sendMessage({ type: 'OPEN_STANDALONE' })` handled in `src/background/service-worker.ts`.

### Key invariants

**Time logic is pure and centralized.** All timestamp/format conversion lives in `src/lib/time.ts` as plain functions returning `ParseResult<T>`. Components never call Day.js directly — they call `formatTimestamp`, `parseToTimestamp`, `detectTsUnit` etc. Error values are keys (e.g. `'invalidTs'`) not localized strings; components translate them via `t('errors.invalidTs')`.

**Single shared timer.** `src/composables/useNow.ts` runs exactly one `setTimeout` chain across the entire app. All components that need the current time call `useNow()` and share the same `ref<number>`. Subscriber-counted: starts on first use, stops when last subscriber unmounts.

**Storage as reactive refs.** `src/composables/useStorage.ts` wraps `chrome.storage.sync` (and `.local` for `windowBounds`) in a module-level cache of `Ref`s. `useStoredValue('key')` returns a typed ref that auto-reads on init, auto-writes on change (debounced 80ms), and listens to `chrome.storage.onChanged` to stay in sync across popup ↔ standalone windows. A `suppressWrite` flag prevents write loops.

**Custom i18n (not vue-i18n).** MV3's CSP forbids `new Function()`, which vue-i18n uses. The app uses a 30-line custom implementation in `src/i18n/index.ts`: a module-level `locale` ref + `t(key, params?)` function. Components access it via `useT()` from `src/composables/useT.ts`. Locale files are `src/locales/en.json` and `src/locales/zh.json`.

### Firefox build

`scripts/build-firefox.mjs` post-processes the Chrome `dist/` into `dist-firefox/` by:
1. Replacing `background.service_worker` with `background.scripts` (Firefox < 121 event page compatibility)
2. Removing `minimum_chrome_version`
3. Injecting `browser_specific_settings.gecko` (id, strict_min_version: 140, data_collection_permissions)
4. Adding `gecko_android.strict_min_version: 142`
5. Packaging with `web-ext`

### CI / releases

`.github/workflows/build.yml` runs on every push to `main`. It builds both Chrome and Firefox zips, then runs `semantic-release` which analyzes commits and — if there are releasable changes — bumps `package.json` version, creates a GitHub Release with both zips attached, and commits the version bump back with `[skip ci]`.

Commit types: `feat:` → minor, `fix:` → patch, `BREAKING CHANGE` → major. `chore:`/`docs:` produce no release.

### Storage areas

- `chrome.storage.sync` — all user settings (`selectedTimezones`, `timeFormat`, `theme`, `tsUnit`, `defaultTimezone`, `defaultFormat`, `language`)
- `chrome.storage.local` — `windowBounds` (no cross-device sync needed) + standalone window ID (`standaloneWindowId`, cleared on window close)

### World clock card colors

Day/night card backgrounds are computed per-timezone by `isDaytime(ms, tz)` in `src/lib/time.ts`. Day = hours 6–17 (constants `DAY_START_HOUR`/`NIGHT_START_HOUR` in `src/lib/constants.ts`). White card = day, `#1c1c1e` = night.

### Adding a timezone alias (Chinese name)

Edit `TIMEZONE_CN_ALIASES` in `src/lib/constants.ts`. The array is `[primaryDisplayName, ...searchTerms]`; index 0 is shown on the card when locale is `zh`.
