# Phase 1: Foundation - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A running Electron app that resolves a US zip code, fetches current temperature and sky conditions from Open-Meteo, and displays them in a dark neon sci-fi UI with loading and error states. Requirements: COND-01, COND-02, LOC-01, LOC-05, UI-01, UI-02, UI-03, UI-04.

</domain>

<decisions>
## Implementation Decisions

### Neon Design Language
- Dual accent color scheme: cyan (#00f0ff) primary + magenta/purple secondary for contrast and visual hierarchy
- Bold glow intensity: strong neon glow on borders, icons, and headers — clearly sci-fi, not subtle
- Dark background with faint Tron-style grid overlay lines for depth and cyber aesthetic
- Mixed typography: clean sans-serif (e.g., Inter, Outfit) for body text, monospace/tech font (e.g., JetBrains Mono, Orbitron) for numbers and data values like temperature

### Weather Data Layout
- Sidebar + main panel layout: location list on the left, weather details fill the right panel
- Temperature is the hero element: giant neon-glowing number, everything else is smaller around it
- Weather condition icons use neon outline style (line-art with glow effect), consistent with the overall neon theme
- Default window size is medium (~600x700) — comfortable viewing without dominating the desktop

### Zip Code Entry Flow
- First launch shows a dedicated welcome screen: "Enter your zip code to get started" with a prominent input field
- After first launch, zip input lives in the sidebar — "+Add" button opens an inline input field
- Invalid zip shows inline error: red/orange glow on the input field with error text below
- Valid zip auto-navigates: immediately fetches weather and switches to the new location as active

### Error & Loading States
- Loading uses skeleton + pulse pattern: neon-outlined placeholder shapes that pulse/glow while data is fetching, showing where content will appear
- API errors display as an inline error card: neon-bordered card in the main content area with error message + retry button
- Stale data handling: if a refresh fails but old data exists, keep displaying last successful data with a subtle "data may be outdated" warning indicator
- Auto-retry 2x silently on failure before showing error to user — transient failures are invisible

### Claude's Discretion
- Exact spacing, padding, and typography sizing within the neon theme
- Specific sans-serif and mono font choices (Inter/Outfit and JetBrains Mono/Orbitron are suggestions, not hard requirements)
- Grid overlay line opacity and spacing
- Exact skeleton placeholder shapes and pulse animation timing
- Welcome screen illustration/graphic design

</decisions>

<specifics>
## Specific Ideas

- Tron-style cyber grid on the background — faint lines creating depth
- Temperature should glow like a neon sign — the hero visual of the entire app
- Dual color scheme (cyan + magenta/purple) creates visual hierarchy: primary data in cyan, secondary/accent elements in magenta
- Icons should be line-art outlines with glow, not filled shapes — consistent with neon sign aesthetic

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- This phase establishes the foundational architecture: Electron main/preload/renderer structure, IPC bridge, design system tokens, and data fetching service that all subsequent phases build on

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-01*
