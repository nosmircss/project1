# Phase 2: Full Conditions + Settings - Research

**Researched:** 2026-03-01
**Domain:** Open-Meteo extended API params, electron-conf settings persistence, React modal/settings UI, unit conversion
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Conditions layout:** 2-column grid of cards below the temperature hero. Each card shows one metric with icon + value. Subtle neon borders (faint cyan at low opacity), glow effect on hover only — hero temp stays the clear focal point. 6 metrics total: wind, humidity, UV index, pressure, sunrise, sunset.
- **Settings panel:** Gear icon in the top-right of the main panel (header area). Opens a modal/overlay on top of the weather content. Contains unit toggles (F/C, mph/km/h) and auto-refresh interval.
- **Unit switching:** Toggles live exclusively in the settings modal — no inline clicking on values. Temperature: Fahrenheit / Celsius toggle. Wind speed: mph / km/h toggle. Changes apply immediately and persist after restart.
- **Data presentation:** Wind direction: compass format ("NW", "SSE") — not degrees. Sunrise/sunset times: follow system locale (12h or 24h based on user's OS setting).

### Claude's Discretion

- UV index display format (number only vs number + risk label with color coding)
- Sunrise/sunset card treatment (one wide card spanning grid vs two separate cards)
- Settings modal visual style (full overlay vs centered card vs slide-in drawer)
- Neon color treatment for condition card icons and values
- Exact grid spacing and card sizing

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COND-03 | User can view wind speed, wind direction, and humidity percentage | Open-Meteo `current` params confirmed: `wind_speed_10m`, `wind_direction_10m`, `relative_humidity_2m`. Wind direction degrees→compass conversion algorithm identified. |
| COND-04 | User can view UV index for active location | Open-Meteo `current` param confirmed: `uv_index`. Returns float (e.g. 2.30). UV risk label thresholds documented below. |
| COND-05 | User can view atmospheric pressure for active location | Open-Meteo `current` param confirmed: `surface_pressure`. Returns hPa. |
| COND-06 | User can view sunrise and sunset times for active location | Open-Meteo `daily` params confirmed: `sunrise`, `sunset`. Returns ISO 8601 timestamps in arrays. `Intl.DateTimeFormat` handles locale-aware 12/24h display. |
| SET-01 | User can toggle temperature display between Fahrenheit and Celsius — persists after restart | `temperature_unit` param already in `fetchWeather`. Must become dynamic from stored settings. electron-conf handles persistence in main process. Settings IPC pattern documented below. |
| SET-02 | User can toggle wind speed between mph and km/h — persists after restart | `wind_speed_unit` param already in `fetchWeather` (hardcoded `mph`). Must become dynamic from stored settings. Same electron-conf pattern as SET-01. |
| SET-03 | User can configure the auto-refresh interval — persists after restart | Interval stored via electron-conf. Auto-refresh implementation is Phase 3 (REFR-01/02), but settings persistence for the interval value is in scope for Phase 2. |
</phase_requirements>

## Summary

Phase 2 extends an already-working Phase 1 foundation with two orthogonal concerns: (1) richer weather data display and (2) user-configurable settings that persist across restarts. Both concerns are well-supported by the existing stack with zero new dependencies required.

The weather data side is primarily an API expansion: Open-Meteo's `current` parameter already accepts all five needed variables (`wind_speed_10m`, `wind_direction_10m`, `relative_humidity_2m`, `uv_index`, `surface_pressure`), confirmed by live API call. Sunrise/sunset require a separate `daily` request param, returning an array of ISO 8601 timestamps — today's value is always `daily.sunrise[0]`. Unit conversion (Fahrenheit/Celsius, mph/km/h) is handled by the Open-Meteo API itself via the existing `temperature_unit` and `wind_speed_unit` params — no client-side math needed for temperature display; wind direction degrees-to-compass is a simple 16-point array lookup.

The settings side uses `electron-conf`, which is already installed. The README confirms three distinct integration points: main process (`Conf` from `electron-conf/main`), preload (`exposeConf` from `electron-conf/preload`), and renderer (`Conf` from `electron-conf/renderer`, async API). The project currently uses only a custom `electronAPI` bridge; this phase adds the electron-conf IPC bridge alongside it. Settings state should live in React (`useState`) seeded from the persisted config on startup, with writes happening on every toggle change.

**Primary recommendation:** Expand `fetchWeather` to accept `Settings` as a parameter (not hardcode units), add electron-conf's renderer bridge in main + preload, create a `useSettings` hook that loads defaults on mount and persists on change, then build `ConditionCard` and `SettingsModal` React components following existing WeatherPanel patterns.

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron-conf | ^1.3.0 | Settings persistence across restarts | Already installed per 01-01 decision; avoids ESM-only electron-store |
| Open-Meteo API | N/A (HTTP) | Additional weather fields | Already integrated; same API, new params |
| lucide-react | ^0.575.0 | Condition card icons | Already used for WeatherIcon |
| Tailwind CSS 4 | ^4.2.1 | Card grid layout, modal styling | Already used throughout |
| React 19 | ^19.2.1 | useState for settings, new component state | Already the UI framework |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Intl.DateTimeFormat` | Browser built-in | Locale-aware 12/24h sunrise/sunset formatting | Use instead of date-fns/dayjs — no dep needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-conf (already installed) | electron-store | electron-store is ESM-only — breaks CJS electron-vite build (established in Phase 1) |
| Open-Meteo API units param | Client-side conversion math | API conversion is more accurate and already wired; client-side is redundant work |
| Intl.DateTimeFormat | date-fns / dayjs | No additional dependency; Intl API covers locale detection natively |

**Installation:** No new packages required for this phase.

## Architecture Patterns

### Recommended Project Structure (additions for Phase 2)

```
src/
├── main/
│   ├── index.ts          # Add: conf.registerRendererListener(), settings IPC handlers
│   ├── weather.ts        # Modify: accept Settings param, add new API fields
│   └── settings.ts       # NEW: Conf instance, default settings, typed settings interface
├── preload/
│   └── index.ts          # Add: exposeConf() call
└── renderer/src/
    ├── lib/
    │   ├── types.ts       # Modify: expand WeatherData, add AppSettings interface
    │   └── windDirection.ts  # NEW: degrees→compass conversion utility
    ├── hooks/
    │   └── useSettings.ts # NEW: loads settings from electron-conf, persists on change
    └── components/
        ├── WeatherPanel.tsx    # Modify: add header with gear icon + conditions grid
        ├── ConditionCard.tsx   # NEW: single metric card (icon + label + value)
        ├── ConditionsGrid.tsx  # NEW: 2-column grid of 6 ConditionCards
        ├── SettingsModal.tsx   # NEW: overlay modal with unit toggles + interval
        └── SkeletonLoader.tsx  # Modify: add ConditionCardSkeleton variant
```

### Pattern 1: electron-conf Three-Layer Integration

**What:** electron-conf requires setup in all three Electron layers (main, preload, renderer) to work safely across process boundaries with contextIsolation enabled.

**When to use:** Any settings that must persist across app restarts.

**Example (main process — src/main/settings.ts):**
```typescript
// Source: electron-conf README (confirmed against installed node_modules)
import { Conf } from 'electron-conf/main'

export interface AppSettings {
  temperatureUnit: 'fahrenheit' | 'celsius'
  windSpeedUnit: 'mph' | 'kmh'
  refreshInterval: number // minutes, default 5
}

const DEFAULTS: AppSettings = {
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  refreshInterval: 5
}

export const conf = new Conf<AppSettings>({ name: 'settings', defaults: DEFAULTS })
```

**Example (main process — src/main/index.ts additions):**
```typescript
import { useConf } from 'electron-conf/main'
import { conf } from './settings'

// In app.whenReady():
useConf()  // exposes electron-conf IPC globally for renderer use
// OR: conf.registerRendererListener() for a single named config

// Settings IPC handlers (alternative to useConf if you want explicit control):
ipcMain.handle('settings:get', () => conf.store)
ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
  conf.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings])
})
```

**Example (preload — src/preload/index.ts addition):**
```typescript
// Source: electron-conf README
import { exposeConf } from 'electron-conf/preload'

