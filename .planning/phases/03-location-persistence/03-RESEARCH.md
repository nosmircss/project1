# Phase 3: Location Persistence - Research

**Researched:** 2026-03-01
**Domain:** Electron IPC + electron-conf persistence + React state management
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Delete interaction:**
- Hover X button appears on the right side of a location row on hover
- No confirmation dialog — instant delete on click
- X button appears on all locations including the currently active one
- X button style: dim by default, neon-red glow on hover (matches error color in design system)

**Startup & active location:**
- App remembers the last viewed location and resumes there on restart
- Skip WelcomeScreen entirely when saved locations exist — go straight to sidebar + weather
- Deleting the active location selects the next location in the list; if the deleted location was last, select the one above it

**Location list limits:**
- No hard cap on saved locations — sidebar scrolls
- Duplicate zip codes rejected with "Already saved" inline error message on the add input

**Empty state (last location deleted):**
- When the last saved location is deleted, show empty sidebar state — NOT the WelcomeScreen
- Sidebar stays visible with "No locations saved" message and add prompt in the main panel
- WelcomeScreen only appears on true first launch (no saved locations have ever existed)

### Claude's Discretion
- Exact empty state layout and copy
- electron-conf schema design for locations storage
- IPC channel naming conventions for location CRUD
- How to persist "last active location" (index vs zip identifier)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOC-01 | User can save multiple zip code locations that persist across app restarts | electron-conf `locations` store with array of LocationInfo; `useLocations` hook loads on mount |
| LOC-02 | User can switch to any saved location with one click, and both current conditions and hourly forecast update immediately | `activeZip` persisted in electron-conf; `useLocations` exposes `setActive(zip)` which persists + updates React state; `useWeather` re-fetches when activeLocation changes |
| LOC-03 | User can delete a saved location — it is removed and no longer appears after restart | `locations:delete` IPC handler removes from conf array; renderer state updates; deletion persisted to disk immediately |
| LOC-04 | Deleting the active location selects the next available location or returns to empty/welcome state | Deletion logic in `useLocations`: if deleted was active, select next (or previous if last); if list becomes empty, clear active |
</phase_requirements>

## Summary

Phase 3 adds location persistence using the already-installed `electron-conf` package (v1.3.0). The project already has a working `electron-conf` singleton (`src/main/settings.ts`) and established IPC patterns. This phase extends that pattern with a separate `locations.json` conf file storing an array of `LocationInfo` objects plus a `lastActiveZip` string.

The renderer side introduces a `useLocations` hook that mirrors the existing `useSettings` hook — it loads locations on mount via IPC, exposes `addLocation`, `deleteLocation`, and `setActiveZip` mutators, and maintains local React state for instant UI updates. `App.tsx` wires this hook and replaces the current `useState<LocationInfo[]>([])` with the persistence-backed version.

The first-launch vs empty-state distinction (locked decision) is best implemented by tracking `hasLaunched` in the locations conf or simply by whether `lastActiveZip` has ever been written. The cleanest approach: the locations conf has a `hasLaunched: boolean` flag that becomes `true` after the first location is ever saved. This is simpler and more explicit than inferring from other state.

**Primary recommendation:** Create a separate `src/main/locations.ts` conf file with `{ locations: LocationInfo[], lastActiveZip: string | null, hasLaunched: boolean }`, add four IPC handlers (`locations:get-all`, `locations:add`, `locations:delete`, `locations:set-active`), and implement a `useLocations` hook in the renderer following the `useSettings` pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron-conf | 1.3.0 (installed) | JSON persistence for Electron main process | Already used by settings.ts; singleton pattern established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React useState | (built-in, React 19) | Local optimistic UI state in useLocations hook | Instant UI response before IPC round-trip |
| React useEffect | (built-in, React 19) | Load initial locations on hook mount | One-time load from main process on app start |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate locations conf file | Extend existing settings conf | Extending settings conf violates single-responsibility and risks type conflicts; separate file is cleaner |
| lastActiveZip (string identifier) | lastActiveIndex (number) | Index is fragile if locations are ever reordered or when an item is deleted; zip string is a stable identity |
| IPC handlers in main/index.ts | Inline in locations.ts module | Putting handlers in index.ts is the existing pattern and keeps main/index.ts as the single IPC registration point |

