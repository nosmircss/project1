# Requirements: WeatherDeck

**Defined:** 2026-03-01
**Core Value:** Users can glance at their desktop and instantly know current weather and the next several hours — accurate, beautiful, and always up to date.

## v1.1 Requirements

Requirements for the v1.1 Feature Complete milestone. Each maps to roadmap phases.

### Auto-Refresh

- [ ] **REFR-01**: User sees weather data refresh automatically at the configured interval (default 5 min) without any manual action — the displayed data visibly updates when a refresh completes
- [ ] **REFR-02**: User can see the time of the last successful data refresh, visible at all times
- [ ] **REFR-03**: User can see a live countdown to the next auto-refresh, visible at all times

### Hourly Forecast

- [ ] **HOUR-01**: User can view a scrollable hourly forecast showing temperature, weather condition icon, and precipitation probability for each of the next 12-24 hours
- [ ] **HOUR-02**: Hourly forecast starts from the current hour and shows only future hours (not past hours from midnight)
- [ ] **HOUR-03**: Hourly forecast updates immediately when the active location changes

### Locations

- [x] **LOC-01**: User can save multiple zip code locations that persist across app restarts
- [x] **LOC-02**: User can switch to any saved location with one click, and both current conditions and hourly forecast update immediately
- [x] **LOC-03**: User can delete a saved location — it is removed and no longer appears after restart
- [x] **LOC-04**: Deleting the active location selects the next available location or returns to the empty/welcome state

### Visual Polish

- [ ] **VISL-01**: App displays animated weather particle effects (raindrops, snowflakes, fog, etc.) that match the current weather condition for the active location
- [ ] **VISL-02**: Switching between saved locations produces a smooth visual transition — no abrupt content flash or layout jump

### Distribution

- [ ] **DIST-01**: A Windows NSIS `.exe` installer can be built, launched on a clean Windows 10/11 machine, and successfully installs and runs WeatherDeck
- [ ] **DIST-02**: Install instructions document the SmartScreen bypass for unsigned builds

## Future Requirements

Deferred beyond v1.1. Tracked but not in current roadmap.

### Extended Forecast

- **FORE-01**: User can view a multi-day forecast (5-7 days)
- **FORE-02**: User can see severe weather alerts for active location

### System Integration

- **SYST-01**: App can run as a system tray widget
- **SYST-02**: Air Quality Index display for active location

### International

- **INTL-01**: Support for international postal codes (not just US zip)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-day forecast | Complexity — defer to v2 |
| Severe weather alerts | Requires additional API integration — defer to v2 |
| System tray / widget mode | Significant architectural change — defer to v2 |
| Mobile or cross-platform | Windows desktop only |
| User accounts / cloud sync | Local storage only |
| Air Quality Index | Separate API concern — defer to v2 |
| International postal codes | US only for v1.x |
| Code signing certificate | $300-600/year cost — document SmartScreen bypass instead |
| Particle density settings | Over-engineering — use sensible defaults |
| Location reordering | Nice-to-have, not essential for v1.1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REFR-01 | Phase 4 | Pending |
| REFR-02 | Phase 4 | Pending |
| REFR-03 | Phase 4 | Pending |
| HOUR-01 | Phase 4 | Pending |
| HOUR-02 | Phase 4 | Pending |
| HOUR-03 | Phase 4 | Pending |
| LOC-01 | Phase 3 | Complete |
| LOC-02 | Phase 3 | Complete |
| LOC-03 | Phase 3 | Complete |
| LOC-04 | Phase 3 | Complete |
| VISL-01 | Phase 5 | Pending |
| VISL-02 | Phase 5 | Pending |
| DIST-01 | Phase 6 | Pending |
| DIST-02 | Phase 6 | Pending |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 — traceability filled after roadmap creation*
