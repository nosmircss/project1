# Pitfalls Research

**Domain:** Windows Desktop Weather Application (Tauri/Electron + React, free weather API)
**Researched:** 2026-03-01
**Confidence:** MEDIUM (WebSearch verified with official docs where possible; Tauri-specific issues confirmed via GitHub issues)

---

## Critical Pitfalls

### Pitfall 1: API Key Hardcoded in Source Code

**What goes wrong:**
The API key for OpenWeatherMap or WeatherAPI.com is embedded directly in the JavaScript/TypeScript source. For Tauri apps shipped as a binary, the frontend bundle ships as readable files inside the app package. Anyone who inspects the installed app directory can extract the key, abuse it, and blow through the free-tier quota — leaving the app non-functional for all users.

**Why it happens:**
It feels like a local desktop app, not a web server, so developers assume the key is "safe" inside the binary. It is not. Tauri and Electron both package frontend assets as accessible files. Obfuscation is not the same as security.

**How to avoid:**
- Store the API key in a per-user config file on disk (e.g., `%APPDATA%\WeatherDeck\config.json`) written at first-run setup, not baked into the build.
- Alternatively, use Tauri's secure storage plugin (`tauri-plugin-store`) to read/write the key from the OS credential store.
- Never commit the key to source control. Use `.gitignore` on any file that stores it.
- For OpenWeatherMap specifically: set a hard daily call cap in the account dashboard to limit blast radius if the key is stolen.

**Warning signs:**
- API key appears anywhere in the bundled `dist/` or `src-tauri/` directories.
- Key is in a `.env` file that is committed to git.
- Build scripts embed `VITE_API_KEY=xxx` values directly into the JS bundle output.

**Phase to address:**
Phase 1 (Project Setup / API Integration). Define the config file strategy before writing any API call code.

---

### Pitfall 2: OpenWeatherMap One Call API 3.0 Credit Card Gotcha

**What goes wrong:**
Developers sign up for OpenWeatherMap's free tier intending to use the One Call API 3.0 (which provides current conditions + hourly forecast in a single call — exactly what WeatherDeck needs). The signup requires a credit card. The default daily cap is set to 2,000 calls/day, not 1,000. If the developer doesn't lower the cap to 1,000, overages are automatically charged at end of month.

Additionally, API 2.5 was deprecated in June 2024. Projects built on it will fail silently or receive error responses. New projects must use 3.0 from the start.

**Why it happens:**
The free tier landing page is not prominent about the 2,000-call default cap. Developers assume "free tier" means they can't be charged. They also copy-paste old tutorials that reference 2.5 endpoints.

**How to avoid:**
- After signup, immediately set the daily call limit to 1,000 in the "Billing plan" tab of the OWM Personal Account dashboard.
- Use only One Call API 3.0 endpoints. Never reference 2.5 endpoints in any new code.
- Verify the key activates (up to 2-hour delay after signup) before building against it.
- Test with a dedicated dev key, separate from the key documented for users.

**Warning signs:**
- Tutorials or Stack Overflow answers reference `api.openweathermap.org/data/2.5/onecall` — this is the dead 2.5 endpoint.
- OWM dashboard shows daily limit set to 2,000 instead of 1,000.
- API key returns 401 immediately after signup (activation not yet complete — wait up to 2 hours).

**Phase to address:**
Phase 1 (API Selection and Integration). Must be resolved before any fetch code is written. Document the cap-setting step in the phase task list.

---

### Pitfall 3: No Cache Layer — Every App Startup Fires a Live API Call

**What goes wrong:**
The app fetches fresh weather data every time it starts, every time the user switches zip codes, and every time the auto-refresh timer fires — without checking whether the cached data is still fresh. For a 5-minute refresh interval and 5 saved zip codes, this burns 5 calls at launch + 5 calls every 5 minutes = 60 calls/hour = 1,440 calls/day — 44% of the free tier ceiling, just for one user. If anything causes rapid restarts (crash loop, Windows update), the free quota can be consumed before users notice.