**Installation:**
```bash
# No new installs needed — electron-conf@1.3.0 already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── index.ts          # Add locations:* IPC handler registrations here
│   ├── locations.ts      # NEW: Conf singleton + LocationsStore type
│   └── settings.ts       # Existing — unchanged
├── preload/
│   ├── index.ts          # Add 4 new electronAPI methods
│   └── index.d.ts        # Update Window.electronAPI type declarations
└── renderer/src/
    ├── App.tsx            # Replace useState with useLocations hook
    ├── hooks/
    │   ├── useLocations.ts  # NEW: mirrors useSettings pattern
    │   └── useSettings.ts   # Existing — unchanged
    └── components/
        ├── Sidebar.tsx      # Add delete X button, duplicate error, empty state
        └── WelcomeScreen.tsx # Gate on hasLaunched flag, not locations.length
```

### Pattern 1: Separate electron-conf Store for Location Data

**What:** Create a second `Conf` instance in `src/main/locations.ts` separate from the existing `settings.ts` conf. This writes to `locations.json` alongside `settings.json` in Electron's userData directory.

**When to use:** When persisting data that is conceptually separate from app settings (locations are user data, not preferences).

**Example:**
```typescript
// src/main/locations.ts
// Source: electron-conf README + existing settings.ts pattern in this project
import { Conf } from 'electron-conf/main'
import type { LocationInfo } from '../renderer/src/lib/types'

// Duplicated interface (cross-process import not safe at runtime)
export interface LocationsStore {
  locations: LocationInfo[]
  lastActiveZip: string | null
  hasLaunched: boolean
}

const DEFAULTS: LocationsStore = {
  locations: [],
  lastActiveZip: null,
  hasLaunched: false
}

// Singleton — electron-conf does NOT support multiple instances on same file
export const locationsConf = new Conf<LocationsStore>({
  name: 'locations',
  defaults: DEFAULTS
})
```

### Pattern 2: IPC Handler Registration (follows existing namespace:verb convention)

**What:** Register location CRUD IPC handlers in `src/main/index.ts` alongside existing `weather:fetch`, `settings:get`, `settings:set`. Use `locations:` namespace per project convention.

**When to use:** Any new persistence operation from renderer.

**Example:**
```typescript
// src/main/index.ts — add inside app.whenReady().then(...)
// Source: existing ipcMain.handle patterns in this file
import { locationsConf } from './locations'
import type { LocationInfo } from '../renderer/src/lib/types'  // type-only import

ipcMain.handle('locations:get-all', () => locationsConf.get('locations'))

ipcMain.handle('locations:add', (_event, location: LocationInfo) => {
  const current = locationsConf.get('locations')
  // Duplicate check (belt-and-suspenders; renderer also checks)
  if (current.some((l) => l.zip === location.zip)) return { error: 'duplicate' }
  locationsConf.set('locations', [...current, location])
  locationsConf.set('hasLaunched', true)
  locationsConf.set('lastActiveZip', location.zip)
  return { ok: true }
})

ipcMain.handle('locations:delete', (_event, zip: string) => {
  const current = locationsConf.get('locations')
  locationsConf.set('locations', current.filter((l) => l.zip !== zip))
})

ipcMain.handle('locations:set-active', (_event, zip: string | null) => {
  locationsConf.set('lastActiveZip', zip)
})

ipcMain.handle('locations:get-meta', () => ({
  lastActiveZip: locationsConf.get('lastActiveZip'),
  hasLaunched: locationsConf.get('hasLaunched')
}))
```

### Pattern 3: useLocations Hook (mirrors useSettings)

**What:** Renderer-side hook that loads locations on mount, exposes mutators, and maintains optimistic local state. Mirrors `useSettings` exactly.

**When to use:** Whenever renderer needs to read or write the locations store.

