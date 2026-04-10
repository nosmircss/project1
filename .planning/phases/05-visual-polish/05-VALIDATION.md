---
phase: 5
slug: visual-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | VISL-01 | unit | `npx vitest run src/renderer/src/lib/__tests__/particleEffects.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | VISL-01 | manual | Visual inspection in `npm run dev` | — | ⬜ pending |
| 05-02-01 | 02 | 2 | VISL-01 | manual | Visual inspection in `npm run dev` | — | ⬜ pending |
| 05-03-01 | 03 | 2 | VISL-02 | manual | Visual inspection in `npm run dev` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/renderer/src/lib/__tests__/particleEffects.test.ts` — unit tests for `getEffectConfig()` WMO code → effect mapping (VISL-01)

*Existing infrastructure covers remaining requirements via manual verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canvas particle rendering | VISL-01 | Requires real browser/Electron window — Vitest runs in Node env without DOM | Run `npm run dev`, verify particles match weather code for each condition |
| Particle performance at idle | VISL-01 | CPU measurement requires runtime profiling | Run `npm run dev`, check Task Manager CPU when app is visible with clear sky |
| Location crossfade transition | VISL-02 | CSS opacity transition requires visual verification | Run `npm run dev`, switch locations, verify smooth fade with no flash |
| Cached location crossfade | VISL-02 | Cached-hit edge case requires visual inspection | Switch to previously visited location, verify fade still occurs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