**Why it happens:**
Developers build the happy path first: fetch → display. Caching feels like an optimization to add later. It never gets added.

**How to avoid:**
- Implement a simple in-memory + persistent cache from day one. Store `{ data, fetchedAt }` per zip code in the Tauri store or a local JSON file.
- Before any fetch, check if `fetchedAt` is within the refresh interval. If so, serve cached data.
- On app startup, serve cached data immediately (even if stale) and refresh in the background. Never block startup on a network call.
- Design the refresh timer to skip a tick if a fetch is already in-flight.

**Warning signs:**
- The app has no concept of "last fetched at" anywhere in state.
- Network tab shows API calls on every route change or zip code switch.
- Multiple concurrent fetches for the same zip code are possible.

**Phase to address:**
Phase 2 (Weather Data Fetching). Build cache alongside the fetch layer, not as a follow-up.

---

### Pitfall 4: Auto-Refresh Timer Keeps Running When App Is Minimized or Hidden (CPU / Battery Drain)

**What goes wrong:**
A `setInterval` in the React layer fires every 5 minutes regardless of app visibility. Tauri apps on Windows have a documented bug where the WebView2 runtime throttles or stops JavaScript timers for minimized windows, causing inconsistent refresh behavior. Separately, if the timer is not properly cleared on component unmount, multiple overlapping timers accumulate across hot-reloads (dev) or tab switches, causing excessive API calls and high idle CPU.

**Why it happens:**
`setInterval` is the obvious tool. Developers don't test what happens after 30 minutes minimized. React's `useEffect` cleanup rules for timers are easy to get wrong.

**How to avoid:**
- Use Tauri's native `tauri::async_runtime` scheduler (Rust side) for the refresh timer, invoked via IPC, rather than `setInterval` in the renderer. Rust timers are not subject to WebView2 throttling.
- Alternatively, use a Tauri plugin (e.g., `tauri-plugin-timer`) to schedule interval callbacks from the backend.
- If using `setInterval` in React, always return a cleanup function from `useEffect` that calls `clearInterval`.
- Pause fetching when the Tauri window emits a `blur` or `minimized` event; resume on `focus` or `restored`.

**Warning signs:**
- `useEffect` with `setInterval` that has no corresponding `clearInterval` in the return function.
- Console logs show multiple "fetching weather" messages per tick in dev mode (timer leak).
- After minimizing the app for 10+ minutes and restoring, data is not current.
- CPU usage is non-trivial when the window is minimized.

**Phase to address:**
Phase 2 (Weather Data Fetching / Auto-Refresh). Design the refresh mechanism using the Rust backend timer from the start.

---

### Pitfall 5: Neon Glow Animations Cause High CPU / GPU Paint on Low-End Windows Hardware

**What goes wrong:**
The sci-fi dark neon aesthetic commonly involves `box-shadow`, `text-shadow`, and animated `filter: drop-shadow()` on multiple elements. These CSS properties trigger the browser paint pipeline on every animation frame. On WebView2 (the Chromium-based runtime used by Tauri on Windows), animating `box-shadow` or `text-shadow` forces full layer repaints — it cannot be promoted to a GPU compositor layer. The result is 30-60% CPU usage at idle on mid-range hardware just from visual effects.

**Why it happens:**
Neon glow looks great in dev on a fast machine. The shadow techniques used in tutorials are not hardware-accelerated. Developers test on development machines that hide the performance problem.

**How to avoid:**
- Achieve neon glow using `filter: blur()` on a pseudoelement (`::before`/`::after`) that is promoted to its own compositor layer with `will-change: opacity, transform`. This keeps the glow on the GPU compositor thread.
- Animate only `opacity` and `transform` for pulsing effects — these are the only CSS properties that don't trigger layout or paint.
- Avoid animating `box-shadow` directly. Use a static shadow for inactive elements; only toggle it on hover via class change (not transition).
- Use `prefers-reduced-motion` media query to disable animations for users who have requested it in Windows accessibility settings.
- Benchmark on a mid-range Windows machine (Intel UHD integrated graphics), not just a developer workstation.