**Example:**
```typescript
// src/renderer/src/hooks/useLocations.ts
// Source: mirrors useSettings.ts pattern established in this project
import { useState, useEffect } from 'react'
import type { LocationInfo } from '../lib/types'

interface UseLocationsResult {
  locations: LocationInfo[]
  activeZip: string | null
  hasLaunched: boolean
  loaded: boolean
  addLocation: (location: LocationInfo) => Promise<{ error?: string }>
  deleteLocation: (zip: string) => Promise<void>
  setActiveZip: (zip: string | null) => Promise<void>
}

export function useLocations(): UseLocationsResult {
  const [locations, setLocations] = useState<LocationInfo[]>([])
  const [activeZip, setActiveZipState] = useState<string | null>(null)
  const [hasLaunched, setHasLaunched] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    Promise.all([
      api.getLocations(),
      api.getLocationsMeta()
    ]).then(([locs, meta]) => {
      setLocations(locs)
      setActiveZipState(meta.lastActiveZip)
      setHasLaunched(meta.hasLaunched)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const addLocation = async (location: LocationInfo) => {
    // Duplicate check in renderer (fast, no IPC round-trip needed for validation)
    if (locations.some((l) => l.zip === location.zip)) {
      return { error: 'Already saved' }
    }
    const result = await window.electronAPI.addLocation(location)
    if (!result?.error) {
      setLocations((prev) => [...prev, location])
      setActiveZipState(location.zip)
      setHasLaunched(true)
    }
    return result ?? {}
  }

  const deleteLocation = async (zip: string) => {
    // Compute next active before mutating
    const idx = locations.findIndex((l) => l.zip === zip)
    const newLocations = locations.filter((l) => l.zip !== zip)
    let nextActive: string | null = null
    if (newLocations.length > 0) {
      // Select next item; if deleted was last, select the one above it
      const nextIdx = idx < newLocations.length ? idx : newLocations.length - 1
      nextActive = newLocations[nextIdx].zip
    }
    // Optimistic update
    setLocations(newLocations)
    setActiveZipState(nextActive)
    // Persist
    await window.electronAPI.deleteLocation(zip)
    await window.electronAPI.setActiveLocation(nextActive)
  }

  const setActiveZip = async (zip: string | null) => {
    setActiveZipState(zip)
    await window.electronAPI.setActiveLocation(zip)
  }

  return { locations, activeZip, hasLaunched, loaded, addLocation, deleteLocation, setActiveZip }
}
```

### Pattern 4: App.tsx Startup Logic

**What:** Replace `useState<LocationInfo[]>([])` with `useLocations`. Gate WelcomeScreen on `hasLaunched`, not `locations.length`. Show empty-sidebar state when `hasLaunched && locations.length === 0`.

**Example:**
```typescript
// src/renderer/src/App.tsx
const { locations, activeZip, hasLaunched, loaded: locationsLoaded,
        addLocation, deleteLocation, setActiveZip } = useLocations()

// Derive activeLocation from activeZip
const activeLocation = locations.find((l) => l.zip === activeZip) ?? locations[0] ?? null

// Gate weather fetch on both settings AND locations loaded
const { weather, loading, error, refetch } = useWeather(
  settingsLoaded && locationsLoaded ? activeLocation : null,
  settings
)

// Startup routing
if (!locationsLoaded) return <LoadingSpinner />       // brief flash
if (!hasLaunched) return <WelcomeScreen ... />        // true first launch
if (locations.length === 0) return <EmptyState ... /> // all deleted
return <SidebarLayout ... />                          // normal
```

### Anti-Patterns to Avoid

- **Multiple Conf instances on same file:** electron-conf README explicitly warns "does not support multiple instances reading and writing the same configuration file." One `locationsConf` singleton, imported everywhere needed.
- **Using index as active location identifier:** Index becomes incorrect when items are deleted. Use `lastActiveZip` (the zip string) as the stable identifier.
- **Storing activeIndex in renderer state only:** If only in React state, app restart loses the active location. Always persist `lastActiveZip` to conf on every selection change.
- **Checking `locations.length === 0` to show WelcomeScreen:** Conflates "never used the app" with "deleted all locations". Use the `hasLaunched` flag for the WelcomeScreen gate.
- **Async IPC in optimistic UI path:** Mutate local React state first (instant UI), then await IPC. Never await before updating state — creates visible lag.
- **Cross-process runtime imports:** Do not import renderer types at main-process runtime. Use `type` imports (TypeScript-only) or duplicate the interface in `main/locations.ts` as the existing `settings.ts` does.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON persistence across restarts | Manual fs.writeFile/readFile + path management | electron-conf `new Conf({ name: 'locations' })` | Handles userData path, atomic writes, JSON serialization, schema validation, migrations |
| Unique location identity | Custom UUID or index system | zip code string as natural key | Zip is already the user-facing ID; already stored in LocationInfo |
| Data migrations | Version detection and migration scripts | electron-conf `migrations` option | Built-in versioned migration hooks if schema ever changes |

**Key insight:** electron-conf is already installed and the settings.ts pattern is fully proven in this codebase. The locations store is just a second instance of the same pattern.

## Common Pitfalls

### Pitfall 1: WelcomeScreen vs Empty State Logic Confusion

**What goes wrong:** Using `locations.length === 0` to show WelcomeScreen causes WelcomeScreen to reappear every time the user deletes all locations.

**Why it happens:** The locked decision distinguishes "never launched" (WelcomeScreen) from "deleted all" (empty sidebar state). Without a `hasLaunched` flag, there is no way to tell these states apart from `locations.length === 0`.