exposeConf()  // Exposes window.__electronConf__ bridge
```

**Example (renderer hook — src/renderer/src/hooks/useSettings.ts):**
```typescript
// Source: electron-conf README (renderer API is promise-based)
import { useState, useEffect } from 'react'
import { Conf } from 'electron-conf/renderer'
import type { AppSettings } from '../../../main/settings'  // shared type

const conf = new Conf<AppSettings>({ name: 'settings' })

const DEFAULTS: AppSettings = {
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  refreshInterval: 5
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Load all settings once on mount
    Promise.all([
      conf.get('temperatureUnit', DEFAULTS.temperatureUnit),
      conf.get('windSpeedUnit', DEFAULTS.windSpeedUnit),
      conf.get('refreshInterval', DEFAULTS.refreshInterval)
    ]).then(([temperatureUnit, windSpeedUnit, refreshInterval]) => {
      setSettings({ temperatureUnit, windSpeedUnit, refreshInterval })
      setLoaded(true)
    })
  }, [])

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    await conf.set(key, value)
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return { settings, loaded, updateSetting }
}
```

### Pattern 2: Settings-Aware Weather Fetch

**What:** Pass `AppSettings` to `fetchWeather` so the API returns data in the user's preferred units. No client-side temperature conversion needed — the API handles it.

**When to use:** Every weather fetch must use current unit preferences.

**Example (src/main/weather.ts modification):**
```typescript
// Live API confirmed: temperature_unit accepts 'celsius'|'fahrenheit',
// wind_speed_unit accepts 'mph'|'kmh'|'ms'|'kn'
// Note: Open-Meteo uses 'kmh' not 'km/h' as the param value

