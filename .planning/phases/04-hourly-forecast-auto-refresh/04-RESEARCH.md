# Phase 4: Hourly Forecast + Auto-Refresh — Research

**Researched:** 2026-03-04
**Domain:** React hooks (setInterval, visibility), Open-Meteo hourly API, Electron window events, Tailwind horizontal scroll
**Confidence:** HIGH (core patterns), MEDIUM (Electron visibility workaround)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Forecast strip layout**
- Compact vertical columns (iOS Weather style) — narrow cells, not cards
- Each column shows: hour label on top, weather icon in middle, temperature, precipitation probability at bottom
- Placed between the hero section and the conditions grid in WeatherPanel
- First column labeled "Now" instead of the clock time; remaining columns show hour (e.g., "4 PM")
- "Now" column gets a subtle visual distinction (Claude's discretion on exact treatment)
- Strip should fit 5-6 hours visible at once, scroll horizontally for the rest
- Show 12 hours starting from the current hour (not from midnight)

**Refresh indicators**
- "Last updated" time and live countdown to next refresh displayed in the panel header bar (next to location name and gear icon)
- Countdown is a live timer counting down seconds (e.g., "Next: 4:32")
- Subtle pulse/animation on the indicator area during active refresh
- "Last updated" shows relative time (e.g., "Updated 2m ago")

**Auto-refresh behavior**
- Data updates silently in place — no loading skeleton or flash on auto-refresh. Numbers just change
- If auto-refresh fails while showing existing data: keep stale data visible, show warning, retry sooner (30 seconds) instead of waiting for the full interval
- Auto-refresh pauses when the app window is not visible (minimized/background). Resumes immediately when window becomes visible, triggering an immediate refresh if interval has elapsed
- Auto-refresh updates everything together — current conditions and hourly forecast in one API call

**Refresh interval configuration**
- Configurable in SettingsModal — dropdown with options (1, 5, 10, 15, 30 minutes)
- AppSettings.refreshInterval field already exists — just needs UI control

**Location switch behavior**
- Switching locations instantly clears all weather data and shows skeleton placeholders while new data loads
- Hourly strip scroll position resets to the beginning ("Now") on every location switch
- Auto-refresh timer resets on location switch — immediate fetch + fresh countdown
- Per-location "last updated" timestamps — switching back to a previously viewed location shows how stale that data is and triggers a refresh

### Claude's Discretion
- Exact visual treatment for the "Now" column highlight (glow, brighter border, etc.)
- Skeleton loader design for the hourly strip
- Exact layout of the countdown/updated text in the header bar
- Animation details for the refresh pulse indicator
- How to handle the API response shape change (adding hourly data params)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOUR-01 | User can view a scrollable hourly forecast showing temperature, weather condition icon, and precipitation probability for each of the next 12-24 hours | Open-Meteo hourly API fields + Tailwind horizontal scroll pattern |
| HOUR-02 | Hourly forecast starts from the current hour and shows only future hours (not past hours from midnight) | Open-Meteo `start_hour` param or client-side index slicing of hourly time array |
| HOUR-03 | Hourly forecast updates immediately when the active location changes | location key on `useWeather` triggers refetch + scroll reset via `useRef` |
| REFR-01 | User sees weather data refresh automatically at the configured interval without any user action — displayed data visibly updates when refresh completes | `useInterval` hook with `delay = settings.refreshInterval * 60_000`; silent state swap |
| REFR-02 | User can see the time of the last successful data refresh, visible at all times | `lastUpdatedAt: Date` state in `useWeather`; relative time display in header |
| REFR-03 | User can see a live countdown to the next auto-refresh, visible at all times | Separate 1-second interval in `RefreshIndicator` component counting down from interval |
</phase_requirements>

---

## Summary

Phase 4 touches four distinct technical problems that must be solved together: (1) extending the Open-Meteo API call to include hourly fields and slicing to the current hour, (2) building a horizontally scrollable hourly strip component, (3) adding a reliable auto-refresh timer that pauses when the window is not visible, and (4) displaying live "last updated" and countdown indicators in the header.

The biggest technical risk is the Electron/timer interaction. Setting `backgroundThrottling: false` in `webPreferences` prevents timer throttling when the window is minimized — but it also breaks `document.visibilitychange` events (confirmed Electron 27+ behavior, closed as "expected"). The correct pattern for this project is NOT to use `backgroundThrottling: false`. Instead, keep the default (throttling on), listen to BrowserWindow `minimize`/`restore`/`show`/`hide` events in the main process, and push visibility state to the renderer via `webContents.send()`. The renderer listens with `ipcRenderer.on()` and pauses/resumes the timer accordingly. This is the approach that must be resolved before writing interval code (noted as blocker in STATE.md).

The auto-refresh timer itself uses the well-established `useInterval` pattern (Dan Abramov, overreacted.io): a `useRef` holds the latest callback so the interval never closes over stale state, and passing `null` as delay cleanly pauses the interval without clearing and re-creating it.

**Primary recommendation:** Implement visibility detection via main-process BrowserWindow events + `webContents.send()` rather than `document.visibilitychange` or `backgroundThrottling: false`. Use the `useInterval` ref-based hook for both the auto-refresh and the 1-second countdown tick.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (useState, useEffect, useCallback, useRef) | 19.2.1 (already installed) | Timer logic, scroll reset, interval management | No external dep needed — project uses hooks-only state |
| Open-Meteo REST API | Free tier, no key | Hourly weather data | Already in use; just add `hourly` params |
| Electron BrowserWindow events | 39.x (already installed) | Detect window visibility for timer pause | Needed because `visibilitychange` is unreliable with Electron 27+ |
| Tailwind CSS v4 | 4.2.1 (already installed) | Horizontal scroll strip layout | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ipcRenderer.on()` (preload bridge) | Electron built-in | Receive window visibility events from main process | Only needed because visibilitychange is broken when backgroundThrottling=false |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BrowserWindow events → webContents.send() | `document.visibilitychange` | visibilitychange is unreliable in Electron 27+ when backgroundThrottling:false; main-process events are reliable |
| BrowserWindow events → webContents.send() | `backgroundThrottling: false` only | backgroundThrottling:false breaks visibilitychange; still needs a way to know when window is minimized to pause the timer |
| Custom useInterval hook | `react-use` useInterval | Project uses no external hook library; custom is trivial and well-documented |
| Client-side hour slicing | Open-Meteo `start_hour` param | API param is cleaner but adds complexity; client-side slicing is simpler given timezone=auto already returns local time array starting at 00:00 |

**Installation:** No new packages required. All dependencies are already in the project.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── main/
│   └── index.ts              # Add BrowserWindow minimize/restore/show/hide → webContents.send()
├── preload/
│   └── index.ts              # Expose onWindowVisibility(cb) bridge method
└── renderer/src/
    ├── hooks/
    │   ├── useWeather.ts     # Add: hourly data, auto-refresh interval, lastUpdatedAt, isRefreshing
    │   └── useInterval.ts    # NEW: reusable declarative interval hook (ref-based)
    └── components/
        ├── WeatherPanel.tsx  # Add: HourlyStrip between hero and ConditionsGrid; pass refresh state to header
        ├── HourlyStrip.tsx   # NEW: horizontally scrollable 12-hour forecast strip
        ├── RefreshIndicator.tsx # NEW: "Updated Xm ago" + "Next: mm:ss" countdown in header
        └── SkeletonLoader.tsx   # Add: HourlyStripSkeleton export
```

### Pattern 1: Declarative useInterval Hook (ref-based)

**What:** Wraps `setInterval` so the callback always reads fresh state/props. Passing `null` as delay pauses it without remounting.
**When to use:** Any interval that needs to read React state inside the tick. This is the project's auto-refresh timer AND the 1-second countdown tick.

```typescript
// Source: overreacted.io/making-setinterval-declarative-with-react-hooks/
// File: src/renderer/src/hooks/useInterval.ts
import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>(callback)

  // Always keep ref current — runs after every render, no dep array
  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
```

Usage to pause: pass `delay = null` when `!isWindowVisible`.

### Pattern 2: Window Visibility via Main Process Events

**What:** BrowserWindow emits `minimize`, `restore`, `hide`, `show` in the main process. Push these to renderer via `webContents.send()`. Renderer listens in preload and exposes a callback.
**When to use:** Required because Electron 27+ breaks `document.visibilitychange` when `backgroundThrottling: false` is set. Project should NOT set `backgroundThrottling: false`.

```typescript
// Source: Electron official docs — BrowserWindow events + webContents.send()
// File: src/main/index.ts (addition inside createWindow)
mainWindow.on('hide', () => mainWindow.webContents.send('window:visibility', false))
mainWindow.on('minimize', () => mainWindow.webContents.send('window:visibility', false))
mainWindow.on('show', () => mainWindow.webContents.send('window:visibility', true))
mainWindow.on('restore', () => mainWindow.webContents.send('window:visibility', true))
mainWindow.on('focus', () => mainWindow.webContents.send('window:visibility', true))
mainWindow.on('blur', () => mainWindow.webContents.send('window:visibility', false))
```

```typescript
// File: src/preload/index.ts (addition to contextBridge.exposeInMainWorld)
onWindowVisibility: (cb: (visible: boolean) => void) =>
  ipcRenderer.on('window:visibility', (_event, visible: boolean) => cb(visible))
```

```typescript
// File: src/renderer/src/hooks/useWeather.ts — consume it
useEffect(() => {
  const cleanup = window.electronAPI.onWindowVisibility((visible) => {
    setIsWindowVisible(visible)
  })
  return cleanup  // ipcRenderer.removeListener or similar
}, [])
```

**Note:** `blur`/`focus` events fire on window focus loss (e.g., user clicks another app), not just minimize. This matches the requirement: "pauses when window is not visible (minimized/background)."

### Pattern 3: Open-Meteo Hourly API Extension

**What:** Add `hourly` params to the existing `fetchWeather` call. Returns parallel arrays (time[], temperature_2m[], weather_code[], precipitation_probability[]).
**When to use:** Always — fetch current + hourly in one API call (per locked decision).

```typescript
// Source: Open-Meteo official docs — https://open-meteo.com/en/docs
// File: src/main/weather.ts — extend existing URLSearchParams
params.set('hourly', 'temperature_2m,weather_code,precipitation_probability')
params.set('forecast_hours', '24')  // request 24h; client will slice to 12 from current
// timezone: 'auto' already set — hourly time array starts at 00:00 LOCAL time
```

**Response shape (hourly block):**
```json
{
  "hourly": {
    "time": ["2026-03-04T00:00", "2026-03-04T01:00", ...],
    "temperature_2m": [42.1, 41.5, ...],
    "weather_code": [0, 3, ...],
    "precipitation_probability": [0, 5, ...]
  },
  "hourly_units": {
    "temperature_2m": "°F",
    "precipitation_probability": "%"
  }
}
```

**Client-side hour slicing (HOUR-02):**
```typescript
// Filter to current hour and 11 subsequent hours (12 total)
const now = new Date()
const currentHourISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:00`
const startIdx = hourly.time.findIndex(t => t >= currentHourISO)
const slice = hourly.time.slice(startIdx, startIdx + 12)
```

This is more reliable than using `start_hour` API param because: (a) the API already returns today's data starting at 00:00 local time with `timezone=auto`, so we always have the right day, and (b) client-side slicing avoids extra API params and edge cases around midnight.

### Pattern 4: Horizontal Scroll Strip (HourlyStrip)

**What:** Flex row, `overflow-x-auto`, `flex-nowrap`, fixed-width narrow columns. Each column is `shrink-0` to prevent compression.
**When to use:** The hourly forecast strip.

```tsx
// Tailwind horizontal scroll — verified pattern
<div
  ref={scrollRef}
  className="flex flex-nowrap gap-2 overflow-x-auto px-4 pb-2 scroll-smooth"
>
  {hours.map((h, i) => (
    <div key={h.time} className="flex flex-col items-center gap-1 shrink-0 w-14 ...">
      {/* hour label, icon, temp, precip */}
    </div>
  ))}
</div>
```

**Scroll reset on location switch:**
```tsx
// Pass location key as prop; useEffect resets scroll when it changes
const scrollRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  if (scrollRef.current) scrollRef.current.scrollLeft = 0
}, [locationKey])  // locationKey = active location zip
```

### Pattern 5: Relative Time + Countdown Display

**What:** `lastUpdatedAt` is a `Date | null` stored in `useWeather`. A separate 1-second `useInterval` tick in `RefreshIndicator` computes elapsed and remaining time.
**When to use:** The header bar indicator (REFR-02, REFR-03).

```tsx
// Relative time (REFR-02): "Updated Xm ago" or "Updated just now"
function formatRelative(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'Updated just now'
  return `Updated ${Math.floor(secs / 60)}m ago`
}