**How to avoid:** Persist a `hasLaunched: boolean` in the locations conf. Set it to `true` when the first location is ever saved. Use it as the WelcomeScreen gate. Never reset it.

**Warning signs:** WelcomeScreen appearing unexpectedly after a delete — means the flag is missing or being reset.

### Pitfall 2: Active Location Index vs Zip Drift

**What goes wrong:** Persisting `lastActiveIndex: number` causes the wrong location to be selected after a deletion (indices shift) or on future reorder.

**Why it happens:** Array indices are positional, not identities. Deleting item 0 makes the old item 1 now item 0.

**How to avoid:** Persist `lastActiveZip: string | null`. Derive the active index in the renderer: `const activeIdx = locations.findIndex(l => l.zip === activeZip)`.

**Warning signs:** After deleting a location, the wrong location is shown as active.

### Pitfall 3: Race Condition — Fetching Weather Before Locations Load

**What goes wrong:** `useWeather` fires with `null` or stale location before `useLocations` finishes its initial IPC call. This causes a spurious API fetch (or fetch with wrong location).

**Why it happens:** Both hooks start their async loads in `useEffect` on mount. The weather hook depends on the active location, which isn't known until locations load.

**How to avoid:** Gate `useWeather` on `locationsLoaded` exactly as it is already gated on `settingsLoaded`. Pass `null` as the location argument until loaded is true. The existing `useWeather` hook already skips fetch when location is null.

**Warning signs:** Network tab shows two fetches on startup, or wrong location's weather appears briefly.

### Pitfall 4: Stale Closure in Delete Handler

**What goes wrong:** `deleteLocation` captures a stale `locations` array from a closure, computing the wrong `nextActive` zip.

**Why it happens:** If `deleteLocation` is defined outside the hook's state update path without referencing current state, it uses the initial snapshot.

**How to avoid:** Either read locations from state via the closure (since the hook rerenders correctly), or use `setLocations((prev) => ...)` functional form to always work with current state. The pattern shown in Pattern 3 above uses the closure value which is safe since it's synchronous before any await.

**Warning signs:** After deleting, the wrong location is selected, or the selected location is the one that was just deleted.

### Pitfall 5: Type Duplication for Cross-Process Safety

**What goes wrong:** Importing `LocationInfo` from renderer types into main process code causes runtime module resolution errors in the compiled Electron output.

**Why it happens:** Renderer code is bundled separately from main process code. Cross-bundle imports fail at runtime even if TypeScript compiles them correctly.

**How to avoid:** Use `import type { LocationInfo }` (type-only import erased at compile time) OR duplicate the interface in `main/locations.ts` as the existing `settings.ts` does for `AppSettings`. The `import type` approach is cleaner and safe.

**Warning signs:** Runtime error like "Cannot find module" or "require is not defined" in main process.

## Code Examples

Verified patterns from official sources (electron-conf v1.3.0 TypeScript definitions):

### Creating a New Conf Store

```typescript
// Source: electron-conf/dist/main.d.ts (installed package) + settings.ts pattern
import { Conf } from 'electron-conf/main'

export interface LocationsStore {
  locations: LocationInfo[]
  lastActiveZip: string | null
  hasLaunched: boolean
}

export const locationsConf = new Conf<LocationsStore>({
  name: 'locations',            // writes to <userData>/locations.json
  defaults: {
    locations: [],
    lastActiveZip: null,
    hasLaunched: false
  }
})
```

### Reading and Writing Arrays

```typescript
// Source: electron-conf README — .get() / .set() API
const current = locationsConf.get('locations')          // LocationInfo[]
locationsConf.set('locations', [...current, newLocation]) // full array replace
locationsConf.set('lastActiveZip', location.zip)
```

### Preload Bridge Methods (4 new methods)

```typescript
// src/preload/index.ts — extend existing contextBridge.exposeInMainWorld
contextBridge.exposeInMainWorld('electronAPI', {
  // existing
  fetchWeather: (...) => ipcRenderer.invoke('weather:fetch', ...),
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  // new
  getLocations: () => ipcRenderer.invoke('locations:get-all'),
  getLocationsMeta: () => ipcRenderer.invoke('locations:get-meta'),
  addLocation: (location) => ipcRenderer.invoke('locations:add', location),
  deleteLocation: (zip) => ipcRenderer.invoke('locations:delete', zip),
  setActiveLocation: (zip) => ipcRenderer.invoke('locations:set-active', zip)
})
```