export interface OpenMeteoResult {
  temperature: number
  feelsLike: number
  weatherCode: number
  isDay: boolean
  time: string
  windSpeed: number
  windDirection: number     // degrees 0-360 — convert to compass in renderer
  humidity: number          // percent
  uvIndex: number
  pressure: number          // hPa
  sunrise: string           // ISO 8601, e.g. "2026-03-01T06:32"
  sunset: string            // ISO 8601, e.g. "2026-03-01T17:51"
  units: {
    temperature: string     // "°F" or "°C"
    windSpeed: string       // "mp/h" or "km/h"
  }
}

export async function fetchWeather(
  lat: number,
  lon: number,
  settings: { temperatureUnit: string; windSpeedUnit: string }
): Promise<OpenMeteoResult> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      'temperature_2m', 'apparent_temperature', 'weather_code', 'is_day',
      'wind_speed_10m', 'wind_direction_10m', 'relative_humidity_2m',
      'uv_index', 'surface_pressure'
    ].join(','),
    daily: 'sunrise,sunset',
    temperature_unit: settings.temperatureUnit,
    wind_speed_unit: settings.windSpeedUnit,
    timezone: 'auto',
    forecast_days: '1'
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error(`Weather API error: ${res.status} ${res.statusText}`)
  const json = await res.json()
  const current = json.current

  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    time: current.time,
    windSpeed: current.wind_speed_10m,
    windDirection: current.wind_direction_10m,
    humidity: current.relative_humidity_2m,
    uvIndex: current.uv_index,
    pressure: current.surface_pressure,
    sunrise: json.daily.sunrise[0],   // today is always index 0
    sunset: json.daily.sunset[0],
    units: {
      temperature: json.current_units?.temperature_2m || '°F',
      windSpeed: json.current_units?.wind_speed_10m || 'mp/h'
    }
  }
}
```

**CRITICAL NOTE:** The Open-Meteo API returns wind speed unit label as `"mp/h"` (not `"mph"`). Verified by live API call. Display as "mph" in the UI — don't use the raw API string.

### Pattern 3: Wind Direction Degrees to Compass Conversion

**What:** Convert degrees (0–360) to 16-point compass abbreviation. The Open-Meteo API returns `wind_direction_10m` as integer degrees (e.g. 37). User decision requires compass display ("NW", "SSE").

**When to use:** Rendering wind direction in ConditionCard.

**Example (src/renderer/src/lib/windDirection.ts):**
```typescript
// Source: standard algorithm, multiple verified community sources
const COMPASS_POINTS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']

