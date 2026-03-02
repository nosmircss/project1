# Phase 1: Foundation - Research

**Researched:** 2026-03-01
**Domain:** Electron desktop app — zip code geocoding, weather API integration, neon sci-fi UI
**Confidence:** HIGH (core stack), MEDIUM (Tailwind 4 + electron-vite integration, persistence layer)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Neon Design Language**
- Dual accent color scheme: cyan (#00f0ff) primary + magenta/purple secondary for contrast and visual hierarchy
- Bold glow intensity: strong neon glow on borders, icons, and headers — clearly sci-fi, not subtle
- Dark background with faint Tron-style grid overlay lines for depth and cyber aesthetic
- Mixed typography: clean sans-serif (e.g., Inter, Outfit) for body text, monospace/tech font (e.g., JetBrains Mono, Orbitron) for numbers and data values like temperature

**Weather Data Layout**
- Sidebar + main panel layout: location list on the left, weather details fill the right panel
- Temperature is the hero element: giant neon-glowing number, everything else is smaller around it
- Weather condition icons use neon outline style (line-art with glow effect), consistent with the overall neon theme
- Default window size is medium (~600x700) — comfortable viewing without dominating the desktop

**Zip Code Entry Flow**
- First launch shows a dedicated welcome screen: "Enter your zip code to get started" with a prominent input field
- After first launch, zip input lives in the sidebar — "+Add" button opens an inline input field
- Invalid zip shows inline error: red/orange glow on the input field with error text below
- Valid zip auto-navigates: immediately fetches weather and switches to the new location as active

**Error & Loading States**
- Loading uses skeleton + pulse pattern: neon-outlined placeholder shapes that pulse/glow while data is fetching, showing where content will appear
- API errors display as an inline error card: neon-bordered card in the main content area with error message + retry button
- Stale data handling: if a refresh fails but old data exists, keep displaying last successful data with a subtle "data may be outdated" warning indicator
- Auto-retry 2x silently on failure before showing error to user — transient failures are invisible

### Claude's Discretion
- Exact spacing, padding, and typography sizing within the neon theme
- Specific sans-serif and mono font choices (Inter/Outfit and JetBrains Mono/Orbitron are suggestions, not hard requirements)
- Grid overlay line opacity and spacing
- Exact skeleton placeholder shapes and pulse animation timing
- Welcome screen illustration/graphic design

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COND-01 | User can view current temperature and feels-like temperature for active location | Open-Meteo `current=temperature_2m,apparent_temperature`; zipcodes-us resolves lat/lon from zip |
| COND-02 | User can view sky conditions with a visual weather icon (sunny, cloudy, rain, snow, etc.) | Open-Meteo `weather_code` returns WMO code; Lucide React has full weather icon set; is_day enables day/night icon variants |
| LOC-01 | User can add a location by entering a US zip code | zipcodes-us package validates zip, returns city/state/lat/lon; inline error pattern for invalid zips |
| LOC-05 | App resolves zip code to city name and state (displays "Denver, CO" not "80202") | zipcodes-us returns `city` and `stateCode` fields directly — no API call needed |
| UI-01 | App uses a dark theme with neon cyan/blue glow accents (sci-fi aesthetic) | Tailwind CSS 4 @theme tokens for #00f0ff/magenta; box-shadow layering for neon glow; CSS custom properties for consistent theming |
| UI-02 | App displays in a standard resizable window with professional layout | Electron BrowserWindow `minWidth/minHeight`; sidebar + main panel flexbox layout |
| UI-03 | App shows loading states while fetching weather data | Tailwind `animate-pulse` skeleton with neon-outlined placeholder shapes |
| UI-04 | App shows error states for API failures or no internet connection | Inline error card component; auto-retry logic (2x) in the weather service before surfacing error |
</phase_requirements>

---

## Summary

Phase 1 is a classic greenfield Electron app using the electron-vite scaffold with React + TypeScript. The stack is well-understood and the tooling is mature. The main technical risks are: (1) Tailwind CSS 4's `@tailwindcss/vite` plugin integration with electron-vite's three-process build — this is documented as working but less battle-tested than Tailwind v3; and (2) data persistence via electron-store 10.x, which is ESM-only and requires explicit ESM configuration to work with electron-vite.

The geocoding strategy is entirely local: `zipcodes-us` (npm package, no API, no network call) maps a zip code to city, state abbreviation, and lat/lon coordinates. Those coordinates are then passed to Open-Meteo's free weather API (no key required, 10k calls/day). Open-Meteo returns `weather_code` (WMO standard), `temperature_2m`, and `apparent_temperature` — exactly what COND-01 and COND-02 need. The WMO code maps directly to a Lucide React icon and a human-readable description.

The neon UI design is implemented via Tailwind CSS 4's `@theme` CSS custom properties for design tokens plus layered `box-shadow` rules for the glow effects. Lucide React provides line-art SVG weather icons that accept CSS `filter: drop-shadow()` for the neon glow treatment. The IPC architecture follows Electron's recommended `contextBridge.exposeInMainWorld` pattern, with the weather fetch happening in the main process (Node.js) and results delivered to the renderer via `ipcMain.handle` / `ipcRenderer.invoke`.

**Primary recommendation:** Scaffold with `npm create @quick-start/electron@latest`, select React + TypeScript. Use `zipcodes-us` for local zip-to-lat/lon lookup. Call Open-Meteo directly. For persistence, use `electron-conf` (not `electron-store`) to sidestep ESM compatibility friction. Apply Tailwind CSS 4 via `@tailwindcss/vite` plugin; if integration proves problematic, fall back to Tailwind v3 PostCSS.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron | 40.x (latest stable) | Desktop app shell | Latest stable; Electron 38, 39, 40 are the three supported releases as of March 2026 |
| electron-vite | 5.0.0 | Dev/build tooling for Electron | Official electron-vite tool; scaffolds main/preload/renderer correctly; v5 is current |
| react | 18.x | UI framework | Paired with electron-vite's React template; ecosystem maturity |
| typescript | 5.x | Type safety | Included in electron-vite React template |
| tailwindcss | 4.x | Utility CSS | v4 has `@tailwindcss/vite` plugin for zero-config Vite integration; no tailwind.config.js needed |
| @tailwindcss/vite | 4.x | Tailwind v4 Vite plugin | Replaces PostCSS approach; single `@import "tailwindcss"` in CSS |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zipcodes-us | latest (~1.x) | Zip → city/state/lat/lon lookup | Local, no-API geocoding; returns TypeScript-typed `ZipLookupResult` |
| lucide-react | 0.575.x | Weather + UI icons | Line-art SVG components; tree-shaken; full weather icon set; accepts CSS filter for glow |
| electron-conf | latest | App data persistence | CJS + ESM compatible; avoids electron-store 10.x ESM-only friction |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| zipcodes-us | Open-Meteo Geocoding API | Open-Meteo geocoding does accept postal codes but returns a result array requiring selection logic; local package is instant and offline |
| zipcodes-us | us-zips | us-zips returns lat/lon but NOT city/state names — wrong tool for LOC-05 |
| electron-conf | electron-store 10.x | electron-store is ESM-only; requires `"type": "module"` in package.json and exact tsconfig alignment; known friction with electron-vite |
| lucide-react | Custom SVG icons | Custom icons require design work and maintain/version separately; Lucide covers all needed weather states |
| @tailwindcss/vite | tailwindcss + postcss (v3 path) | v3 PostCSS is more battle-tested with electron-vite but requires tailwind.config.js content paths setup |

**Installation:**
```bash
# Scaffold (interactive)
npm create @quick-start/electron@latest weatherdeck -- --template react-ts

# After scaffold
npm install zipcodes-us lucide-react electron-conf
npm install -D tailwindcss @tailwindcss/vite
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main/
│   ├── index.ts          # Electron main process — BrowserWindow, IPC handlers
│   └── weather.ts        # Weather fetch service (runs in Node.js context)
├── preload/
│   └── index.ts          # contextBridge — exposes typed IPC API to renderer
├── renderer/
│   └── src/
│       ├── App.tsx        # Root layout: sidebar + main panel
│       ├── components/
│       │   ├── WelcomeScreen.tsx     # First-launch zip entry
│       │   ├── Sidebar.tsx           # Location list + add button
│       │   ├── WeatherPanel.tsx      # Main weather display
│       │   ├── TemperatureHero.tsx   # Giant glowing temperature
│       │   ├── WeatherIcon.tsx       # Lucide icon + neon glow filter
│       │   ├── SkeletonLoader.tsx    # Pulsing neon placeholders
│       │   └── ErrorCard.tsx         # Inline API error display
│       ├── hooks/
│       │   └── useWeather.ts         # Fetch + retry logic, state management
│       ├── lib/
│       │   ├── zipLookup.ts          # zipcodes-us wrapper, validation
│       │   ├── weatherCodeMap.ts     # WMO code → icon + label mapping
│       │   └── openMeteo.ts          # Open-Meteo API client
│       └── styles/
│           └── main.css              # @import "tailwindcss"; + @theme tokens + neon utilities
electron.vite.config.ts               # Vite config for all three processes
```

### Pattern 1: Electron IPC — Renderer to Main (Two-Way)

**What:** Renderer calls `window.electronAPI.fetchWeather(lat, lon)`, which crosses to the main process via IPC, executes the HTTP fetch in Node.js, and returns the result as a Promise.

**When to use:** Any time the renderer needs data that involves Node.js APIs (network fetch can also be done in renderer, but keeping it in main provides a clean separation and easier error handling).

**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/ipc

// src/main/index.ts
import { ipcMain } from 'electron'
import { fetchWeather } from './weather'

ipcMain.handle('weather:fetch', async (_event, lat: number, lon: number) => {
  return fetchWeather(lat, lon) // returns WeatherData or throws
})

// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron/renderer'

contextBridge.exposeInMainWorld('electronAPI', {
  fetchWeather: (lat: number, lon: number) =>
    ipcRenderer.invoke('weather:fetch', lat, lon)
})

// src/renderer/src/env.d.ts (type augmentation)
interface Window {
  electronAPI: {
    fetchWeather: (lat: number, lon: number) => Promise<WeatherData>
  }
}
```

### Pattern 2: Open-Meteo Fetch (Node.js main process)

**What:** HTTP GET to Open-Meteo with lat/lon and specific `current` fields. No API key. Parse JSON, map weather_code to label.

**When to use:** Every weather fetch call from the renderer.

**Example:**
```typescript
// Source: https://open-meteo.com/en/docs

// src/main/weather.ts
const BASE = 'https://api.open-meteo.com/v1/forecast'

export async function fetchWeather(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'is_day'
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto'
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)
  const json = await res.json()
  return json.current // { temperature_2m, apparent_temperature, weather_code, is_day }
}
```

### Pattern 3: Local Zip Code Resolution

**What:** `zipcodes-us` lookup — synchronous, in-memory, no network call. Returns city, stateCode, latitude, longitude.

**When to use:** When user submits a zip code from the input field.

**Example:**
```typescript
// Source: https://github.com/ikarthikng/zipcodes-us