### Hover Delete Button in Sidebar (CSS group pattern)

```typescript
// Sidebar location row — uses Tailwind group/group-hover
<div className="group relative flex items-center ...">
  <button onClick={() => onSelect(idx)} className="flex-1 ...">
    {/* existing location display */}
  </button>
  <button
    onClick={(e) => { e.stopPropagation(); onDelete(loc.zip) }}
    className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-error
               hover:neon-glow-error transition-all px-2 py-1 shrink-0"
    aria-label={`Delete ${loc.displayName}`}
  >
    ×
  </button>
</div>
```

### Empty State Routing in App.tsx

```typescript
// Three distinct render paths:
if (!locationsLoaded) return <LoadingSpinner />

if (!hasLaunched) {
  // True first launch — full-screen WelcomeScreen, no sidebar
  return <div className="h-screen flex bg-bg-dark cyber-grid overflow-hidden">
    <WelcomeScreen onLocationAdd={handleAdd} />
  </div>
}

if (locations.length === 0) {
  // Returned to empty — sidebar visible, empty panel message
  return <div className="h-screen flex bg-bg-dark cyber-grid overflow-hidden">
    <Sidebar locations={[]} activeIndex={-1} onSelect={() => {}} onAdd={handleAdd} onDelete={() => {}} />
    <EmptyStatePanel onAdd={handleAdd} />
  </div>
}

// Normal state — sidebar + weather
return <div className="h-screen flex bg-bg-dark cyber-grid overflow-hidden">
  <Sidebar ... />
  <WeatherPanel ... />
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| electron-store (sindresorhus) | electron-conf (fork, lighter) | This project from start | Same API surface, fewer dependencies, ~100x faster reads (caches in memory) |
| Per-key IPC (`settings:get` per field) | Batch load on mount | Phase 2 settings pattern | Fewer IPC round-trips on startup |

**Deprecated/outdated:**
- Raw `localStorage` in Electron renderer: Survives sessions but lost on app reinstall, not in userData, no schema validation. Use electron-conf.
- `ipcRenderer.send` / `ipcMain.on` for request-response: Use `ipcRenderer.invoke` / `ipcMain.handle` (the existing pattern) for cleaner async request-response.

## Open Questions

1. **EmptyStatePanel — new component or inline in App.tsx?**
   - What we know: The empty state is a sidebar + panel layout, distinct from WelcomeScreen
   - What's unclear: Whether a dedicated `EmptyStatePanel` component is needed vs. inline JSX in App.tsx
   - Recommendation: If copy is >5 lines, extract to `EmptyStatePanel.tsx` for clarity. If trivial, inline is fine. Leave to planner's discretion.

2. **Loading flash on startup**
   - What we know: There's a brief period where `locationsLoaded` is false; showing nothing causes a flash
   - What's unclear: Whether the existing app has a loading state that can be reused
   - Recommendation: Check if `SkeletonLoader.tsx` covers this case. If not, a simple `opacity-0` or minimal loading div avoids visible content pop.

3. **TypeScript: `window.electronAPI` shape declaration**
   - What we know: The current `preload/index.d.ts` declares `Window` with `electron` and `api` but NOT `electronAPI`
   - What's unclear: Where the current `electronAPI` type is declared (the build may infer it from context)
   - Recommendation: Add explicit `electronAPI` interface to `src/preload/index.d.ts` with all methods to get proper type checking in the renderer.

## Sources

### Primary (HIGH confidence)
- `/home/chris/claude/project1/node_modules/electron-conf/dist/main.d.ts` — Full TypeScript API including Conf constructor options, get/set/delete signatures, singleton constraint warning
- `/home/chris/claude/project1/node_modules/electron-conf/README.md` — Usage patterns, constructor options, method reference
- Existing project code: `src/main/settings.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/src/hooks/useSettings.ts` — establishes patterns this phase extends

### Secondary (MEDIUM confidence)
- electron-conf README warning: "does not support multiple instances reading and writing the same configuration file" — verified in README, guides singleton pattern
- React 19 hooks (`useState`, `useEffect`) — stable API, well-known

### Tertiary (LOW confidence)
- None — all claims verified from installed package source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — electron-conf already installed, API read from installed TypeScript types
- Architecture: HIGH — patterns derived from existing project code (`settings.ts`, `useSettings`, IPC handlers)
- Pitfalls: HIGH for index-drift and WelcomeScreen logic (verified by reading existing App.tsx); MEDIUM for type-import pitfall (common Electron pattern)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (electron-conf is stable; project patterns are fixed)
