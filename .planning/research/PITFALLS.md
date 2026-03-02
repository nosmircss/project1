# Pitfalls Research

**Domain:** Electron + React weather app — adding auto-refresh, hourly forecast, multi-location, canvas particles, and Windows installer to existing v1.0
**Researched:** 2026-03-01
**Confidence:** HIGH for Electron timer/IPC patterns (verified against official Electron docs and GitHub issues); MEDIUM for particle animation GPU behavior (Chromium compositor behavior, confirmed via Electron issues and web sources); HIGH for electron-builder packaging (verified against official docs); HIGH for Open-Meteo hourly API (official docs)

---

## Critical Pitfalls

### Pitfall 1: Auto-Refresh Timer Fires While Previous Fetch Is Still In-Flight

**What goes wrong:**
The existing `useWeather` hook fires a fetch on every `location`/`settings` change via `useEffect`. When a refresh timer is wired up alongside this, rapid conditions (app restore after being minimized, settings change mid-interval, or Electron's background throttling releasing all deferred ticks at once) can trigger two fetches for the same location simultaneously. The second fetch resolves and overwrites state with a possibly-stale response; if the first resolves last, the UI reverts to an older snapshot. On Open-Meteo the result is cosmetic, but the doubled API traffic burns quota unnecessarily.

**Why it happens:**
The current `useWeather` hook has no in-flight guard. `useCallback` with the current dependency list re-creates `fetch` when settings change, but the timer callback captures the old closure. The `refetch` function in `useWeather` calls `fetchWithRetry` directly without any mutex — so a timer tick arriving while `loading === true` simply starts a parallel request.

**How to avoid:**
- Add an `isLoadingRef = useRef(false)` guard at the top of `useWeather`. Check it at the top of `refetch`; skip the fetch if already in flight. This is a ref (not state) so it does not trigger re-renders.
- When wiring the auto-refresh timer, always drive it through the existing `refetch` callback — not a new `fetch` call — so the in-flight guard is shared.
- Do not start the interval until `settingsLoaded === true` and `location !== null`. Currently the settings gate in `App.tsx` prevents the initial double-fetch; extend the same gate to the timer.

**Warning signs:**
- Network tab shows two simultaneous requests to `api.open-meteo.com` for the same coordinates.
- Weather data briefly flickers or reverts to an older temperature after a refresh.
- Console shows "fetching weather" twice within the same tick.

**Phase to address:**
Auto-refresh phase. Extend `useWeather` with the in-flight guard before wiring the interval.

---

### Pitfall 2: Electron Background Throttling Stalls the Refresh Timer

**What goes wrong:**
`setInterval` in the renderer (React layer) is subject to Electron's `backgroundThrottling` setting, which defaults to `true`. When the window is minimized or hidden on Windows, Chromium throttles JavaScript timers — intervals that should fire every 5 minutes may fire at 1-minute minimum granularity at best, or batch-fire multiple missed ticks all at once when the window is restored. There are confirmed GitHub issues (electron/electron #4465, #31016) showing this behavior is inconsistent across Electron versions, and a specific bug (electron/electron #42378) where windows go blank after being hidden for several minutes when throttling is involved.

**Why it happens:**
The existing project sets no `backgroundThrottling` option in `createWindow()` in `src/main/index.ts`. The default is `true`. A developer testing with the window always visible never sees the misbehavior.

**How to avoid:**
- Set `backgroundThrottling: false` in `webPreferences` when creating `BrowserWindow`. This makes the visibility state remain `visible` even when minimized and keeps interval timing consistent.
- Alternatively, move the refresh timer to main process using `setInterval` in `src/main/index.ts` (Node.js, not subject to Chromium throttling) and push a refresh trigger to the renderer via `mainWindow.webContents.send('weather:refresh')`. Wire a listener in the preload and expose it via `contextBridge`. This is the more robust pattern.
- If keeping the timer in the renderer, listen for the `visibilitychange` event and skip the fetch if `document.hidden === true`, then fire a catch-up fetch immediately when `document.hidden` becomes `false`.

**Warning signs:**
- App minimized for 15+ minutes shows data that is stale by more than the configured refresh interval when restored.
- Console shows multiple "refresh" logs firing in rapid succession immediately after window restore (batched ticks releasing).
- CPU spikes briefly when restoring a minimized window.

**Phase to address:**
Auto-refresh phase. Decide on renderer-vs-main-process timer placement before writing any interval code.

---

### Pitfall 3: Locations State Is In-Memory Only — Lost on Restart

**What goes wrong:**
The current `App.tsx` holds `locations` in `useState<LocationInfo[]>([])`. This works for the current session but is wiped on every app restart. The v1.1 milestone requires saving and switching between multiple zip codes, which implies persistence. If locations are stored only in React state, every restart shows the welcome screen and users must re-enter all zip codes.

**Why it happens:**
The welcome screen path and location add flow in `App.tsx` never writes to `electron-conf`. The settings hook (`useSettings`) already has the IPC pattern (`settings:get` / `settings:set`) working. Developers may not realize the `locations` array needs the same treatment until users complain after restart.

**How to avoid:**
- Extend the existing `settings.ts` `Conf` schema (or add a second `Conf` instance named `locations`) to store `LocationInfo[]` as a JSON array. The `electron-conf` README explicitly warns: "does not support multiple instances reading and writing the same config file" — use separate named config files for settings vs. locations.
- Add two new IPC handlers: `locations:get` and `locations:set` (parallel to `settings:get` / `settings:set`). Expose them in the preload via `contextBridge` following the existing `namespace:verb` pattern the project already uses.
- On `App.tsx` startup, load saved locations before showing the welcome screen. Gate on an `locationsLoaded` flag just as `settingsLoaded` gates weather fetching. Without this gate, the welcome screen flashes briefly before persisted locations appear.
- The active location index should NOT be persisted — always default to index 0 on startup, so the user sees their primary location first.

**Warning signs:**
- After closing and reopening the app, the welcome screen appears instead of the last-viewed location.
- Locations array is populated in React state but network tab shows no `locations:get` IPC calls on startup.
- Settings persist but zip codes do not.

**Phase to address:**
Multi-location phase. Persistence must be designed before building the location switcher UI.

---

### Pitfall 4: Location Switch Triggers Stale Data Flash From Previous Location

**What goes wrong:**
When the user switches from location A to location B, `useWeather` detects the coordinate change via its dependency array and fires a new fetch. During the fetch, `weather` still holds location A's data (the hook initializes with the prior state). If the weather panel renders during this window — which it does, because `loading` is `true` but `weather !== null` — it briefly shows A's temperature and conditions under B's city name. The result is a jarring "Denver: 72°F (sunny)" flash while loading Seattle data.

**Why it happens:**
The existing `useWeather` hook never clears `weather` on location change. It only sets `loading = true` and fires the fetch. The "keep stale data on refresh failure" UX decision (from the existing code comments) is correct for auto-refresh, but wrong for an intentional location switch.

**How to avoid:**
- Distinguish between two fetch types: auto-refresh (keep stale data on failure) and location switch (clear immediately). The simplest approach: when the `location` dependency changes (new coordinates), set `setWeather(null)` before firing the fetch. This triggers the skeleton/loading state rather than the stale flash.
- The existing `useEffect` already runs on `location?.lat, location?.lon` change — add `setWeather(null)` as the first statement inside that effect before calling `fetch()`.
- If a CSS transition is added for location switches (smooth transition requirement in v1.1), the transition should start from the cleared/loading state, not from the previous location's data.

**Warning signs:**
- Switching zip codes shows the wrong city's temperature for 1-2 seconds before updating.
- City name header and temperature number disagree during a location switch.
- Skeleton loader never appears when switching locations because stale weather data keeps the panel in its "loaded" state.

**Phase to address:**
Multi-location phase. Fix the stale-flash behavior before building the transition animation, or the transition will animate the wrong data.

---

### Pitfall 5: Open-Meteo Hourly Array Starts at Local Midnight — Not Current Hour

**What goes wrong:**
The Open-Meteo `/v1/forecast` endpoint returns hourly data as an array starting at `00:00` local time today when `timezone=auto` is set. A 12-hour forecast displayed from the current time requires slicing the array to find the current hour index, not reading from index 0. Without this slice, the forecast panel shows hours from midnight onward, which includes hours in the past and makes the 12-hour display end before the correct future window.

The existing `weather.ts` already uses `timezone: 'auto'`. When `hourly` is added to the same request, the `hourly.time` array is an ISO 8601 string array in local time. The current hour must be located by comparing `hourly.time[i]` against the `current.time` field (already returned by the API and included in `WeatherData.time`). Off-by-one errors are common because the current `time` field is rounded to the 15-minute observation interval but the hourly array uses full hours.

**How to avoid:**
- Add `hourly` to the existing `URLSearchParams` in `weather.ts` alongside the existing `current` params. Include: `temperature_2m`, `weather_code`, `precipitation_probability`, `wind_speed_10m` (and optionally `apparent_temperature`). Keep `forecast_days: '1'` to limit response size.
- After receiving the response, find the current-hour index: `const now = new Date(current.time); const currentHour = now.getHours(); const startIndex = currentHour;` (the hourly array index equals the local hour number when `timezone=auto` is set and `forecast_days=1`).
- Slice the array from `startIndex` for 12 entries: `hourly.time.slice(startIndex, startIndex + 12)`. Handle edge cases where `startIndex + 12 > 24` by requesting `forecast_days: '2'` and allowing the slice to cross midnight.
- Verify units: the `hourly` section uses the same `temperature_unit` and `wind_speed_unit` params as `current`. No extra unit params needed.

**Warning signs:**
- Forecast panel shows hours earlier than the current time.
- Hour 0 (midnight) appears first in the forecast list even at 3pm.
- Precipitation probability shows 0% for the current and next few hours even when rain is expected (reading past-hours data instead of future).

**Phase to address:**
Hourly forecast phase. The array-slicing logic must be unit-tested before building the UI.

---

### Pitfall 6: Canvas Particle Animation RAF Loop Not Cancelled on Component Unmount

**What goes wrong:**
A canvas-based particle system uses `requestAnimationFrame` (RAF) recursively — each frame schedules the next. If the component unmounts (e.g., user navigates away, location clears, or the weather condition changes and swaps the particle component) without cancelling the pending RAF, the loop continues running in the background indefinitely. In Electron, where the app runs for hours, this accumulates ghost loops that consume CPU and GPU resources without drawing anything visible. Multiple condition changes (sunny → rain → cloudy) during a session stack multiple orphaned loops.

**Why it happens:**
RAF loops require storing the returned request ID and calling `cancelAnimationFrame(id)` in the cleanup function. Developers write the animation loop first and add cleanup as an afterthought — but React's `useEffect` cleanup only runs if the return function is correct. A common mistake is storing the RAF ID in a regular `let` variable inside `useEffect` but referencing it from a closure that becomes stale after the first frame.

**How to avoid:**
- Store the RAF ID in a `useRef`, not a local variable. The ref persists across renders and is accessible in the cleanup closure. Pattern:
  ```typescript
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const loop = () => {
      // draw particles
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
  ```
- Also store the canvas 2D context in a ref (`ctxRef = useRef<CanvasRenderingContext2D | null>(null)`) to avoid calling `getContext('2d')` on every frame.
- When the weather condition changes and a different particle component mounts (rain vs. snow vs. clear), the old component must fully unmount before the new one mounts. Use a `key` prop on the particle component keyed to `weatherCode` to force React to unmount/remount cleanly on condition change.

**Warning signs:**
- Chrome Task Manager (accessible via Electron's remote debugging) shows renderer CPU staying elevated after location switches.
- Browser console shows `cancelAnimationFrame called with invalid ID` (ID was never stored) or the animation loop fires after the component is no longer in the DOM.
- Memory usage grows monotonically over 30+ minutes of use without stabilizing.

**Phase to address:**
Particle animation phase. RAF cleanup must be verified in dev before building particle variety.

---

### Pitfall 7: Canvas Particles Cause High CPU on Windows Integrated Graphics

**What goes wrong:**
Animated canvas particle effects that work smoothly on a developer workstation (dedicated GPU) can cause 20-40% CPU usage on the Windows machines that are the actual target platform — laptops with Intel UHD or AMD Radeon integrated graphics. The canvas draw operations (filling gradient backgrounds, drawing dozens of translucent circles per frame, applying globalAlpha) are not GPU-accelerated in the same way CSS compositor-layer animations are.

**Why it happens:**
The Chromium compositor promotes CSS `transform` and `opacity` animations to the GPU compositor thread automatically. Canvas `drawImage`, `fillRect`, `arc`, and gradient fills are rasterized on the CPU (software renderer path) unless specific conditions trigger GPU rasterization. Developers test on their primary machine and ship without benchmarking the real target hardware profile.

**How to avoid:**
- Cap particle count to a tested maximum on startup. Start with 40-60 particles and benchmark on integrated graphics before increasing.
- Use integer coordinates for particle positions — sub-pixel rendering forces anti-aliasing on every draw call.
- Reduce particle opacity variation and gradient stops. Every `createLinearGradient` call is expensive; pre-create gradient objects outside the animation loop and reuse them.
- Add a `prefers-reduced-motion` check. If the user has enabled "Reduce animations" in Windows Accessibility settings, skip the particle system entirely and use a static background.
- Consider `offscreenCanvas` (transferable to a worker thread) for the particle calculation if particle counts exceed 100. Available in Chromium (Electron's renderer) since Electron ~12.
- Monitor via Electron's remote debugging: open DevTools → Performance → record 3 seconds → check "Rendering" and "GPU" event time in the trace.

**Warning signs:**
- Laptop fan spins up when app is visible with particles running.
- Windows Task Manager shows `weatherdeck.exe` using 15%+ CPU at idle.
- Animation frame rate drops below 30fps on integrated graphics hardware in the Performance trace.

**Phase to address:**
Particle animation phase. Set performance budget (e.g., target <5% CPU on integrated Intel UHD 620 at 60fps) and verify before shipping.

---

### Pitfall 8: electron-builder appId Change Breaks Existing Installations

**What goes wrong:**
The electron-builder `appId` in `package.json` (currently `com.weatherdeck` as set in `main/index.ts` via `setAppUserModelId`) is used to derive the NSIS installer GUID and Windows registry uninstall key. If `appId` is changed between v1.0 and v1.1 — even a case change or format correction — the v1.1 installer writes a new registry key. Windows sees it as a different application and the v1.0 entry in "Add or Remove Programs" remains as a ghost. Users end up with two entries: one stale (v1.0) and one current (v1.1). `electron-builder` documentation explicitly warns "You should not change appId once your application is in use."

**Why it happens:**
During packaging work, developers sometimes "clean up" the appId format (e.g., from `com.weatherdeck` to `com.weatherdeck.app`). The runtime GUID is derived from the appId via UUID v5, so any string change produces a different GUID.

**How to avoid:**
- Lock the `appId` in `electron-builder.yml` (or the `build` section of `package.json`) now, before the first installer is distributed. Choose the final value today — `com.weatherdeck` is fine.
- The `setAppUserModelId` call in `main/index.ts` must match the `appId` exactly. It currently does (`'com.weatherdeck'`). Do not change either.
- If the GUID must change (genuine app identity change), provide an uninstall script that removes the old registry entry before installing the new one.

**Warning signs:**
- Two entries for WeatherDeck appear in Windows "Add or Remove Programs" after a reinstall.
- The old v1.0 uninstall entry points to a path that no longer exists.
- `electron-builder` build log shows a different GUID than the previous build.

**Phase to address:**
Windows installer phase. Lock the `appId` in `electron-builder` config before producing the first `.exe` installer.

---

### Pitfall 9: Windows SmartScreen Blocks Installation for Unsigned Executable

**What goes wrong:**
An unsigned NSIS installer built with `electron-builder --win` triggers a Windows Defender SmartScreen warning: "Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting." Many users stop at this dialog. As of 2023, Microsoft requires EV certificates (private key stored on HSM hardware) for SmartScreen reputation bypass. Standard OV software certificates no longer provide immediate SmartScreen bypass — they receive the same treatment as unsigned apps until reputation builds through download volume.

The practical current solution for individual developers is Azure Trusted Signing, a cloud HSM service at ~$10/month that provides immediate SmartScreen bypass. As of October 2025, eligibility is limited to US/Canada-based organizations or individual developers.

**Why it happens:**
Packaging is treated as a Phase 4 afterthought. The developer builds the installer, tests it on their own machine (where SmartScreen may not trigger because it recognizes the file), and distributes without realizing users see the block screen.

**How to avoid:**
- For personal/internal use only: document the bypass steps prominently — right-click installer → Properties → check "Unblock" before running; or at the SmartScreen dialog, click "More info" → "Run anyway". Include screenshots.
- For public distribution: evaluate Azure Trusted Signing (~$10/month, immediate SmartScreen bypass, no hardware dongle required). Wire it into the `electron-builder` signing config using the `azureSignTool` integration.
- Never manually re-sign the installer after electron-builder produces it. The installer must be signed by electron-builder's signing step, because the `latest.yml` metadata file contains hashes of the signed installer. Re-signing after the fact breaks `latest.yml` and corrupts any auto-updater flow.
- Test the built installer on a clean Windows 11 VM (not the dev machine) before declaring it done.

**Warning signs:**
- `signtool verify /pa installer.exe` returns "No signature found."
- First external test user reports the blue SmartScreen screen.
- `latest.yml` hash does not match the distributed installer file (sign-after-build mistake).

**Phase to address:**
Windows installer phase. Signing strategy must be decided before building the installer, not after.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `locations` in React state only (no persistence) | No new IPC to write | App forgets all saved locations on restart; destroys the multi-location feature | Never — persistence is the entire point of multi-location |
| Wire auto-refresh timer directly in `App.tsx` with `setInterval` and no in-flight guard | Quick to implement | Duplicate concurrent fetches; stale data overwrites fresh data | Never — add in-flight guard before shipping timer |
| Skip the `startIndex` slice in hourly array, display from index 0 | Simpler data mapping | Past hours shown in forecast; midnight always appears first | Never — users will see wrong data |
| Use CSS `box-shadow` animation for particle glow effects instead of canvas | Easier to implement | High CPU on integrated graphics; forces full repaint on every frame | Never for animated glows — static glow only |
| Change `appId` between v1.0 and v1.1 to "clean up" naming | Cosmetically tidy | Breaks uninstall registry; ghost entries in Add/Remove Programs | Never once distributed |
| Build installer without code signing and document "click More info" bypass | Faster to ship | Users see security warning; some will not install | Acceptable for internal/personal use only |
| Store `activeIndex` in electron-conf across sessions | Users return to last-viewed location | User opens app with location index 3, which has stale data from yesterday; confusing | Defer — persist `activeIndex` only if UX testing shows it's valued |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Open-Meteo hourly + current in one request | Add `hourly` param without slicing to current hour | Find current hour index from `current.time`, slice `hourly` arrays from that index for 12 entries |
| Open-Meteo hourly across midnight | Request `forecast_days: '1'` and display 12 hours starting at hour 23 — runs off the array | Request `forecast_days: '2'` when local hour > 12 to ensure 12 future hours are available |
| Open-Meteo unit params | Assume `hourly` section uses different unit params than `current` | Same `temperature_unit` and `wind_speed_unit` URL params apply to both sections — no change needed |
| electron-conf locations store | Use same `Conf` instance as settings | Create a separate named instance: `new Conf({ name: 'locations' })` — single instance per file is required |
| Preload `contextBridge` extension | Add location IPC methods inline in `contextBridge.exposeInMainWorld('electronAPI', {...})` block | Add `getLocations` and `setLocations` to the existing `electronAPI` object; rebuild types in `env.d.ts` |
| electron-builder signing | Re-sign installer manually after build | Let `electron-builder` handle signing during the build step; post-build re-signing corrupts `latest.yml` hashes |
| Canvas + React | Call `canvas.getContext('2d')` inside the RAF loop | Call `getContext('2d')` once in `useEffect`, store in a ref, reuse in the loop |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Canvas particle `createLinearGradient` in RAF loop | CPU stays at 15%+ even with few particles; frame rate drops | Pre-create gradient objects once outside the loop; store in refs | Immediately — every frame incurs gradient allocation cost |
| Particle count uncapped | Fan spin-up on laptops; > 10% CPU at idle on integrated graphics | Start at 50 particles max; benchmark before increasing | Integrated graphics laptops, which are the primary target platform |
| Auto-refresh timer with no in-flight guard | Two concurrent API requests per refresh tick; doubled Open-Meteo quota burn | Add `isLoadingRef` guard in `useWeather.refetch` | First time app is minimized and restored, releasing batched throttled ticks |
| Location switch without clearing stale weather state | Stale temperature/condition from previous location visible for 1-2 seconds | Clear `weather` state on `location.lat`/`location.lon` change in `useEffect` | Every location switch; visible to user on every use |
| `backgroundThrottling: true` (default) + renderer timer | Refresh timer fires irregularly after minimize; batched ticks on restore | Set `backgroundThrottling: false` in `BrowserWindow.webPreferences`, OR move timer to main process | After app is minimized for > 5 minutes on Windows |
| 24-entry hourly array rendered without memoization | Re-renders all 24 forecast rows when any parent state changes (e.g., settings modal opens) | Wrap forecast row component in `React.memo`; memoize the sliced hourly array with `useMemo` | Once hourly forecast panel is built and settings modal is opened |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing `ipcRenderer` directly via `contextBridge` for new location IPC | Renderer can call any IPC channel, not just intended ones | Follow existing pattern: expose named functions only (`getLocations`, `setLocations`) — never the raw `ipcRenderer` |
| Fetching weather over HTTP instead of HTTPS | Data interceptable on network | All Open-Meteo requests already use `https://` — do not introduce any HTTP fallback |
| Storing zip code input without validation before IPC | Malformed data written to `electron-conf` locations store | Validate zip format (5-digit numeric) in the renderer before calling `window.electronAPI.setLocations` |
| Disabling `contextIsolation` to simplify new IPC | Full Node.js access from renderer | Never disable `contextIsolation` — the existing preload pattern is correct; extend it rather than bypassing it |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-refresh replaces the visible scroll position in hourly forecast | User scrolling through forecast list gets jumped back to top every 5 minutes | Update forecast data in-place via state; do not unmount/remount the forecast list on refresh |
| No "last updated" timestamp visible | User cannot tell if the 72°F reading is from now or 30 minutes ago | Show `"Updated 3 min ago"` with a relative time that updates every 30 seconds; tie to the `time` field already returned in `WeatherData` |
| Location deletion with no confirmation when only one remains | User accidentally deletes their only saved location, triggers welcome screen | Disable or hide the delete button when only one location exists; require explicit confirmation for multi-location delete |
| Particle animation starts cold on location switch | Abrupt visual change with no transition | Fade out old particles (opacity to 0 over 300ms) before unmounting; fade in new particles on mount |
| Progress countdown to next refresh resets instantly on manual refresh | User clicks "Refresh now" but the countdown restarts from 0 and the auto-refresh fires 5 minutes later anyway — so two refreshes in quick succession | Reset the interval timer on manual refresh so the next auto-refresh is 5 minutes from the manual trigger, not from the original schedule |
| Hourly forecast shows hours in 24h format when user expects 12h AM/PM | Common Windows user expectation is 12h format | Display hours as 12h AM/PM format (e.g., "3 PM") not "15:00"; derive from the ISO 8601 `hourly.time` strings already in local time |

---

## "Looks Done But Isn't" Checklist

- [ ] **Auto-refresh timer:** Fires visibly in dev — but verify it still fires correctly after the window is minimized for 15 minutes and then restored. Without `backgroundThrottling: false`, the timer behavior on Windows is unpredictable.
- [ ] **Auto-refresh countdown:** Counts down in UI — but verify the countdown resets correctly after a manual `refetch()` call, not just after the timer fires.
- [ ] **Hourly forecast hours:** Displays 12 entries — but verify the first entry is the current or next hour, not midnight. Test after 10pm to catch the across-midnight slice edge case.
- [ ] **Multi-location persistence:** Switching locations works in session — but verify locations survive app close and reopen. Check `%APPDATA%\weatherdeck\` for the `locations.json` file after adding a second zip code.
- [ ] **Location deletion:** Delete button works — but verify behavior when one location remains. Should the app show the welcome screen or require at least one location always? Decide and test both paths.
- [ ] **Particle animation cleanup:** Particles render — but add a second location and switch back and forth 10 times rapidly. Check Chrome Task Manager CPU % in the renderer process; orphaned RAF loops accumulate.
- [ ] **Particle performance on integrated graphics:** Smooth on dev machine — but test CPU% on a machine with Intel UHD graphics (or disable hardware acceleration in Electron dev to simulate). Target: < 5% idle CPU.
- [ ] **Windows installer:** Installs on dev machine — but test on a clean Windows 11 VM with no development tools installed. Verify SmartScreen behavior, successful launch, and that all app data paths resolve correctly.
- [ ] **NSIS uninstall:** Installer installs — but verify "Uninstall WeatherDeck" appears exactly once in Add/Remove Programs. Run the installer twice on the same machine to check for duplicate entries.
- [ ] **IPC extension:** New `getLocations`/`setLocations` calls work — but verify TypeScript types in `env.d.ts` (`Window.electronAPI`) are updated to include the new methods. Missing types are not caught at runtime; they produce `undefined is not a function` in production only.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Timer fires while fetch in-flight (duplicate requests) | LOW | Add `isLoadingRef` guard to `useWeather.refetch`; 5-10 line change; no architecture change |
| Background throttling breaks timer | LOW–MEDIUM | Add `backgroundThrottling: false` to `BrowserWindow` options (1 line); or refactor timer to main process (2-3 hour refactor) |
| Locations not persisted (state only) | MEDIUM | Add `electron-conf` locations store, new IPC handlers, preload extension, and startup load logic; ~4 hours if done cleanly |
| Stale data flash on location switch | LOW | Add `setWeather(null)` at top of location-change `useEffect`; 2-line fix |
| Hourly array showing wrong hours | LOW | Add index-slice logic in `weather.ts`; add unit test; 1-2 hours |
| Canvas RAF loop orphaned on unmount | LOW | Add `cancelAnimationFrame` in `useEffect` cleanup; pattern is straightforward once identified |
| Canvas high CPU on integrated graphics | MEDIUM | Reduce particle count, pre-create gradient objects outside loop, add `prefers-reduced-motion` bypass; 3-5 hour optimization pass |
| appId changed, duplicate uninstall entries | HIGH | Requires distributing a migration installer that removes old registry key before writing new one; user-facing support required |
| SmartScreen blocks users | LOW (internal) / MEDIUM (public) | Internal: document "More info → Run anyway"; Public: integrate Azure Trusted Signing (~$10/month setup + config) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Concurrent fetch in-flight on timer tick | Auto-refresh phase | Unit test: call `refetch()` twice in rapid succession; verify only one network request fires |
| Background throttling stalls timer | Auto-refresh phase | Manual test: minimize app for 15 minutes; verify refresh fires within 30 seconds of restore |
| Locations lost on restart | Multi-location phase | Close and reopen app; verify saved zip codes appear without re-entry |
| Stale data flash on location switch | Multi-location phase | Switch locations; verify skeleton/loading state appears before new data (not previous location's data) |
| Hourly array wrong start index | Hourly forecast phase | Unit test `sliceHourly()` with times of 00:00, 12:00, 23:00; verify 12 future entries |
| Hourly array runs off end of day | Hourly forecast phase | Test after 10pm local time; verify 12 future hours shown crossing midnight |
| Canvas RAF loop not cancelled | Particle animation phase | Switch locations 10x rapidly; verify renderer CPU % stabilizes (not cumulative) |
| Canvas high CPU on integrated graphics | Particle animation phase | Benchmark CPU% with particles active on hardware with integrated graphics or with Electron hardware acceleration disabled |
| appId frozen before first install | Windows installer phase | Verify `build.appId` in `package.json` matches `setAppUserModelId` arg in `main/index.ts` before first `.exe` distribution |
| SmartScreen blocks installer | Windows installer phase | Test built `.exe` on a clean Windows 11 VM; document bypass steps in README before distribution |

---

## Sources

- Electron GitHub issue #4465 — `setInterval` stalls when window is not foreground: https://github.com/electron/electron/issues/4465
- Electron GitHub issue #31016 — `backgroundThrottling: false` not obeyed on hide() on Windows: https://github.com/electron/electron/issues/31016
- Electron GitHub issue #42378 — Window blank after hidden with backgroundThrottling: https://github.com/electron/electron/issues/42378
- Electron BrowserWindow docs — `backgroundThrottling` option: https://www.electronjs.org/docs/latest/api/browser-window
- Electron code signing tutorial (official, 2025): https://www.electronjs.org/docs/latest/tutorial/code-signing
- electron-builder NSIS docs — `appId` warning: https://www.electron.build/nsis.html
- electron-builder Windows code signing: https://www.electron.build/code-signing-win.html
- Open-Meteo API docs — hourly parameters, timezone behavior: https://open-meteo.com/en/docs
- Konva.js — avoiding Canvas memory leaks (RAF and context patterns): https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html
- Max Rozen — Race conditions with useEffect fetch: https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect
- React docs — useEffect cleanup: https://react.dev/reference/react/useEffect
- Pete Corey — Animating a Canvas with React Hooks (RAF ref pattern): https://www.petecorey.com/blog/2019/08/19/animating-a-canvas-with-react-hooks/
- Security Boulevard — How to sign a Windows Electron app (2025): https://securityboulevard.com/2025/12/how-to-sign-a-windows-app-with-electron-builder/

---
*Pitfalls research for: WeatherDeck v1.1 — adding auto-refresh, hourly forecast, multi-location, canvas particles, Windows installer to existing Electron + React app*
*Researched: 2026-03-01*