// src/renderer/src/lib/zipLookup.ts
import { lookupZip } from 'zipcodes-us'

export interface LocationInfo {
  city: string
  stateCode: string    // e.g. "CO"
  lat: number
  lon: number
  displayName: string  // e.g. "Denver, CO"
}

export function resolveZip(zip: string): LocationInfo | null {
  const result = lookupZip(zip)
  if (!result || !result.isValid) return null
  return {
    city: result.city,
    stateCode: result.stateCode,
    lat: result.latitude,
    lon: result.longitude,
    displayName: `${result.city}, ${result.stateCode}`
  }
}
```

**Note:** Confirm the exact import and method name from `zipcodes-us` README at install time — the exact API surface (e.g., `lookupZip` vs default export) should be verified against the installed version.

### Pattern 4: Tailwind v4 Neon Theme Tokens

**What:** Define neon design tokens in CSS `@theme` block — no tailwind.config.js required. Glow effects via layered `box-shadow` custom utilities.

**When to use:** Global stylesheet; all neon colors and glow utilities derive from these tokens.

**Example:**
```css
/* Source: https://tailwindcss.com/blog/tailwindcss-v4 */
/* src/renderer/src/styles/main.css */

@import "tailwindcss";

@theme {
  --color-neon-cyan: #00f0ff;
  --color-neon-magenta: #ff00e5;
  --color-bg-dark: #0a0a12;
  --color-bg-panel: #0f0f1e;
  --color-bg-sidebar: #080812;
  --color-error: #ff4444;
}

