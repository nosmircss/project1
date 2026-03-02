# WeatherDeck

## What This Is

A Windows desktop application that displays current weather conditions for user-saved US zip codes. Built with Electron + React + TypeScript, featuring a dark neon sci-fi aesthetic with cyan/magenta glow accents, a giant temperature hero display, and configurable unit settings.

## Core Value

Users can glance at their desktop and instantly know current weather and the next several hours — accurate, beautiful, and always up to date.

## Requirements

### Validated

- ✓ Display current weather conditions (temperature, feels-like, humidity, wind, sky conditions, UV, pressure, sunrise/sunset) — v1.0
- ✓ Dark theme with neon/glowing cyan-blue accents (sci-fi aesthetic) — v1.0
- ✓ Professional, polished UI in a standard resizable window — v1.0
- ✓ Fetch weather data from Open-Meteo (free, no API key) — v1.0
- ✓ Config menu to set temperature/wind units and refresh interval — v1.0
- ✓ Loading and error states with retry — v1.0

### Active

- [ ] Display hourly forecast for the next 12-24 hours
- [ ] Auto-refresh weather data on a configurable interval (default 5 minutes)
- [ ] Save and switch between multiple zip code locations
- [ ] Animated weather particle effects matching current conditions
- [ ] Smooth location-switch transitions
- [ ] Windows .exe installer with SmartScreen bypass documentation

### Out of Scope

- Multi-day forecast — defer to v2
- Severe weather alerts — defer to v2
- System tray / widget mode — defer to v2
- Mobile or cross-platform support — Windows desktop only
- User accounts or cloud sync — local storage only
- Air Quality Index — defer to v2
- International zip/postal codes — US only for v1

## Context

Shipped v1.0 with 1,625 LOC TypeScript/CSS.
Tech stack: Electron 39.x, React 19, TypeScript 5.9, Tailwind CSS 4, electron-vite 5.0.
Weather data: Open-Meteo API (free, no key, 10k calls/day).
Geocoding: Local zipcodes-us npm package (offline lookup).
Settings persistence: electron-conf with explicit IPC handlers.
Tests: 31 passing (Vitest) — zipLookup, weatherCodeMap, windDirection.

## Constraints

- **Platform**: Windows desktop — must run natively on Windows 10/11
- **API Cost**: Free tier weather API (Open-Meteo) — no paid services
- **Refresh Rate**: Configurable, default 5 minutes — must respect API rate limits
- **Security**: contextIsolation: true, nodeIntegration: false — all IPC via contextBridge

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dark + neon UI theme | User preference for futuristic sci-fi aesthetic | ✓ Good — Tailwind v4 @theme tokens + @utility glow classes |
| Multiple saved locations | User wants to switch between zip codes | — Active (persistence in next milestone) |
| Electron + React + TypeScript | Best fit for Windows desktop with rich UI | ✓ Good — electron-vite 5.0 scaffold works well |
| Open-Meteo API | Free, no key required, generous rate limits | ✓ Good — 12+ fields, timezone-aware, unit params |
| electron-conf over electron-store | Avoids ESM-only friction in CJS electron-vite builds | ✓ Good — reliable persistence |
| Explicit IPC over electron-conf renderer bridge | Renderer bridge caused silent channel mismatch | ✓ Good — consistent namespace:verb pattern |
| Tailwind CSS v4 @tailwindcss/vite | Modern plugin architecture, no PostCSS config | ✓ Good — renderer-only scoping works cleanly |
| filter drop-shadow on icons | Glow follows SVG paths, not bounding rectangle | ✓ Good — line-art aesthetic |
| Settings gate pattern | Prevents stale-unit double-fetch on startup | ✓ Good — eliminates race condition |

---
*Last updated: 2026-03-01 after v1.0 milestone*
