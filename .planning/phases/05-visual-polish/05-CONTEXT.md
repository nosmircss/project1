# Phase 5: Visual Polish - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Animated weather particle effects matching current conditions, and smooth location-switch transitions. The app delivers an immersive sci-fi experience where particles visually represent the weather, and switching locations produces a smooth visual transition rather than an abrupt content swap.

</domain>

<decisions>
## Implementation Decisions

### Particle visual style
- **D-01:** Stylized neon aesthetic — particles match the existing sci-fi design system, not realistic weather
- **D-02:** Rain rendered as thin cyan streaks with glow, snow as soft white dots with subtle bloom, fog as drifting translucent cyan layers
- **D-03:** Particle intensity scales with WMO weather severity — light drizzle = sparse particles, heavy rain = dense fast streaks. WMO codes distinguish light/moderate/heavy for rain, drizzle, and snow
- **D-04:** HTML Canvas 2D with requestAnimationFrame loop — zero dependencies, ~80-120 particles max

### Particle layer placement
- **D-05:** Canvas covers the main WeatherPanel area only (right side) — sidebar stays clean and unobstructed
- **D-06:** Particles render in front of content at low opacity (~15-25%) with pointer-events: none — rain/snow visually falls "over" the data for maximum immersion

### Weather-to-effect mapping
- **D-07:** Clear sky / partly cloudy: subtle ambient particles — day: warm golden motes, night: slow-drifting star-like specks. Canvas is always alive, never empty
- **D-08:** Thunderstorms: heavy rain particles + periodic full-canvas lightning flash (brief white/cyan opacity pulse). Dramatic, fits the neon aesthetic
- **D-09:** Fog effect: Claude's discretion (drifting horizontal layers or floating wisps — whatever looks best on canvas with the neon theme)

### Location switch transition
- **D-10:** Opacity crossfade (200-300ms) when switching locations — content fades out, new data loads, fades back in
- **D-11:** Particle effect transitions with a brief pause/restart during location switch
- **D-12:** Which elements stay fixed during crossfade: Claude's discretion (sidebar always fixed; header behavior flexible)

### Claude's Discretion
- Exact particle opacity values and glow intensities
- Fog effect implementation (layers vs wisps)
- Header behavior during crossfade (fixed or transitions with content)
- Lightning flash frequency and duration
- Particle spawn/despawn patterns on weather code changes
- Canvas resize handling on window resize
- Exact crossfade easing curve and duration tuning
- Performance optimization details (particle pooling, off-screen culling)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Weather code mapping
- `src/renderer/src/lib/weatherCodeMap.ts` — WMO code to icon/label mapping; defines the weather condition categories that drive particle effects

### Design system
- `src/renderer/src/styles/main.css` — Neon theme tokens (@theme), glow utilities (@utility), cyber-grid background pattern; particles must use these colors

### Integration target
- `src/renderer/src/components/WeatherPanel.tsx` — Main display component where canvas overlay and crossfade transition will be integrated
- `src/renderer/src/hooks/useWeather.ts` — Provides weatherCode and isDay that drive particle effect selection

### Prior phase patterns
- `.planning/phases/04-hourly-forecast-auto-refresh/04-CONTEXT.md` — Established patterns for silent data updates and component integration in WeatherPanel

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getWeatherDisplay(code, isDay)` in `weatherCodeMap.ts`: Maps WMO codes to categories — reuse the same code ranges to map to particle effects
- `useInterval` hook: Could drive particle system tick, but RAF loop is more appropriate for smooth animation
- Neon theme tokens in `main.css`: `--color-neon-cyan: #00f0ff`, `--color-neon-magenta: #ff00e5`, glow utilities — particle colors should reference these
- `cyber-grid` utility: Background pattern already in use — particles layer on top of this

### Established Patterns
- Tailwind CSS v4 with @theme tokens and @utility classes — new glow effects should follow this pattern
- React hooks for state management (useState, useEffect, useCallback, useRef) — canvas component will use useRef for canvas element and useEffect for RAF lifecycle
- Component structure: WeatherPanel orchestrates sub-components — canvas overlay would be a sibling or child component

### Integration Points
- `WeatherPanel.tsx`: Canvas overlay component mounts inside the `<main>` element, positioned absolute over content
- `WeatherPanel.tsx`: `weather.weatherCode` and `weather.isDay` drive particle effect selection
- `App.tsx`: Location switch triggers `loading` state — crossfade wraps the transition between old and new weather data
- `useWeather.ts`: Returns `loading` boolean that signals when location switch is in progress

</code_context>

<specifics>
## Specific Ideas

- Particles should feel native to the neon aesthetic — not a weather overlay bolted onto a sci-fi app, but an integral part of the visual experience
- Clear sky ambient particles (golden motes day, starry specks night) keep the canvas alive even in good weather — the app always feels dynamic
- Lightning flash as a full-canvas cyan/white pulse is the most dramatic effect — should feel like a brief screen flicker
- The crossfade should be subtle enough that it feels polished, not theatrical — 200-300ms opacity transition, not a slow dissolve

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-visual-polish*
*Context gathered: 2026-04-10*