/* Neon glow utilities — referenced as class="neon-glow-cyan" */
@utility neon-glow-cyan {
  box-shadow:
    0 0 4px #00f0ff,
    0 0 12px #00f0ff80,
    0 0 24px #00f0ff40;
}

@utility neon-glow-magenta {
  box-shadow:
    0 0 4px #ff00e5,
    0 0 12px #ff00e580,
    0 0 24px #ff00e540;
}

@utility neon-text-glow-cyan {
  text-shadow:
    0 0 8px #00f0ff,
    0 0 20px #00f0ff80;
}

/* Grid overlay for Tron aesthetic */
@utility cyber-grid {
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### Pattern 5: WMO Code → Icon Mapping

**What:** A static map from Open-Meteo's numeric `weather_code` to a Lucide icon component and human label, with day/night variants using `is_day`.

**When to use:** When rendering the weather icon and condition label.

**Example:**
```typescript
// src/renderer/src/lib/weatherCodeMap.ts
// WMO code reference: https://gist.github.com/stellasphere/9490c195ed2b53c707087c8c2db4ec0c

import {
  Sun, Moon, Cloud, CloudSun, CloudMoon,
  CloudRain, CloudSnow, CloudDrizzle,
  CloudLightning, CloudFog, Snowflake, CloudHail
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface WeatherDisplay {
  Icon: LucideIcon
  label: string
}

export function getWeatherDisplay(code: number, isDay: boolean): WeatherDisplay {
  // code 0: Clear sky
  if (code === 0)  return { Icon: isDay ? Sun : Moon, label: isDay ? 'Clear' : 'Clear' }
  // 1-2: Mainly clear / partly cloudy
  if (code <= 2)   return { Icon: isDay ? CloudSun : CloudMoon, label: 'Partly Cloudy' }
  // 3: Overcast
  if (code === 3)  return { Icon: Cloud, label: 'Overcast' }
  // 45, 48: Fog
  if (code <= 48)  return { Icon: CloudFog, label: 'Foggy' }
  // 51-57: Drizzle
  if (code <= 57)  return { Icon: CloudDrizzle, label: 'Drizzle' }
  // 61-67: Rain
  if (code <= 67)  return { Icon: CloudRain, label: 'Rain' }
  // 71-77: Snow
  if (code <= 77)  return { Icon: CloudSnow, label: 'Snow' }
  // 80-82: Showers
  if (code <= 82)  return { Icon: CloudRain, label: 'Showers' }
  // 85-86: Snow showers
  if (code <= 86)  return { Icon: CloudSnow, label: 'Snow Showers' }
  // 95-99: Thunderstorm
  return { Icon: CloudLightning, label: 'Thunderstorm' }
}
```

### Pattern 6: Neon Icon with Glow (Lucide + CSS filter)

**What:** Lucide icons accept all SVG props. `filter: drop-shadow()` applies glow to the icon paths (respects alpha channel unlike `box-shadow` on a wrapper div).

**Example:**
```tsx
// src/renderer/src/components/WeatherIcon.tsx
import type { LucideIcon } from 'lucide-react'

interface WeatherIconProps {
  Icon: LucideIcon
  size?: number
  color?: string
  glowColor?: string
}

export function WeatherIcon({
  Icon,
  size = 64,
  color = '#00f0ff',
  glowColor = '#00f0ff'
}: WeatherIconProps) {
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={1.5}
      style={{
        filter: `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 16px ${glowColor}80)`
      }}
    />
  )
}
```