// Countdown (REFR-03): "Next: m:ss"
function formatCountdown(remainingMs: number): string {
  const secs = Math.max(0, Math.floor(remainingMs / 1000))
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
```

The `RefreshIndicator` component uses `useInterval(tick, 1000)` internally — it doesn't need to be paused like the data-fetch interval, because updating a display string every second is cheap even when the window is minimized.

### Anti-Patterns to Avoid

- **Passing callback directly to setInterval without ref:** stale closure — the callback always sees the state from when it was created. Use `useInterval` hook with ref.
- **Using `backgroundThrottling: false` as the only solution:** breaks `document.visibilitychange` in Electron 27+; also causes reported blank-window bugs on Windows.
- **Using `document.visibilitychange` alone in Electron:** unreliable since Electron 27+ when window is minimized vs. hidden. Use main-process events.
- **Setting loading=true on auto-refresh:** violates the locked decision "numbers just change" silently. Only set loading=true on the first fetch for a location.
- **Re-creating the interval when callback changes:** only recreate when `delay` changes. Callback changes via ref, not dep array.
- **Fetching hourly and current as separate API calls:** wastes rate limit, causes mismatched timestamps. Fetch in one call (locked decision).
- **Requesting all 168 hours (7 days) of hourly data:** wasteful — `forecast_hours: 24` is sufficient. Slice client-side to 12.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interval with stale closure | Custom setInterval with dep array | `useInterval` ref-pattern hook | Stale closures are the #1 bug in interval-based React code |
| Window visibility detection | Poll `document.hidden` every second | BrowserWindow events → `webContents.send()` | Polling wastes CPU; events are instant and reliable |
| "2 minutes ago" relative time | Complex date-fns or Intl.RelativeTimeFormat | Simple arithmetic (elapsed seconds) | REFR-02 only needs "Xm ago" — full library is overkill |
| Countdown display | date-fns or moment | Single formatCountdown() function | Only need `m:ss` format from a simple millisecond difference |

**Key insight:** The timer and visibility logic looks simple but has multiple stale-closure and platform-compatibility traps. The `useInterval` + main-process-visibility pattern from established sources prevents the 3-4 most common rewrites in this domain.

---

## Common Pitfalls

### Pitfall 1: backgroundThrottling Conflict with visibilitychange

**What goes wrong:** Developer sets `backgroundThrottling: false` so `setInterval` continues when window is minimized, but now `document.visibilitychange` never fires. Auto-refresh never pauses.
**Why it happens:** Electron 27+ explicitly disables `visibilitychange` when `backgroundThrottling` is false — documented and intentional.
**How to avoid:** Do NOT set `backgroundThrottling: false`. Keep default (true = timers pause when minimized). Then add explicit BrowserWindow `minimize`/`restore` events in main process to push visibility state to renderer. The renderer uses this to set `delay = null` on its `useInterval` call.
**Warning signs:** Timer continues counting when window is minimized but `visibilitychange` never fires.

### Pitfall 2: Auto-Refresh Interval Timer Drift

**What goes wrong:** Using `setInterval(fetch, intervalMs)` directly in `useEffect` — if fetch takes 2 seconds, the actual period becomes `intervalMs + 2s`. Over time, "Next: 4:32" countdown visibly doesn't match when refresh actually occurs.
**Why it happens:** `setInterval` fires on a fixed schedule regardless of how long the callback takes.
**How to avoid:** Reset the interval start time (`nextRefreshAt = Date.now() + intervalMs`) immediately after a successful fetch completes, not when the interval fires. The countdown reads `nextRefreshAt - Date.now()`.
**Warning signs:** Countdown shows 0:00 but refresh hasn't happened yet.

### Pitfall 3: Scroll Position Not Resetting on Location Switch

**What goes wrong:** User scrolls hourly strip to hour 8 for Location A, switches to Location B — strip still shows from hour 8.
**Why it happens:** `scrollLeft` is DOM state, not React state. React re-renders don't reset it automatically.
**How to avoid:** Use `useRef` on the scroll container. In a `useEffect` that depends on `activeZip`, set `scrollRef.current.scrollLeft = 0`.
**Warning signs:** Strip doesn't scroll back to "Now" when location changes.

### Pitfall 4: Open-Meteo Hourly Time Array Starting at Midnight

**What goes wrong:** The hourly time array starts at `T00:00` local time (with `timezone=auto`). If current time is 3 PM, blindly rendering `hourly.time[0..11]` shows midnight through 11 AM — all past hours.
**Why it happens:** API always starts at 00:00 for the current day, not at the current hour.
**How to avoid:** Find the first index in `hourly.time` where `time >= currentHourISO`, then slice 12 entries from that index.
**Warning signs:** "Now" column shows midnight or a past hour.

### Pitfall 5: Per-Location "Last Updated" Stale Logic

**What goes wrong:** User switches from Location A to B, then back to A. "Updated 2m ago" still shows the timestamp from when A was last loaded — but now B's data was just fetched. User sees confusing state.
**Why it happens:** `lastUpdatedAt` is a single value in `useWeather`, not per-location.
**How to avoid:** Store `lastUpdatedAt` as a `Map<zip, Date>` (or store the timestamp alongside the per-location weather cache). When switching back to A, show A's actual last-fetch timestamp. Per locked decision: switching back triggers a refresh if data is stale, so the timestamp will update quickly anyway.
**Warning signs:** "Updated 2m ago" doesn't change when switching locations.

### Pitfall 6: Silent Refresh Loading State Confusion

**What goes wrong:** `loading: true` is set on auto-refresh, causing the skeleton to flash and wipe out the visible weather data.
**Why it happens:** The existing `refetch()` calls `setLoading(true)` at the start.
**How to avoid:** Introduce a separate `isRefreshing: boolean` state for background refreshes. `loading` (skeleton trigger) is only `true` on the first fetch for a location (when `weather === null`). `isRefreshing` drives the subtle header pulse. Numbers update silently via `setWeather(data)` without clearing the old value first.
**Warning signs:** Skeleton flashes every 5 minutes.

---

## Code Examples

### useInterval Hook (complete, production-ready)

```typescript
// Source: overreacted.io/making-setinterval-declarative-with-react-hooks/
// src/renderer/src/hooks/useInterval.ts
import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>(callback)
  useEffect(() => { savedCallback.current = callback })  // always-fresh ref, no dep array
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
```

### useWeather Extended Signature (conceptual)

```typescript
// Additions to useWeather return type:
interface UseWeatherResult {
  weather: WeatherData | null     // existing
  hourly: HourlySlice[]           // NEW — 12 entries from current hour
  loading: boolean                // existing — only true when weather===null
  isRefreshing: boolean           // NEW — true during background fetch
  error: string | null            // existing
  lastUpdatedAt: Date | null      // NEW — timestamp of last successful fetch
  nextRefreshAt: number | null    // NEW — Date.now() ms of next scheduled refresh
  refetch: () => void             // existing
}

// HourlySlice shape:
interface HourlySlice {
  time: string          // ISO 8601 local, e.g. "2026-03-04T15:00"
  temperature: number   // in user's unit
  weatherCode: number   // WMO code
  precipProbability: number  // 0-100
}
```

### Open-Meteo weather.ts extension

```typescript
// Source: Open-Meteo docs — https://open-meteo.com/en/docs
// Additions to existing URLSearchParams in fetchWeather():
params.set('hourly', 'temperature_2m,weather_code,precipitation_probability')
params.set('forecast_hours', '24')
// (temperature_unit and timezone already set — hourly data inherits them)

// Return type extension:
return {
  // ...existing current fields...
  hourly: {
    time: json.hourly.time as string[],
    temperature: json.hourly.temperature_2m as number[],
    weatherCode: json.hourly.weather_code as number[],
    precipProbability: json.hourly.precipitation_probability as number[]
  }
}
```

### HourlyStrip scroll reset on location change

```tsx
// src/renderer/src/components/HourlyStrip.tsx
const scrollRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (scrollRef.current) scrollRef.current.scrollLeft = 0
}, [locationZip])  // prop: active location zip string

