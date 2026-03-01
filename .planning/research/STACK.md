# Stack Research

**Domain:** Windows desktop weather application (dark/neon UI, auto-refresh, multi-location)
**Researched:** 2026-03-01
**Confidence:** MEDIUM-HIGH (core stack HIGH, API choices MEDIUM due to OWM credit card requirement pitfall)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Electron | 40.x (latest stable) | Desktop shell / platform | Mature, massive ecosystem, Chromium-based renderer means pixel-perfect CSS neon/glow UI with zero browser-compat issues. VS Code and Slack ship on it. Windows packaging is first-class with electron-builder. |
| React | 18.x | UI framework | Standard for Electron + web-tech UIs. Huge component ecosystem, hooks model maps cleanly to auto-refresh polling and reactive state. electron-vite ships react-ts template out of the box. |
| TypeScript | 5.x | Language | Type safety across IPC boundaries (main ↔ renderer) catches entire class of Electron-specific bugs at compile time, not runtime. |
| Vite (via electron-vite) | 5.x (electron-vite 5.0) | Build tooling | electron-vite 5.0 (released Dec 2025) is the de facto standard for modern Electron development. HMR in renderer, proper main/preload/renderer separation, isolatedEntries for multi-entry builds. Replaces webpack-based approaches entirely. |
| Tailwind CSS | 4.x | Styling | v4 eliminates config file entirely, uses CSS variables natively. Dark-first utility classes + arbitrary values (`shadow-[0_0_20px_#00f0ff]`) make neon glow effects trivial to compose without custom CSS files. |

### Weather API