### Pattern 7: Skeleton Loading with Neon Pulse

**What:** Tailwind's `animate-pulse` on placeholder divs styled with neon border/background to match the content they stand in for.

**Example:**
```tsx
// src/renderer/src/components/SkeletonLoader.tsx
export function WeatherSkeleton() {
  return (
    <div className="animate-pulse flex flex-col items-center gap-6 p-8">
      {/* Icon placeholder */}
      <div className="w-16 h-16 rounded-full border border-neon-cyan/30 bg-neon-cyan/5" />
      {/* Temperature hero placeholder */}
      <div className="w-48 h-20 rounded border border-neon-cyan/30 bg-neon-cyan/5" />
      {/* Feels-like placeholder */}
      <div className="w-32 h-6 rounded border border-neon-cyan/20 bg-neon-cyan/5" />
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Exposing full `ipcRenderer` via contextBridge:** Security footgun — the entire ipcRenderer module becomes an empty object on the renderer side anyway. Expose only specific named methods.
- **Fetching weather in the renderer process:** Works, but coupling the HTTP client to the renderer makes it harder to add caching, rate limiting, and retry logic in later phases. Keep fetch in main.
- **Using `us-zips` for LOC-05:** `us-zips` returns lat/lon but NOT city or state names — it would leave you with coordinates only, requiring a separate reverse geocoding call to get the display name. Use `zipcodes-us` instead.
- **Inline style overuse for glow effects:** Define glow as Tailwind `@utility` classes so they're reusable and consistent across components.
- **`electron-store` 10.x without careful ESM setup:** The package requires `"type": "module"` in package.json and specific tsconfig settings — it has known friction with electron-vite. Use `electron-conf` unless you're confident in the ESM configuration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zip → city/state/coordinates | Custom CSV lookup or API call | `zipcodes-us` | Pre-built, typed, instant, offline; handles edge cases like missing ZCTAs |
| WMO code → description | Hardcoded string switch | Use the research table below + static map | Already a known standard; gaps in code ranges (4-44, etc.) need handling |
| Icon components | Custom SVG files | `lucide-react` | Tree-shaken, typed, consistent stroke width, accepts all SVG props |
| CSS animation for skeleton | Custom keyframe | Tailwind `animate-pulse` | Already defined, tested, consistent |
| Neon glow on icons | Box-shadow on wrapper div | `filter: drop-shadow()` | Box-shadow applies to the bounding box rectangle, not icon paths; drop-shadow respects alpha |
| App data persistence | `fs.writeFile` + JSON.parse | `electron-conf` | Handles file paths, atomic writes, schema validation, and secure storage location |

**Key insight:** The geocoding chain is "user types zip → zipcodes-us resolves city/state/lat/lon locally → lat/lon sent to Open-Meteo" — no geocoding API key, no rate limits, no network latency for the resolution step.

---

## Common Pitfalls

### Pitfall 1: Tailwind CSS 4 + electron-vite renderer config

**What goes wrong:** The `@tailwindcss/vite` plugin must be added to the **renderer** Vite config in `electron.vite.config.ts`, not to the root config. If added at the top level, it may apply to main/preload processes where it causes build errors.

**Why it happens:** electron-vite uses separate Vite configs per process (main, preload, renderer) under a single config file. Plugins in the `renderer` key only apply to the renderer build.

**How to avoid:**
```typescript
// electron.vite.config.ts
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: { /* no tailwindcss here */ },
  preload: { /* no tailwindcss here */ },
  renderer: {
    plugins: [react(), tailwindcss()]  // tailwindcss ONLY in renderer
  }
})
```

**Warning signs:** Build errors mentioning CSS in main/preload; `@import "tailwindcss"` not being processed.

### Pitfall 2: electron-store 10.x ESM Compatibility

**What goes wrong:** After installing `electron-store`, builds fail with `[ERR_REQUIRE_ESM]` because electron-store 10.x is pure ESM.

**Why it happens:** electron-vite's default output is CJS for the main process. electron-store 10.x has no CJS export.

**How to avoid:** Use `electron-conf` instead — it ships CJS + ESM and was created by the electron-vite maintainer specifically for this use case:
```bash
npm install electron-conf
```
```typescript
// src/main/index.ts
import { Conf } from 'electron-conf/main'
const conf = new Conf({ projectName: 'weatherdeck' })
```

**Warning signs:** `Error [ERR_REQUIRE_ESM]: require() of ES Module` in terminal during dev or build.

### Pitfall 3: Neon glow on SVG icons using box-shadow

**What goes wrong:** Applying `box-shadow` to a `<div>` wrapping an SVG icon glows the rectangular bounding box, not the icon shape itself — the result looks like a glowing rectangle, not a glowing icon.

**Why it happens:** `box-shadow` operates on the CSS box model, not SVG paths.

**How to avoid:** Use `filter: drop-shadow()` directly on the Lucide icon component via the `style` prop (see Pattern 6 above).

**Warning signs:** Glow appears square instead of following the icon outline.

### Pitfall 4: WMO Code Gaps

**What goes wrong:** Open-Meteo can return weather codes in ranges that aren't contiguous — codes 4-44, 58-60, 68-70, 78-79, 83-84, and 87-94 are not used by Open-Meteo but exist in WMO spec. A strict equality map will miss codes if future API versions return edge-case values.

**Why it happens:** Open-Meteo uses a subset of WMO codes. The mapping should use range comparisons (`<= 57`) not equality checks (`=== 51 || === 53 || === 55`).

**How to avoid:** Use the range-based map shown in Pattern 5. Add a fallback: `return { Icon: Cloud, label: 'Unknown' }`.

**Warning signs:** Weather icon shows nothing / crashes on unexpected code values.

### Pitfall 5: zipcodes-us in Main vs Renderer Process

**What goes wrong:** `zipcodes-us` bundles a static dataset. If loaded in both main and renderer processes, it doubles memory usage unnecessarily.

**Why it happens:** The package loads the full US zip code dataset into memory when imported.

**How to avoid:** Load `zipcodes-us` only in the renderer process (it detects browser vs Node.js environment). The renderer calls `resolveZip()` locally before sending lat/lon to main via IPC for the weather fetch.

**Warning signs:** High memory usage; zip lookup duplicated in main/renderer.

### Pitfall 6: Open-Meteo `timezone: auto` required for US locations

**What goes wrong:** Without `timezone: auto`, Open-Meteo returns times in UTC, which makes the `is_day` field unreliable (it would be computed for UTC midnight, not the user's local time).

**Why it happens:** Open-Meteo defaults to UTC if no timezone is specified.

**How to avoid:** Always include `timezone=auto` in the API call — Open-Meteo will infer the correct timezone from the coordinates.

---

## Code Examples

### Complete Open-Meteo API Response Structure

```typescript
// Source: https://open-meteo.com/en/docs
// Response shape for current weather fields