return (
  <div
    ref={scrollRef}
    className="flex flex-nowrap gap-1.5 overflow-x-auto px-4 pb-3"
    style={{ scrollbarWidth: 'none' }}  // hide scrollbar; touch-scroll still works
  >
    {hours.map((h, i) => (
      <HourlyCell key={h.time} hour={h} isNow={i === 0} />
    ))}
  </div>
)
```

### Window visibility bridge (main process → renderer)

```typescript
// src/main/index.ts — inside createWindow(), after mainWindow created
const sendVisibility = (visible: boolean) =>
  mainWindow.webContents.send('window:visibility', visible)

mainWindow.on('minimize', () => sendVisibility(false))
mainWindow.on('hide',     () => sendVisibility(false))
mainWindow.on('blur',     () => sendVisibility(false))
mainWindow.on('restore',  () => sendVisibility(true))
mainWindow.on('show',     () => sendVisibility(true))
mainWindow.on('focus',    () => sendVisibility(true))
```

```typescript
// src/preload/index.ts — added to contextBridge.exposeInMainWorld('electronAPI', { ... })
onWindowVisibility: (cb: (visible: boolean) => void) => {
  const listener = (_event: Electron.IpcRendererEvent, visible: boolean) => cb(visible)
  ipcRenderer.on('window:visibility', listener)
  return () => ipcRenderer.removeListener('window:visibility', listener)
},
```

### RefreshIndicator countdown (1-second tick)

```tsx
// src/renderer/src/components/RefreshIndicator.tsx
function RefreshIndicator({ lastUpdatedAt, nextRefreshAt, isRefreshing }) {
  const [, tick] = useState(0)
  useInterval(() => tick(n => n + 1), 1000)  // re-render every second

  const relative = lastUpdatedAt ? formatRelative(lastUpdatedAt) : null
  const countdown = nextRefreshAt ? formatCountdown(nextRefreshAt - Date.now()) : null

  return (
    <div className={`flex gap-2 text-xs font-mono text-text-dim ${isRefreshing ? 'animate-pulse' : ''}`}>
      {relative && <span>{relative}</span>}
      {countdown && <span>Next: {countdown}</span>}
    </div>
  )
}
```

### SettingsModal: replace number input with dropdown

```tsx
// Locked decision: dropdown with options [1, 5, 10, 15, 30] minutes
// Replace the existing <input type="number"> in SettingsModal.tsx
const REFRESH_OPTIONS = [1, 5, 10, 15, 30]