**Warning signs:**
- Chrome DevTools (WebView2 can be inspected via remote debugging) shows "Paint" events on every animation frame.
- Idle CPU in Task Manager is above 5% with no network activity.
- GPU memory usage grows over time.

**Phase to address:**
Phase 3 (UI / Theming). Establish CSS animation conventions before building components.

---

### Pitfall 6: Windows SmartScreen Warning Blocks First-Run Installation (Distribution Friction)

**What goes wrong:**
An unsigned Tauri app distributed as a `.exe` installer triggers a Windows Defender SmartScreen warning: "Windows protected your PC." Many non-technical users will stop here and not install the app. Even after signing with a standard OV certificate (not EV), SmartScreen warnings persist until the app builds reputation through enough download volume — a chicken-and-egg problem for new apps. As of March 2024, EV certificates no longer bypass SmartScreen immediately; they are treated the same as OV.

**Why it happens:**
Code signing feels like a deployment detail to handle "later." But SmartScreen reputation is earned over time — the later signing happens, the longer users will see the warning.

**How to avoid:**
- Plan for code signing from the start, even if the initial release uses a self-signed cert for personal use.
- For public distribution: use a standard OV code signing certificate (~$70/year from Sectigo/DigiCert). Accept that SmartScreen will warn until reputation builds.
- Provide clear installation instructions that show users how to click "More info" → "Run anyway" on the SmartScreen dialog.
- For personal/internal use only: document that users must right-click → Properties → "Unblock" on the downloaded installer.
- Use Tauri's NSIS bundler (default on Windows) which produces a proper signed installer; avoid raw `.exe` drops.

**Warning signs:**
- No code signing certificate in `tauri.conf.json` `windows` → `certificateThumbprint` field.
- Installer filename triggers `msiexec` warnings on test machines.
- First test user reports "Windows says it's dangerous."

