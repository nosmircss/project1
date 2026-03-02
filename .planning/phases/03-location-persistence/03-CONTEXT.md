# Phase 3: Location Persistence - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Saved locations survive app restarts via electron-conf IPC. Full add/switch/delete lifecycle. Users can save multiple zip code locations, switch between them, and delete any saved location. This phase establishes the stable location data layer that all subsequent phases depend on.

</domain>

<decisions>
## Implementation Decisions

### Delete interaction
- Hover X button appears on the right side of a location row on hover
- No confirmation dialog — instant delete on click
- X button appears on all locations including the currently active one
- X button style: dim by default, neon-red glow on hover (matches error color in design system)

### Startup & active location
- App remembers the last viewed location and resumes there on restart
- Skip WelcomeScreen entirely when saved locations exist — go straight to sidebar + weather
- Deleting the active location selects the next location in the list; if the deleted location was last, select the one above it

### Location list limits
- No hard cap on saved locations — sidebar scrolls
- Duplicate zip codes rejected with "Already saved" inline error message on the add input

### Empty state (last location deleted)
- When the last saved location is deleted, show empty sidebar state — NOT the WelcomeScreen
- Sidebar stays visible with "No locations saved" message and add prompt in the main panel
- WelcomeScreen only appears on true first launch (no saved locations have ever existed)

### Claude's Discretion
- Exact empty state layout and copy
- electron-conf schema design for locations storage
- IPC channel naming conventions for location CRUD
- How to persist "last active location" (index vs zip identifier)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key behavior: the app should feel instant on restart, loading the last viewed location's weather immediately.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LocationInfo` type (`src/renderer/src/lib/types.ts`): Already has zip, city, stateCode, lat, lon, displayName — perfect for persistence shape
- `electron-conf` singleton (`src/main/settings.ts`): Settings persistence pattern already established — extend or create parallel conf for locations
- `resolveZip()` (`src/renderer/src/lib/zipLookup.ts`): Zip-to-LocationInfo resolver used by both WelcomeScreen and Sidebar
- `Sidebar` component: Already renders location list with selection and inline add — needs delete affordance added
- `WelcomeScreen` component: Currently shows when `locations.length === 0` — logic needs updating for empty-state-vs-first-launch distinction

### Established Patterns
- Main process: `electron-conf` singleton for persistence, IPC handlers registered in `src/main/index.ts`
- Preload bridge: Named methods via `contextBridge.exposeInMainWorld('electronAPI', {...})` — no raw ipcRenderer exposure
- Renderer hooks: `useWeather`, `useSettings` pattern — new `useLocations` hook would follow same convention
- State management: React useState in App.tsx lifted to parent, passed as props

### Integration Points
- `App.tsx`: `locations` state (`useState<LocationInfo[]>([])`) must become persistence-backed
- `App.tsx`: `activeIndex` state must persist as "last viewed" across restarts
- `src/preload/index.ts`: Needs new IPC methods for location CRUD (getLocations, addLocation, deleteLocation, etc.)
- `src/main/index.ts`: Needs new IPC handlers wired to electron-conf location store

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-location-persistence*
*Context gathered: 2026-03-01*