<select
  value={settings.refreshInterval}
  onChange={(e) => onUpdate('refreshInterval', Number(e.target.value))}
  className="bg-bg-dark border border-neon-cyan/30 rounded px-3 py-1 font-mono text-sm text-text-primary ..."
>
  {REFRESH_OPTIONS.map(n => (
    <option key={n} value={n}>{n} min</option>
  ))}
</select>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval()` directly in `useEffect` | `useInterval` hook with `useRef` callback | React Hooks era (2019+) | Eliminates stale closure bugs |
| `document.visibilitychange` in Electron | BrowserWindow main-process events | Electron 27 (2023) | `visibilitychange` unreliable when `backgroundThrottling=false` |
| SettingsModal free-text interval input | Dropdown with fixed options (1,5,10,15,30) | Phase 4 decision | Prevents invalid values without clamping logic |

**Deprecated/outdated:**
- `document.visibilitychange` in Electron renderer for minimize detection: broken in Electron 27+ when `backgroundThrottling` is disabled (and the two settings can't safely coexist). Use BrowserWindow events in main process instead.
- `ipcRenderer.send()` + `ipcMain.on()` pattern for two-way IPC: project uses `invoke`/`handle` pattern for request-response and `webContents.send()`/`ipcRenderer.on()` for push notifications. Maintain this convention.

---

## Open Questions

1. **blur vs. minimize: should blur pause auto-refresh?**
   - What we know: Locked decision says "pauses when the app window is not visible (minimized/background)." `blur` fires when user clicks another app but this window is still visible.
   - What's unclear: Does "background" mean minimized-only, or also "user switched apps but window is visible"?
   - Recommendation: Treat `blur` as pause-eligible. A weather refresh every 5 minutes is cheap, but if the window is visually hidden or behind other windows, pausing saves battery. Use focus/blur for the timer and document that is the interpretation.

2. **Per-location weather cache scope**
   - What we know: Locked decision says "per-location last updated timestamps — switching back shows how stale that data is and triggers a refresh."
   - What's unclear: Should the full WeatherData + HourlySlice be cached per-location in memory, or just the timestamp? If only the timestamp is cached, switching back shows stale indicators but the weather display clears while refetching.
   - Recommendation: Cache the full weather + hourly data per-location as a `Map<zip, { data, lastUpdatedAt }>` in `useWeather`. This enables instant display of the cached data with a staleness indicator while the refresh runs in the background. Consistent with the "silent update" philosophy.

3. **ipcRenderer.removeListener cleanup type safety**
   - What we know: The preload bridge currently doesn't expose `removeListener`. Adding `onWindowVisibility` returns a cleanup function, but the TypeScript types in `preload/index.d.ts` will need updating.
   - What's unclear: Whether the existing preload `index.d.ts` (which was last updated to remove stale types in commit `e264b82`) is generated or hand-maintained.
   - Recommendation: Hand-maintain the type — add `onWindowVisibility: (cb: (visible: boolean) => void) => () => void` to the `ElectronAPI` interface in `preload/index.d.ts`.

---

## Sources

### Primary (HIGH confidence)
- Open-Meteo official docs (https://open-meteo.com/en/docs) — hourly params, forecast_hours, start_hour, timezone=auto behavior, response shape
- Electron BrowserWindow docs (https://www.electronjs.org/docs/latest/api/browser-window) — backgroundThrottling, visibilityState behavior, focus/blur/minimize/restore events, webContents.send()
- overreacted.io — useInterval hook pattern with useRef callback (verified implementation)

### Secondary (MEDIUM confidence)
- Electron issue #41233 (https://github.com/electron/electron/issues/41233) — confirmed: visibilitychange broken when backgroundThrottling=false in Electron 27+, closed as "expected behavior"
- MDN Page Visibility API (https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — visibilitychange API reference (browser spec, not Electron-specific)
- Tailwind CSS docs — overflow, flex-wrap, scroll-snap utilities

### Tertiary (LOW confidence)
- Multiple dev.to/Medium articles on React auto-refresh patterns — consistent with overreacted.io approach but not independently verified as authoritative

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new installs; API fields verified against Open-Meteo docs
- Architecture: HIGH — `useInterval` ref pattern is canonical; BrowserWindow event approach is documented Electron API
- Electron visibility workaround: MEDIUM — bug #41233 confirmed the behavior but the IPC workaround is community-pattern, not explicitly in official docs as "the solution"
- Pitfalls: HIGH — most identified from direct source code inspection of the existing codebase

**Research date:** 2026-03-04
**Valid until:** 2026-06-04 (90 days — Electron and Open-Meteo are stable APIs; the visibility bug is documented behavior, not a moving target)