**Phase to address:**
Phase 4 (Packaging and Distribution). Must be addressed before any external release, even alpha.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode API key in `.env` for dev, "fix later" | Faster initial dev | Key leaks into git history; hard to audit | Never — use a config file pattern from day one |
| Skip caching, fetch on every render | Simpler code | Quota exhausted; startup blocked on network | Never — add a minimal TTL check at minimum |
| Use `setInterval` in React without cleanup | Easy timer setup | Memory leaks; zombie timers in dev | Only if in a top-level singleton component with proper cleanup |
| Use `box-shadow` animations for neon glow | Easy CSS | High CPU, janky on integrated graphics | Only for static (non-animated) glow on high-end machines |
| Skip error state in UI | Cleaner components | App shows blank UI on API failure | Never — always show last-known data or error message |
| Store zip codes in `localStorage` | No boilerplate | Data lost on Tauri profile reset; not portable | MVP only; migrate to `tauri-plugin-store` before release |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenWeatherMap One Call 3.0 | Using deprecated 2.5 endpoint URL | Use `https://api.openweathermap.org/data/3.0/onecall` |
| OpenWeatherMap One Call 3.0 | Assuming free = no card needed | Provide card; immediately cap daily limit to 1,000 calls |
| OpenWeatherMap One Call 3.0 | Testing immediately after key creation | Wait up to 2 hours for key activation; expect 401 during activation |
| OpenWeatherMap One Call 3.0 | Treating all missing fields as errors | Missing weather fields mean "did not occur" — handle as optional |
| WeatherAPI.com | Expecting monthly rollover mid-month | Quota resets at midnight UTC on the 1st; plan for partial months |
| Zip code input | Passing raw user input directly to API | Validate US zip code format (5-digit numeric) before calling API; handle API 404 gracefully for invalid zips |
| Zip code input | Assuming zip codes are unique to cities | Multiple zip codes can share a city name; display city name returned by API, not the user's typed city guess |
| Tauri IPC | Emitting large payloads with `emit_all` | Keep event payloads small; emit only diffs or change signals, fetch data from Rust side |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Animated `box-shadow` / `text-shadow` for neon glow | High idle CPU (30%+), fan noise, janky animations | Use `filter: blur()` on promoted pseudoelement; animate only `opacity`/`transform` | Immediately on integrated graphics hardware |
| No fetch debounce when user rapidly switches zip codes | Rapid successive API calls; possible 429 error | Debounce zip code selection with 300ms delay; cancel in-flight fetch on new selection | First time a user clicks between locations quickly |
| `setInterval` in React renderer for auto-refresh | Multiple overlapping timers after dev hot-reload; zombie fetches | Use Rust-side timer with IPC; or strict `useEffect` cleanup | During active development (hot-reload repeatedly creates leaked timers) |
| Blocking app startup on live API fetch | App appears frozen for 2-5 seconds on startup | Serve cached data immediately on startup; refresh in background | On first launch or poor network conditions |
| Storing all hourly forecast data in React state unoptimized | Large state object; unnecessary re-renders of all components | Memoize forecast slice; use `useMemo`/`React.memo` on forecast rows | When displaying 24-hour forecast (24 row components) |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key in committed source code or `.env` | Key stolen from git; quota exhausted or account suspended | Store in `%APPDATA%\WeatherDeck\config.json`; add to `.gitignore`; use Tauri store plugin for persistence |
| No daily API call cap set on OWM account | Unexpected charge if quota exceeded (OWM One Call 3.0 charges overages) | Set cap to 1,000/day immediately after account creation |
| Zip code input passed unsanitized to API URL | Query injection (low risk for weather APIs, but unpredictable behavior) | Validate zip is 5-digit numeric before including in URL; use `encodeURIComponent` |
| Fetching API over HTTP (not HTTPS) | Data intercepted in transit | Always use `https://` endpoints; Tauri's CSP should block HTTP API calls |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| App shows blank screen when API call fails | User has no weather data and no explanation | Show last-known cached data with a "last updated X minutes ago" timestamp; show subtle error indicator |
| Stale data with no timestamp | User doesn't know if data is from 2 hours ago or 2 minutes ago | Display "Updated [time]" on every data view; update the timestamp label even if data hasn't changed |
| Auto-refresh resets scroll position or UI state | User loses their place in hourly forecast mid-scroll | Update data in-place using React state; do not unmount/remount forecast list on refresh |
| No feedback during initial load | App looks broken on first launch | Show loading skeleton with neon pulse animation immediately; never show empty/blank screen |
| 5 saved zip codes with no active location indicator | User doesn't know which location is currently displayed | Highlight the active zip code tab clearly; show city name from API response, not raw zip input |
| Config menu closes on escape but changes aren't saved | User loses configured refresh interval | Either auto-save config changes or show explicit Save/Cancel buttons; never silently discard |
| App starts and immediately fetches, blocking the UI | Janky startup experience | Load from cache first, show data, then refresh silently in background |

---

## "Looks Done But Isn't" Checklist