interface OpenMeteoCurrentResponse {
  current: {
    time: string              // ISO 8601
    temperature_2m: number    // °F when temperature_unit=fahrenheit
    apparent_temperature: number  // feels-like, same unit
    weather_code: number      // WMO code (0-99)
    is_day: number            // 1 = day, 0 = night
  }
  current_units: {
    temperature_2m: string    // "°F"
    apparent_temperature: string
    weather_code: string      // "wmo code"
    is_day: string
  }
}
```

### Electron Window Creation with Default Size

```typescript
// Source: https://www.electronjs.org/docs/latest/api/browser-window
// src/main/index.ts

const win = new BrowserWindow({
  width: 600,
  height: 700,
  minWidth: 500,
  minHeight: 600,
  resizable: true,
  backgroundColor: '#0a0a12',  // Dark bg before renderer loads (prevents white flash)
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,    // Required for contextBridge
    nodeIntegration: false     // Security best practice
  }
})
```

### Retry Logic Pattern (2x silent, then surface error)

```typescript
// src/renderer/src/hooks/useWeather.ts
async function fetchWithRetry(
  lat: number,
  lon: number,
  maxRetries = 2
): Promise<WeatherData> {
  let lastError: Error
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await window.electronAPI.fetchWeather(lat, lon)
    } catch (err) {
      lastError = err as Error
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))) // backoff
      }
    }
  }
  throw lastError!
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + PostCSS | `@tailwindcss/vite` plugin + CSS `@theme` | Tailwind v4 (Jan 2025) | No config file; auto content detection; all design tokens as CSS variables |
| `@tailwind base/components/utilities` directives | Single `@import "tailwindcss"` | Tailwind v4 (Jan 2025) | Simpler CSS entry point |
| `electron-store` for persistence | `electron-conf` (electron-vite ecosystem) | electron-store v10 went ESM-only | Avoids ESM-only friction in CJS electron-vite builds |
| `ipcRenderer.send` + `ipcMain.on` | `ipcRenderer.invoke` + `ipcMain.handle` | Electron 7+ | Returns a Promise automatically; cleaner async |
| `require('electron')` in preload | `import { contextBridge } from 'electron/renderer'` | Context isolation default (Electron 12+) | Security improvement; contextBridge is the only safe bridge |