export function degreesToCompass(degrees: number): string {
  const index = Math.floor((degrees + 11.25) / 22.5) % 16
  return COMPASS_POINTS[index]
}
```

### Pattern 4: Sunrise/Sunset Locale-Aware Formatting

**What:** Convert ISO 8601 timestamp string to user's local 12h/24h format using `Intl.DateTimeFormat`. The Open-Meteo API returns strings like `"2026-03-01T06:32"` without timezone offset — parse as local time using the `timezone` from the API response, or append 'Z' cautiously.

**When to use:** Rendering sunrise/sunset in ConditionCard.

**Example:**
```typescript
// Source: MDN Intl.DateTimeFormat (browser built-in)
// PITFALL: "2026-03-01T06:32" has no timezone info — treat as local time
// The API returns times in the location's local timezone (timezone: 'auto')
// Appending 'Z' would convert to UTC, which is WRONG for non-UTC locations
// Correct approach: parse as-is (no 'Z') and display — the time IS local

export function formatSunTime(isoString: string): string {
  // Parse without 'Z' — the timestamp is already in the location's local timezone
  const date = new Date(isoString)
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    // No 'hour12' specified — respects user's OS locale setting (12h or 24h)
  })
}
```

**PITFALL WARNING:** `new Date("2026-03-01T06:32")` without a timezone suffix is treated as LOCAL time by JS engines (spec ambiguous for datetime-only strings without 'T' separator in some engines, but ISO 8601 datetime strings without offset are local per ECMA-262 Annex B). This is actually correct behavior since the API returns times in the queried timezone (`timezone: 'auto'` means Open-Meteo uses the location's timezone). Confirm with a test case.

### Pattern 5: Settings Modal (React)

**What:** Floating modal overlay with backdrop. No external dialog library needed — Tailwind + React state is sufficient for a simple modal.

**When to use:** Settings gear icon click in WeatherPanel header.

**Example (simplified structure):**
```tsx
// Claude's discretion: centered card style recommended for this UI
// Rationale: WeatherPanel is centered content — centered modal feels natural;
// slide-in drawer would require sidebar awareness; full overlay feels heavy

export function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      {/* Modal card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-bg-card border border-neon-cyan/30 rounded-lg p-6 w-80 neon-glow-cyan">
          <h2 className="text-neon-cyan font-mono text-lg mb-6">Settings</h2>
          {/* Temperature unit toggle */}
          {/* Wind speed unit toggle */}
          {/* Auto-refresh interval */}
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  )
}
```

### Pattern 6: ConditionCard Component

**What:** Reusable card for a single weather metric. Uses existing `WeatherIcon` pattern (Lucide icon with neon glow).

**Example:**
```tsx
import { WeatherIcon } from './WeatherIcon'
import type { LucideIcon } from 'lucide-react'

interface ConditionCardProps {
  Icon: LucideIcon
  label: string      // "Wind", "Humidity", etc.
  value: string      // "12 mph NW", "65%", etc. — fully formatted before passing in
  iconColor?: string
  glowColor?: string
}

