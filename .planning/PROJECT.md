# WeatherDeck

## What This Is

A Windows desktop application that displays current weather conditions and hourly forecasts for user-saved zip codes. Features a dark, neon-accented sci-fi aesthetic with auto-refreshing data on a configurable interval.

## Core Value

Users can glance at their desktop and instantly know current weather and the next several hours — accurate, beautiful, and always up to date.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Display current weather conditions (temperature, humidity, wind, sky conditions) for a given zip code
- [ ] Display hourly forecast for the next 12-24 hours
- [ ] Auto-refresh weather data on a configurable interval (default 5 minutes)
- [ ] Config menu to set refresh interval
- [ ] Save and switch between multiple zip code locations
- [ ] Dark theme with neon/glowing cyan-blue accents (sci-fi aesthetic)
- [ ] Professional, polished UI in a standard resizable window
- [ ] Fetch weather data from a free weather API

### Out of Scope

- Multi-day forecast — defer to v2
- Severe weather alerts — defer to v2
- System tray / widget mode — defer to v2
- Mobile or cross-platform support — Windows desktop only
- User accounts or cloud sync — local storage only

## Context

- Greenfield project, no existing code
- Target platform: Windows desktop
- Weather data sourced from a free-tier API (OpenWeatherMap or WeatherAPI.com — to be decided during research)
- User wants a visually striking UI: dark backgrounds, glowing neon accents, sci-fi feel
- No strong tech stack preference — best fit will be chosen during research

## Constraints

- **Platform**: Windows desktop — must run natively on Windows 10/11
- **API Cost**: Free tier weather API — no paid services
- **Refresh Rate**: Configurable, default 5 minutes — must respect API rate limits

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dark + neon UI theme | User preference for futuristic sci-fi aesthetic | — Pending |
| Multiple saved locations | User wants to switch between zip codes | — Pending |
| Tech stack TBD | No user preference, research will determine best fit | — Pending |
| Weather API TBD | No user preference, research will determine best fit | — Pending |

---
*Last updated: 2026-03-01 after initialization*