**Deprecated/outdated:**
- `nodeIntegration: true`: Never use — allows renderer full Node.js access, major XSS risk
- `remote` module: Removed in Electron 14+ (use IPC instead)
- `electron-store` < 9.x: Pre-ESM versions are stale; use electron-conf for new projects
- Tailwind v3 `purge` config option: Replaced by auto content detection in v4

---

## Open Questions

1. **`zipcodes-us` exact API surface**
   - What we know: Package returns `{ city, stateCode, latitude, longitude, isValid }` per research
   - What's unclear: Exact import style (`import { lookupZip }` vs default export) — confirmed from GitHub README summary but not hands-on verified
   - Recommendation: Read the installed package's README immediately in Wave 0's setup task before coding the lookup

2. **Tailwind CSS 4 + electron-vite renderer-only plugin behavior**
   - What we know: `@tailwindcss/vite` is documented to work with Vite; electron-vite uses Vite under the hood for renderer
   - What's unclear: Whether electron-vite 5.x's renderer config correctly isolates the Tailwind plugin from main/preload builds without any workaround
   - Recommendation: Treat as MEDIUM risk; the fallback (Tailwind v3 PostCSS setup) is well-documented and should be adopted if first integration attempt takes more than 30 minutes

3. **Google Fonts in Electron**
   - What we know: Electron's renderer is a Chromium browser; Google Fonts CDN `<link>` works if network is available
   - What's unclear: Whether to load fonts via CDN (requires network) or bundle them locally (guarantees display but adds package size)
   - Recommendation: Use Google Fonts CDN for Phase 1; bundle locally in a later phase if offline support becomes a requirement