- [ ] **API Integration:** Displays data — but verify error state when API returns 401, 429, or 5xx. Many implementations only test the happy path.
- [ ] **Auto-Refresh:** Timer appears to work — but verify it still fires after 30 minutes with app minimized. WebView2 throttles JS timers in minimized windows.
- [ ] **Multiple Zip Codes:** Switching works — but verify that switching rapidly doesn't fire duplicate API calls and that each location shows its own cached data.
- [ ] **Config Persistence:** Settings save during session — but verify they persist after app restart (i.e., are written to disk, not just React state).
- [ ] **Neon UI:** Looks great in dev — but measure idle CPU with animations running on a machine with integrated graphics (not a developer workstation).
- [ ] **Installer:** Runs fine in dev — but test the built `.exe` installer on a fresh Windows 11 machine without dev tools installed. SmartScreen, missing WebView2, and UAC prompts appear only in this context.
- [ ] **Data Freshness:** Shows temperature — but verify the "last updated" timestamp is displayed and accurate. Showing stale data without a timestamp is a known user confusion issue in weather apps.
- [ ] **Input Validation:** Accepts input — but test invalid zip codes (letters, 4-digit, empty string) and verify graceful error messages rather than API error bleed-through.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| API key exposed in git history | HIGH | Rotate key immediately in OWM/WeatherAPI dashboard; use `git filter-repo` to purge from history; audit for abuse in API dashboard |
| Unexpected OWM billing charge | MEDIUM | Set daily cap to 1,000 immediately; contact OWM support; implement caching to reduce call volume |
| Timer leak causing zombie fetch loops | MEDIUM | Audit all `useEffect` hooks for `setInterval` without cleanup; migrate to Rust-side timer; requires refactor but not rewrite |
| Neon animations causing high CPU | MEDIUM | Replace `box-shadow` animations with pseudoelement + `filter: blur()` pattern; affects all themed components but is CSS-only change |
| SmartScreen blocking distribution | LOW | Provide user-facing install instructions with screenshots; for personal use, right-click unblock is sufficient; for public: get OV cert and build reputation |
| User config data lost on reinstall | MEDIUM | Migrate config from `localStorage` to `%APPDATA%` file; document migration path in release notes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| API key hardcoded in source | Phase 1: Project Setup | Code review: grep for API key string in `dist/` bundle output |
| OWM One Call 3.0 credit card / cap confusion | Phase 1: API Integration | OWM dashboard shows daily limit = 1,000; test key uses 3.0 endpoint |
| No cache layer | Phase 2: Weather Data Fetching | Unit test: second fetch within TTL returns cached data without network call |
| Auto-refresh timer leak | Phase 2: Auto-Refresh | Manual test: run app 30 minutes minimized; verify timer still fires on restore |
| Neon glow CPU cost | Phase 3: UI Theming | Performance test: measure CPU% idle with animations running on integrated graphics |
| SmartScreen distribution warning | Phase 4: Packaging | Install built `.exe` on clean Windows 11 VM; document user bypass steps |
| Stale data with no timestamp | Phase 2: Weather Data Fetching | UI review: "Updated [time]" visible on all weather views |
| Zip code validation gaps | Phase 2: Input Handling | Test matrix: empty, letters, 4-digit, 6-digit, valid 5-digit inputs |

---

## Sources

- OpenWeatherMap FAQ (official): https://openweathermap.org/faq — API key activation delays, rate limits, One Call 3.0 pricing
- OpenWeatherMap One Call API 3.0 (official): https://openweathermap.org/api/one-call-3 — endpoint documentation, free tier call limits
- Tauri GitHub Issues — High CPU on Windows: https://github.com/tauri-apps/tauri/issues/10373
- Tauri GitHub Issues — Timer stops after minimize: https://github.com/tauri-apps/tauri/issues/5147
- Tauri GitHub Issues — emit_all memory/CPU spike: https://github.com/tauri-apps/tauri/discussions/10781
- Smashing Magazine — GPU Animation performance: https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/ (MEDIUM confidence — older article, CSS performance fundamentals remain accurate)
- Codementor — Weather API error handling best practices: https://www.codementor.io/@getambee/weather-api-error-handling-best-practices-for-robust-applications-29anmtuw9p
- Microsoft Learn — Store and retrieve app data: https://learn.microsoft.com/en-us/windows/apps/design/app-settings/store-and-retrieve-app-data
- Advanced Installer — SmartScreen prevention guide: https://www.advancedinstaller.com/prevent-smartscreen-from-appearing.html
- Tauri Windows Code Signing (official): https://v2.tauri.app/distribute/sign/windows/
- WeatherAPI.com dropped free plan (historical issue): https://github.com/monicahq/monica/issues/6288 — LOW confidence; current state confirmed free tier exists

---
*Pitfalls research for: Windows Desktop Weather Application (WeatherDeck)*
*Researched: 2026-03-01*
