# Phase 5: Visual Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 05-visual-polish
**Areas discussed:** Particle visual style, Particle layer placement, Weather-to-effect mapping, Location switch transition

---

## Particle Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Stylized neon (Recommended) | Particles match the sci-fi aesthetic — rain as thin cyan streaks with glow, snow as soft white dots with subtle bloom, fog as drifting translucent cyan layers | ✓ |
| Realistic/natural | Conventional weather animation — blue-gray rain, white snowflakes, gray fog wisps | |
| Minimal ambient | Very subtle faint dots or lines barely visible in the background | |

**User's choice:** Stylized neon
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, scale with severity | WMO codes distinguish light/moderate/heavy. Map each level to different particle density and speed | ✓ |
| Single intensity per type | One rain effect, one snow effect. Simpler, fewer visual states | |

**User's choice:** Scale with severity
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| HTML Canvas 2D (Recommended) | Standard canvas with requestAnimationFrame. Simple, zero dependencies, plenty performant for 80-120 particles | ✓ |
| CSS-only animations | Particles as positioned divs with CSS keyframes. No JS animation loop | |

**User's choice:** HTML Canvas 2D
**Notes:** None

---

## Particle Layer Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Main panel only (Recommended) | Canvas covers WeatherPanel area. Sidebar stays clean. Simpler z-index management | ✓ |
| Full window | Canvas covers entire app including sidebar. More immersive but may obscure sidebar text | |
| Behind content, panel only | Canvas between background and content. Subtle but may be hard to see | |

**User's choice:** Main panel only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| In front with low opacity | Particles overlay content at ~15-25% opacity with pointer-events: none. Most immersive sci-fi feel | ✓ |
| Behind content | Particles between background and weather data. Zero readability concern | |

**User's choice:** In front with low opacity
**Notes:** None

---

## Weather-to-Effect Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle ambient particles | Faint drifting dots or sparkles. Day: warm golden motes. Night: slow-drifting star-like specks | ✓ |
| No particles for clear | Canvas empty/hidden during clear and partly cloudy | |

**User's choice:** Subtle ambient particles for clear sky
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Rain particles + periodic flash | Same rain effect but with occasional full-canvas lightning flash (brief white/cyan opacity pulse) | ✓ |
| Just heavier rain | Thunderstorm = max intensity rain. No special flash effect | |

**User's choice:** Rain particles + periodic flash for thunderstorms
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Drifting horizontal layers | 2-3 semi-transparent gradient bands that slowly drift left/right | |
| Floating wisps | Small cloud-like blobs that drift and fade in/out | |
| You decide | Claude's discretion on fog effect | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

---

## Location Switch Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Opacity crossfade (Recommended) | Content fades out (200-300ms), new data loads, fades back in. Particle effect transitions with brief pause/restart | ✓ |
| Slide transition | Old content slides out left, new slides in from right | |
| Instant with particle blend | Data swaps instantly, particle canvas smoothly transitions between effects | |

**User's choice:** Opacity crossfade
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Only sidebar fixed | Everything in main panel fades | |
| Sidebar + header fixed | Location name and refresh indicator stay visible | |
| You decide | Claude's discretion on which elements transition | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

---

## Claude's Discretion

- Fog effect implementation (drifting layers vs floating wisps)
- Which elements stay fixed during crossfade (header behavior)
- Exact particle opacity values and glow intensities
- Lightning flash frequency and duration
- Canvas resize handling
- Crossfade easing and duration tuning
- Performance optimization details

## Deferred Ideas

None — discussion stayed within phase scope