**Recommended: Open-Meteo**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Open-Meteo | REST API (v1) | Weather data source | Completely free, no API key, no credit card, no registration. 10,000 calls/day limit (vs OWM's 1,000 with credit card on file). Returns hourly forecast for 7-48 hours. Non-commercial use is free. Eliminates the most significant onboarding friction and API key management overhead. |
| Open-Meteo Geocoding API | REST API (v1) | City name → coordinates | Companion geocoding endpoint. Accepts search term, returns lat/lon. Zip codes must be converted to city name or lat/lon first (see note below). |

**Zip code → coordinates:** Use the US Census Geocoder or a static zip-code-to-lat-lon lookup table (npm package `zipcodes` or `us-zips`) to convert zip codes to coordinates client-side. Open-Meteo then accepts those coordinates. This avoids requiring any external geocoding API key.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-store | 10.x | Persistent user settings | Storing saved zip codes, refresh interval, UI preferences. Requires Electron 30+. Saves to JSON in `app.getPath('userData')`. Use this for all user config. |
| TanStack Query (React Query) | v5 | Data fetching + auto-refresh | `refetchInterval` handles configurable polling intervals cleanly. Built-in caching prevents redundant API calls during rapid location switches. Stale-while-revalidate pattern makes the UI feel instant. |
| Zustand | 5.x | Client state management | Lightweight global state for active location, UI state (selected tab, settings panel open). Simpler than Redux for this app's scope. `@zubridge/electron` package available if main-process state sync is needed. |
| date-fns | 3.x | Date/time formatting | Formatting hourly forecast timestamps (e.g., "3 PM", "Tonight"). Lighter than dayjs for tree-shaking. |
| us-zips | latest | Zip code → lat/lon lookup | Static dataset of US zip codes with lat/lon. Zero API calls, instant resolution, works offline. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| electron-builder | Windows packaging / installer | Produces `.exe` NSIS installer and portable builds. Integrates with electron-vite. Configure `nsis` target for standard Windows installer. |
| ESLint + Prettier | Linting and formatting | electron-vite scaffolded templates include ESLint config. Add Prettier for consistent formatting. |
| Vitest | Unit testing | Vite-native test runner. Mocks Electron IPC for unit tests without spinning up full Electron runtime. |
| electron-devtools-installer | Chrome DevTools in Electron | Install React DevTools in the Electron renderer window during development. |

---

## Installation

```bash
# Scaffold with electron-vite (react-ts template)
npm create @quick-start/electron@latest weatherdeck -- --template react-ts
cd weatherdeck

# Core dependencies
npm install @tanstack/react-query zustand electron-store date-fns

# Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Utility: zip code resolution
npm install us-zips

# Dev dependencies
npm install -D electron-builder vitest @testing-library/react
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Electron | Tauri | If Rust expertise exists on team and bundle size/RAM are critical constraints. Tauri's ~5 MB bundle vs Electron's ~150 MB is compelling, but CSS rendering quirks from WebView2 on Windows can affect neon/glow effects. For a purely visual app like this, Chromium's rendering predictability in Electron is worth the tradeoff. |
| Electron | WinUI / WPF | If team has C#/.NET background and wants deep Windows OS integration. Overkill for a weather display app; Electron's web-tech stack is faster to develop and easier to style with dark/neon CSS. |
| Electron | .NET MAUI | If existing .NET codebase or targeting multiple form factors (desktop + mobile). MAUI's dark theme and custom styling are less mature than CSS-based approaches for neon aesthetics. |
| Open-Meteo | OpenWeatherMap | If needing "feels like" temperature, detailed weather condition codes (rain intensity), or One Call API for minutely precipitation. OWM One Call 3.0 has 1,000 free calls/day but **requires a credit card on file** — a user-hostile onboarding requirement. OWM is better if the project eventually needs more detailed data. |
| Open-Meteo | WeatherAPI.com | WeatherAPI.com has reduced free tier access (reports vary; some sources indicate the free plan was restricted). Unverified current state — avoid until confirmed. |
| TanStack Query | SWR | Both are valid. TanStack Query v5 has more granular `refetchInterval` control and better DevTools. SWR is simpler but less configurable for polling. |
| us-zips (local) | Google Maps Geocoding | Google requires API key and billing setup. Local lookup is instant and free. |
| Tailwind CSS | CSS Modules | Both work. Tailwind v4 arbitrary values (`shadow-[0_0_30px_rgba(0,240,255,0.7)]`) make one-off neon effects trivial without switching to a separate CSS file. CSS Modules are valid if team prefers explicit stylesheets. |
| Zustand | Redux Toolkit | Redux is overkill for this app's state surface area. Zustand stores saved locations and active location; no need for reducers, middleware, or Redux DevTools. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| OpenWeatherMap One Call API 3.0 (as primary) | Requires credit card on file even for free tier — creates unnecessary friction for a hobby/personal app. 1,000 calls/day limit is also tighter than Open-Meteo's 10,000. | Open-Meteo (no key, no card, 10k/day) |
| Electron v1.x–v29.x boilerplates | electron-store 10.x requires Electron 30+. Many older tutorials and GitHub templates target ancient Electron versions. Starting fresh with electron-vite 5.0 gets current versions. | `npm create @quick-start/electron@latest` |
| webpack-based electron config (electron-webpack, electron-forge webpack template) | Webpack is slow and the ecosystem is moving to Vite. electron-vite 5.0 is the modern standard. | electron-vite 5.0 |
| SQLite / full database | Overkill for storing a handful of zip codes and a settings object. Adds native addon compilation complexity on Windows. | electron-store (JSON file, zero native deps) |
| React Native for Windows | Different mental model, different styling primitives, separate ecosystem from web React. CSS neon effects require web-CSS knowledge — RNW abstracts that away into StyleSheet which is harder to achieve glow effects in. | Electron + React + Tailwind |
| Electron IPC without typed contracts | Untyped IPC messages between main/renderer cause silent bugs. | Use TypeScript interfaces shared between main and renderer for all IPC channels. |

---

## Stack Patterns by Variant

**If the app eventually needs system tray / widget mode (v2 scope):**
- Use Electron's `Tray` API + a separate `BrowserWindow` with `frame: false` and `transparent: true`
- Neon CSS effects render correctly in frameless transparent windows
- Keep main window and tray window as separate renderer entries in electron-vite's `isolatedEntries`

**If refresh interval is user-configurable (it is, per requirements):**
- Store interval in `electron-store` (persisted)
- Pass to TanStack Query's `refetchInterval` dynamically: `useQuery({ refetchInterval: userInterval })`
- Do not use `setInterval` directly — TanStack Query handles window focus/blur pausing automatically

**If multiple zip codes are saved:**
- Store as array in `electron-store`: `{ locations: [{ zip: '10001', name: 'New York, NY', lat: 40.75, lon: -73.99 }] }`
- Resolve zip → lat/lon once at save time using `us-zips`, store coordinates
- Active location index stored in Zustand (ephemeral, reset to 0 on launch)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| electron-store 10.x | Electron 30+ | ESM-only. Use `import` not `require`. |
| electron-vite 5.0 | Node.js 20.19+ or 22.12+, Vite 5.0+ | Requires modern Node. |
| TanStack Query v5 | React 18+ | v5 dropped React 16/17 support. |
| Tailwind CSS v4 | No `tailwind.config.js` | Config moved to CSS file via `@import "tailwindcss"`. Breaking change from v3. |
| @tanstack/react-query + Zustand | No known conflicts | Both work in renderer process; no IPC needed. |

---

## Sources

- [Electron Releases (GitHub)](https://github.com/electron/electron/releases/) — confirmed v40.6.1 as latest stable (Feb 2026)
- [electron-vite Getting Started](https://electron-vite.org/guide/) — confirmed v5.0.0, Node 20.19+ requirement
- [electron-vite 5.0 blog post](https://electron-vite.org/blog/) — confirmed Dec 2025 release, isolatedEntries feature
- [Tauri vs Electron comparison (DoltHub, Nov 2025)](https://www.dolthub.com/blog/2025-11-13-electron-vs-tauri/) — confirmed performance tradeoffs
- [Windows desktop framework comparison 2026 (Tibicle)](https://tibicle.com/blog/best-framework-for-desktop-application-in-2026) — ecosystem overview
- [Open-Meteo official docs](https://open-meteo.com/en/docs) — confirmed no API key, 10k/day limit, hourly forecast
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) — confirmed name-based lookup (not zip-code native)
- [OpenWeatherMap One Call API 3.0](https://openweathermap.org/api/one-call-3) — confirmed credit card required, 1,000 calls/day free tier
- [OpenWeatherMap transfer guide](https://openweathermap.org/one-call-transfer) — confirmed credit card requirement for free tier
- [electron-store GitHub](https://github.com/sindresorhus/electron-store) — confirmed Electron 30+ requirement, ESM-only
- [TanStack Query auto-refetching docs](https://tanstack.com/query/v5/docs/framework/react/examples/auto-refetching) — confirmed refetchInterval API
- [Zustand npm](https://www.npmjs.com/package/zustand) — state management recommendation
- [@zubridge/electron npm](https://www.npmjs.com/package/@zubridge/electron) — confirmed Electron IPC state bridge
- [Tailwind v4 dark mode](https://tailwindcss.com/docs/dark-mode) — confirmed config changes in v4

---

*Stack research for: WeatherDeck — Windows desktop weather app*
*Researched: 2026-03-01*
