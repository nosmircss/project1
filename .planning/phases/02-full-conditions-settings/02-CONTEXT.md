# Phase 2: Full Conditions + Settings - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand weather display with full current conditions (wind, humidity, UV index, pressure, sunrise/sunset) and add user-configurable unit settings (temperature F/C, wind speed mph/km/h) that persist across restarts. Also includes configurable auto-refresh interval.

</domain>

<decisions>
## Implementation Decisions

### Conditions layout
- 2-column grid of cards below the temperature hero
- Each card shows one metric with icon + value
- Subtle neon borders (faint cyan at low opacity), glow effect on hover only — hero temp stays the clear focal point
- 6 metrics total: wind, humidity, UV index, pressure, sunrise, sunset

### Settings panel
- Gear icon in the top-right of the main panel (header area)
- Opens a modal/overlay on top of the weather content
- Contains unit toggles (F/C, mph/km/h) and auto-refresh interval

### Unit switching
- Toggles live exclusively in the settings modal — no inline clicking on values
- Temperature: Fahrenheit / Celsius toggle
- Wind speed: mph / km/h toggle
- Changes apply immediately and persist after restart

### Data presentation
- Wind direction: compass format ("NW", "SSE") — not degrees
- Sunrise/sunset times: follow system locale (12h or 24h based on user's OS setting)

### Claude's Discretion
- UV index display format (number only vs number + risk label with color coding)
- Sunrise/sunset card treatment (one wide card spanning grid vs two separate cards)
- Settings modal visual style (full overlay vs centered card vs slide-in drawer)
- Neon color treatment for condition card icons and values
- Exact grid spacing and card sizing

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WeatherPanel` (src/renderer/src/components/WeatherPanel.tsx): Main display area, currently shows icon + temp hero. Grid of condition cards will be added below the hero section.
- `WeatherIcon` component: Lucide icon wrapper with neon glow. Can be reused for condition card icons.
- `SkeletonLoader`: Pulsing neon skeletons. Need to extend for condition card loading states.
- `ErrorCard`: Retry-capable error display. Already handles refetch.
- Neon design system (src/renderer/src/styles/main.css): `@theme` tokens (cyan, magenta), `@utility` glow classes, `neon-text-glow-*` utilities.

### Established Patterns
- IPC bridge pattern: main process fetches data, preload exposes via `contextBridge`, renderer calls `window.electronAPI.*`
- `useWeather` hook manages loading/error/data state per location
- Open-Meteo API client (src/main/weather.ts) currently fetches only `temperature_2m`, `apparent_temperature`, `weather_code`, `is_day`. Needs to add wind, humidity, UV, pressure, sunrise/sunset params.
- Types in `src/renderer/src/lib/types.ts`: `WeatherData` interface needs expanding with new fields
- Temperature unit currently hardcoded to `fahrenheit` in API params — needs to become dynamic based on settings

### Integration Points
- `src/main/weather.ts`: Add new Open-Meteo params (`wind_speed_10m`, `wind_direction_10m`, `relative_humidity_2m`, `uv_index`, `surface_pressure`, plus `daily: sunrise,sunset`)
- `src/main/index.ts`: Add IPC handler for settings persistence (using `electron-conf` already installed)
- `src/preload/index.ts`: Expose settings read/write methods
- `src/renderer/src/components/WeatherPanel.tsx`: Add condition cards grid below existing hero section
- Settings gear icon placement: needs a header/toolbar area in the main panel (doesn't exist yet)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-full-conditions-settings*
*Context gathered: 2026-03-01*
