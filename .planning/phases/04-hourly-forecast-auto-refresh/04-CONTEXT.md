# Phase 4: Hourly Forecast + Auto-Refresh - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see the next 12 hours of weather at a glance via a horizontally scrollable forecast strip, and the app keeps data current automatically with configurable refresh intervals — with clear indicators of how fresh the data is.

</domain>

<decisions>
## Implementation Decisions

### Forecast strip layout
- Compact vertical columns (iOS Weather style) — narrow cells, not cards
- Each column shows: hour label on top, weather icon in middle, temperature, precipitation probability at bottom
- Placed between the hero section and the conditions grid in WeatherPanel
- First column labeled "Now" instead of the clock time; remaining columns show hour (e.g., "4 PM")
- "Now" column gets a subtle visual distinction (Claude's discretion on exact treatment)
- Strip should fit 5-6 hours visible at once, scroll horizontally for the rest
- Show 12 hours starting from the current hour (not from midnight)

### Refresh indicators
- "Last updated" time and live countdown to next refresh displayed in the panel header bar (next to location name and gear icon)
- Countdown is a live timer counting down seconds (e.g., "Next: 4:32")
- Subtle pulse/animation on the indicator area during active refresh
- "Last updated" shows relative time (e.g., "Updated 2m ago")

### Auto-refresh behavior
- Data updates silently in place — no loading skeleton or flash on auto-refresh. Numbers just change
- If auto-refresh fails while showing existing data: keep stale data visible, show warning, retry sooner (30 seconds) instead of waiting for the full interval
- Auto-refresh pauses when the app window is not visible (minimized/background). Resumes immediately when window becomes visible, triggering an immediate refresh if interval has elapsed
- Auto-refresh updates everything together — current conditions and hourly forecast in one API call

### Refresh interval configuration
- Configurable in SettingsModal — dropdown with options (1, 5, 10, 15, 30 minutes)
- AppSettings.refreshInterval field already exists — just needs UI control

### Location switch behavior
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WeatherIcon` component: Renders Lucide icons with neon drop-shadow glow — use for hourly weather condition icons (smaller size)
- `ConditionCard` component: Neon-bordered card with icon/label/value — reference for styling consistency, but hourly strip needs a more compact layout
- `SkeletonLoader` (WeatherSkeleton, ConditionCardSkeleton): Existing skeleton patterns — extend with HourlyStripSkeleton
- `weatherCodeMap.ts` / `getWeatherDisplay()`: Maps weather codes to Lucide icons + labels — reuse for hourly icons
- `useSettings` hook: Already loads/persists `refreshInterval` from electron-store — just needs SettingsModal UI

### Established Patterns
- Tailwind CSS with neon theme (cyan/magenta color palette, cyber-grid background, glow effects)
- Font: Inter (sans) for UI, JetBrains Mono (mono) for data values
- State management: React hooks (useState, useEffect, useCallback) — no external state library
- Data fetching: `window.electronAPI.fetchWeather()` IPC bridge to main process → Open-Meteo API
- Error handling: retry with exponential backoff in `useWeather`, stale data warning pattern

### Integration Points
- `WeatherPanel.tsx`: Main display component — hourly strip slots between hero section and ConditionsGrid
- `useWeather.ts`: Needs to return hourly data alongside current conditions, add auto-refresh timer logic
- `src/main/weather.ts`: Open-Meteo API client — needs `hourly` params added (temperature_2m, weather_code, precipitation_probability)
- `AppSettings` type in `types.ts`: `refreshInterval` already defined
- `SettingsModal.tsx`: Needs new dropdown control for refresh interval
- `App.tsx`: Passes settings to useWeather — no structural changes needed

</code_context>

<specifics>
## Specific Ideas

- Forecast strip should feel like iOS Weather's hourly row — compact, scannable, horizontal scroll
- Silent data swap on refresh — like a live dashboard, not a page reload
- "Now" label on first column instead of clock time — immediately clear which hour is current

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-hourly-forecast-auto-refresh*
*Context gathered: 2026-03-02*