4. **Open-Meteo rate limits for development**
   - What we know: 10,000 calls/day free, no API key required
   - What's unclear: Whether repeated rapid calls during development (hot-reload triggers re-fetches) will approach limits
   - Recommendation: Add a `localhost` / dev-mode throttle guard — only fetch on explicit user action in dev, not on every re-render

---

## Sources

### Primary (HIGH confidence)
- `https://open-meteo.com/en/docs` — Current weather API endpoint, fields, URL structure
- `https://open-meteo.com/en/docs/geocoding-api` — Geocoding API parameters and response shape
- `https://www.electronjs.org/docs/latest/tutorial/ipc` — IPC handle/invoke pattern with TypeScript examples
- `https://www.electronjs.org/docs/latest/tutorial/context-isolation` — contextBridge security model
- `https://tailwindcss.com/blog/tailwindcss-v4` — v4 setup changes, @theme, @tailwindcss/vite plugin
- `https://gist.github.com/stellasphere/9490c195ed2b53c707087c8c2db4ec0c` — Complete WMO weather code table with day/night labels
- `https://electron-vite.org/guide/` — Scaffold command, project structure, version requirements

### Secondary (MEDIUM confidence)
- `https://github.com/alex8088/electron-vite/discussions/542` — electron-store ESM issue + electron-conf recommendation (community discussion, verified by repo maintainer context)
- `https://github.com/ikarthikng/zipcodes-us` — zipcodes-us field list (city, stateCode, latitude, longitude, isValid) — from WebSearch, not directly fetched
- `https://lucide.dev/icons` — Weather icon inventory (verified via WebFetch)
- `https://blog.mohitnagaraj.in/blog/202505/Electron_Shadcn_Guide` — electron-vite + Tailwind v4 integration confirmation

### Tertiary (LOW confidence)
- General WebSearch results on neon CSS glow effects with Tailwind (multiple community sources, patterns are consistent but not from a single authoritative doc)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — electron-vite 5.0, Electron 40.x, React 18, TypeScript 5 all verified; lucide-react version (0.575.x) verified
- Architecture: HIGH — IPC pattern from official Electron docs; Tailwind v4 setup from official blog
- Tailwind v4 + electron-vite integration: MEDIUM — documented to work, less battle-tested; fallback path identified
- Persistence (electron-conf): MEDIUM — recommended by electron-vite maintainer in community discussion; not from official electron-vite docs
- zipcodes-us API surface: MEDIUM — field list from GitHub README summary, exact import syntax needs hands-on verification
- Pitfalls: HIGH — WMO code gaps from official WMO table; ESM issue is a documented known issue; box-shadow vs drop-shadow is CSS spec behavior

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable ecosystem; Tailwind v4 and electron-vite 5.x are current)