export function ConditionCard({ Icon, label, value, iconColor = '#00f0ff', glowColor = '#00f0ff' }: ConditionCardProps) {
  return (
    <div className="
      bg-bg-card border border-neon-cyan/15 rounded-lg p-4
      flex flex-col items-center gap-2 text-center
      hover:border-neon-cyan/40 hover:shadow-[0_0_12px_#00f0ff20]
      transition-all duration-200
    ">
      <WeatherIcon Icon={Icon} size={24} color={iconColor} glowColor={glowColor} />
      <p className="text-text-secondary font-mono text-xs uppercase tracking-wide">{label}</p>
      <p className="text-text-primary font-mono text-sm">{value}</p>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Hardcoding unit params in fetchWeather:** The current `weather.ts` has `temperature_unit: 'fahrenheit'` and `wind_speed_unit: 'mph'` hardcoded. These MUST be made dynamic in this phase or SET-01/02 cannot be implemented.
- **Client-side temperature conversion:** Don't convert between °F and °C in JavaScript. Let the Open-Meteo API return the right unit. This avoids float precision drift and keeps the code simple.
- **Storing settings only in renderer state:** Settings must go through electron-conf to persist across restarts. Do not use localStorage — it is available in Electron renderer but is not the project's established pattern and would be inconsistent.
- **Appending 'Z' to sunrise/sunset ISO strings:** The API timestamps are already in local time. Adding 'Z' would shift times by the UTC offset.
- **Multiple Conf instances for same name:** electron-conf README warns: "It does not support multiple instances reading and writing the same configuration file." Use one singleton Conf instance in main process.
- **Fetching weather before settings are loaded:** If settings haven't been read from disk yet, a fetch would use default values and then re-fetch when settings load — causing a double-fetch flicker. Load settings first, then trigger the weather fetch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings persistence | Custom JSON file read/write | electron-conf (already installed) | Handles atomic writes, defaults, dot-notation — already in project |
| Temperature unit conversion | `temp * 9/5 + 32` in JS | Open-Meteo `temperature_unit` param | API handles it; eliminates rounding errors |
| Wind speed conversion | `speed * 1.60934` in JS | Open-Meteo `wind_speed_unit` param | API handles it; already in the URL params |
| Date/time formatting | Custom time string parser | `Intl.DateTimeFormat` (built-in) | Handles locale, 12/24h, no dependency |
| Modal backdrop/trap | Custom focus management | Simple Tailwind + React state | Phase scope is simple — no accessibility library overhead |

**Key insight:** The API already handles all unit conversions. The only custom math is degrees-to-compass (16-element array lookup, ~3 lines of code).

## Common Pitfalls

### Pitfall 1: electron-conf Renderer API is Asynchronous

**What goes wrong:** Code written as `const unit = conf.get('temperatureUnit')` (synchronous style from main process docs) fails silently in renderer — all renderer methods return Promises.

**Why it happens:** electron-conf renderer communicates over IPC, which is inherently async. The type definitions confirm all renderer methods return `Promise<T>`.

**How to avoid:** Always `await` or `.then()` renderer conf calls. Load all settings in a single `useEffect` on mount with `Promise.all`.

**Warning signs:** Settings always appear as defaults even after changing them; TypeScript errors about `Promise<string>` not assignable to `string`.

### Pitfall 2: Settings Not Loaded Before First Weather Fetch

**What goes wrong:** App boots, `useWeather` fires immediately with default settings (°F/mph), then `useSettings` loads persisted settings (°C/kph), triggering a second API call. User sees a flash of wrong units.

**Why it happens:** `useWeather` and `useSettings` are independent hooks that both run on mount, but `useSettings` has async I/O.

**How to avoid:** In `App.tsx`, gate the weather fetch on `settings.loaded === true`. Pass settings to `useWeather` (or wrap fetch so it waits). The `loaded` flag from `useSettings` is the guard.

**Warning signs:** Brief flash of incorrect unit display on app startup; double API calls in network inspector.

### Pitfall 3: IPC Channel Not Registered

**What goes wrong:** `useConf()` or `conf.registerRendererListener()` not called in main process, causing `electron-conf/renderer` to hang or error with "No IPC handler registered."

**Why it happens:** electron-conf renderer uses IPC under the hood. The main process must register the listener before the renderer calls it.

**How to avoid:** Call `useConf()` (or `conf.registerRendererListener()`) in `app.whenReady()` in `src/main/index.ts`. Also call `exposeConf()` in `src/preload/index.ts`.

**Warning signs:** `conf.get()` in renderer never resolves; Electron console errors about unhandled IPC messages.

### Pitfall 4: WeatherData Type Not Updated Everywhere

**What goes wrong:** `WeatherData` interface in `types.ts` is expanded with new fields, but `OpenMeteoResult` in `weather.ts` and the IPC handler signature are not updated — TypeScript compiles but runtime data is missing fields.

**Why it happens:** The type is defined in the renderer (`src/renderer/src/lib/types.ts`) but the data is shaped in the main process (`src/main/weather.ts`). They're not auto-linked.

**How to avoid:** Update `OpenMeteoResult` in `weather.ts` first. Then update `WeatherData` in `types.ts` to match. Run `npm run typecheck` after both changes.

**Warning signs:** `undefined` values in condition cards; TypeScript errors only appear after running `typecheck:node` vs `typecheck:web` separately.

### Pitfall 5: IPC Handler for Weather:fetch Not Updated to Accept Settings

**What goes wrong:** `ipcMain.handle('weather:fetch', ...)` in `index.ts` still calls `fetchWeather(lat, lon)` without passing settings, so unit prefs are ignored.

**Why it happens:** The IPC handler signature must be updated to receive settings as a third argument from the renderer.

**How to avoid:** Update the IPC handler to accept `(lat, lon, settings)`. Update `window.electronAPI.fetchWeather` in preload. Update `useWeather` to pass current settings.

### Pitfall 6: Open-Meteo Wind Speed Unit Param Value

**What goes wrong:** Passing `wind_speed_unit: 'km/h'` fails silently — API ignores it and returns default (km/h). The correct value is `'kmh'` (no slash).

**Why it happens:** The API docs use "km/h" in prose but the actual param value is `'kmh'`.

**How to avoid:** Store the unit as `'mph' | 'kmh'` in AppSettings (matching API values). Only convert to display strings (`'mph'` → `'mph'`, `'kmh'` → `'km/h'`) in the UI layer.

**Warning signs:** Wind speed always returns in km/h even when mph is selected.

## Code Examples

### Live API Response Structure (verified 2026-03-01)

```json
{
  "current_units": {
    "time": "iso8601",
    "interval": "seconds",
    "temperature_2m": "°F",
    "apparent_temperature": "°F",
    "weather_code": "wmo code",
    "is_day": "",
    "wind_speed_10m": "mp/h",
    "wind_direction_10m": "°",
    "relative_humidity_2m": "%",
    "uv_index": "",
    "surface_pressure": "hPa"
  },
  "current": {
    "time": "2026-03-01T09:45",
    "interval": 900,
    "temperature_2m": 49.9,
    "apparent_temperature": 44.0,
    "weather_code": 2,
    "is_day": 1,
    "wind_speed_10m": 1.1,
    "wind_direction_10m": 37,
    "relative_humidity_2m": 29,
    "uv_index": 2.30,
    "surface_pressure": 839.8
  },
  "daily_units": {
    "time": "iso8601",
    "sunrise": "iso8601",
    "sunset": "iso8601"
  },
  "daily": {
    "time": ["2026-03-01"],
    "sunrise": ["2026-03-01T06:32"],
    "sunset": ["2026-03-01T17:51"]
  }
}
```

### UV Index Risk Labels (Claude's Discretion)

Recommendation: show number + risk label with color. The number alone is not intuitive to most users; the label adds immediate value with minimal space cost.

```typescript
// UV index thresholds per WHO standard
export function uvRiskLabel(uv: number): { label: string; color: string } {
  if (uv < 3)  return { label: 'Low',      color: '#00cc44' }
  if (uv < 6)  return { label: 'Moderate', color: '#ffcc00' }
  if (uv < 8)  return { label: 'High',     color: '#ff8800' }
  if (uv < 11) return { label: 'Very High',color: '#ff4444' }
  return       { label: 'Extreme',         color: '#cc00ff' }
}
```

### Lucide Icon Selection for Condition Cards

```typescript
// Recommended icon mappings using lucide-react (already installed, v0.575.0)
import { Wind, Droplets, Sun, Gauge, Sunrise, Sunset } from 'lucide-react'

// Wind: Wind icon
// Humidity: Droplets icon
// UV Index: Sun icon (or Zap for intensity feeling)
// Pressure: Gauge icon
// Sunrise: Sunrise icon
// Sunset: Sunset icon
```

### Settings Toggle Pattern (Toggle button, not checkbox)

```tsx
// Recommended: pill-style toggle button matching neon design system
interface UnitToggleProps {
  label: string
  options: [string, string]    // e.g. ['°F', '°C']
  values: [string, string]     // e.g. ['fahrenheit', 'celsius']
  current: string
  onChange: (value: string) => void
}

function UnitToggle({ label, options, values, current, onChange }: UnitToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary font-mono text-sm">{label}</span>
      <div className="flex border border-neon-cyan/30 rounded overflow-hidden">
        {options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => onChange(values[i])}
            className={`px-3 py-1 font-mono text-sm transition-colors
              ${current === values[i]
                ? 'bg-neon-cyan/20 text-neon-cyan neon-text-glow-cyan'
                : 'text-text-dim hover:text-text-secondary'
              }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Sunrise/Sunset Card Layout (Claude's Discretion)

Recommendation: Two separate cards in the 2-column grid (not a wide spanning card). Rationale: keeps the grid uniform and symmetric; sunrise and sunset are distinct data points that benefit from separate presentation. A spanning card would break the grid rhythm for a marginal layout benefit.

### AppSettings Interface (shared type)

```typescript
// src/renderer/src/lib/types.ts additions
export interface AppSettings {
  temperatureUnit: 'fahrenheit' | 'celsius'
  windSpeedUnit: 'mph' | 'kmh'     // 'kmh' matches Open-Meteo param value
  refreshInterval: number           // minutes
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| electron-store for settings | electron-conf | Phase 1 (project decision) | Avoids ESM-only incompatibility in CJS electron-vite builds |
| Hardcoded `temperature_unit: 'fahrenheit'` | Dynamic from AppSettings | This phase | Enables SET-01/02 |
| Weather fetch ignores units | Pass settings to fetchWeather | This phase | IPC handler must accept 3rd arg |

**Deprecated/outdated:**
- `electron-store`: Works, but ESM-only as of recent versions — breaks CJS build in electron-vite. Already decided in Phase 1, do not use.

## Open Questions

1. **Shared type location for AppSettings**
   - What we know: `types.ts` is in renderer (`src/renderer/src/lib/types.ts`); `weather.ts` is in main. Both need to know the settings shape.
   - What's unclear: Whether to put `AppSettings` in renderer types.ts (import in main via path alias) or create a shared `src/shared/types.ts`.
   - Recommendation: Put `AppSettings` in `src/renderer/src/lib/types.ts` and import it in `src/main/settings.ts` via relative path (`../../renderer/src/lib/types`). The electron-vite build handles cross-process imports at the type level (not runtime). Alternatively, define it locally in both places — it's small enough. Planner should decide.

2. **How to propagate unit changes to active weather display**
   - What we know: When user changes temperature unit in settings, the displayed temperature is stale (still in old unit). A refetch is needed.
   - What's unclear: Whether to auto-refetch on settings change or show a "Refresh to apply" notice.
   - Recommendation: Auto-refetch immediately on unit toggle. The API is fast (<500ms) and user expectation is "applies immediately" per the requirements. Pass a `onSettingsChange` callback from the weather hook to trigger refetch.

3. **electron-conf `useConf()` vs `registerRendererListener()`**
   - What we know: `useConf()` registers globally for all renderers; `registerRendererListener()` is per-instance and requires a named config.
   - What's unclear: Which is more appropriate for this single-window app.
   - Recommendation: Use `useConf()` in main process (simpler, global registration) + `exposeConf()` in preload. This is the simplest path per the README.

## Sources

### Primary (HIGH confidence)

- Live Open-Meteo API call (2026-03-01): `https://api.open-meteo.com/v1/forecast?latitude=39.7392&longitude=-104.9903&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,wind_direction_10m,relative_humidity_2m,uv_index,surface_pressure&daily=sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1` — confirmed all field names, units, response structure, `mp/h` unit string
- `node_modules/electron-conf/README.md` (installed v1.3.0) — confirmed three-layer integration pattern, async renderer API, `useConf()` vs `registerRendererListener()`
- `node_modules/electron-conf/dist/renderer.d.ts` — confirmed all renderer methods return `Promise<T>`
- `node_modules/electron-conf/dist/main.d.ts` — confirmed main process sync API and options
- Existing source files (Phase 1 implementation): `src/main/weather.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/src/lib/types.ts`, `src/renderer/src/components/WeatherPanel.tsx`, `src/renderer/src/hooks/useWeather.ts`
- Open-Meteo API docs: `https://open-meteo.com/en/docs` — confirmed `current` parameter supports all listed variables, `daily` structure

### Secondary (MEDIUM confidence)

- WebSearch: degrees-to-compass conversion algorithm — 16-point array, `Math.floor((degrees + 11.25) / 22.5) % 16` — consistent across multiple independent sources
- Intl.DateTimeFormat MDN behavior — standard browser API, deterministic behavior confirmed by knowledge

### Tertiary (LOW confidence)

- WHO UV index thresholds (0-2 Low, 3-5 Moderate, 6-7 High, 8-10 Very High, 11+ Extreme) — widely cited but not verified against authoritative primary source in this session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed and in use; no new dependencies
- Open-Meteo API fields: HIGH — confirmed by live API call with real response
- electron-conf integration: HIGH — verified against installed package README and TypeScript definitions
- Architecture patterns: HIGH — derived from existing Phase 1 codebase patterns
- Wind direction algorithm: MEDIUM — consistent across multiple sources, simple math
- UV risk labels: MEDIUM — WHO standard widely cited, values consistent across sources
- Sunrise/sunset time parsing: MEDIUM — JS Date behavior for ISO strings without timezone is spec-defined but edge-case sensitive

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable stack — Open-Meteo API is stable, electron-conf is low churn)
