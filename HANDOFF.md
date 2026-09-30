# HANDOFF — for a chat continuing POLARIS

You are continuing a Smart India Hackathon 2026 project (PS 26060, MoES/NCPOR): **POLARIS**, a web Antarctic Research Operations Command Center for India's Maitri and Bharati stations. The user is a BEGINNER: give exact commands, exact file paths, and full file contents. Do not rewrite working code unnecessarily.

## Rules
1. Build ONE phase at a time (phases listed in PROJECT_STATE.md → Remaining work); Phases 1-7 are complete.
2. All data is simulated; keep the "SIMULATION / DEMO TELEMETRY" banner.
3. No API-key dependence. AI assistant = local rule-based engine (optional API later).
4. Stack: React + TS + Vite + Tailwind v4 + Recharts. Avoid a backend unless truly needed.
5. Style: dark mission-control (slate-950 bg, cyan accents, amber/red for warnings, mono font for numbers). Not a generic admin dashboard.
6. At the end of EVERY phase update PROJECT_STATE.md and HANDOFF.md, and end with the copy-paste block below.
7. Verify `npm run build` passes before delivering.

## State
Read PROJECT_STATE.md and the files in `src/`. Phases 1-7 are done. `Station` in `src/data.ts` remains the single telemetry source. What-If scenario definitions and pure transformations live in `src/whatIf/simulation.ts`; they compare derived station snapshots and never update the real simulation. `WhatIfView.tsx` offers five contingencies and reset/exit, plus the real Blizzard Safety Protocol. Protocol execution and stand-down actions live in `useSimulation`; execution updates the station's safety-protocol record, external-operation status, mission states, and power load, then the other views, alerts, incidents, and local AI read the same state. No backend or external API. Continue with Phase 8 only, preserving the simulation banner and existing features.

## Final demo flow to support
Open POLARIS → select Maitri → inspect digital twin → environmental warning → execute safety protocol → simulate generator failure → automatic response → ask AI about 30-day sustainability → run a what-if.

## Next task
Phase 8: Polish, demo-flow test, README (keep Phases 1-7 working).

===== COPY THIS INTO A NEW CLAUDE CHAT =====
I'm building POLARIS, my Smart India Hackathon 2026 project (React + TypeScript + Vite + Tailwind v4 + Recharts). I'm attaching my project files plus PROJECT_STATE.md and HANDOFF.md. Read both first, then continue with the next phase listed in PROJECT_STATE.md (currently Phase 8: Polish, demo-flow test, README). I'm a beginner: give exact commands and file paths, don't rewrite working code, build only that one phase, and update PROJECT_STATE.md and HANDOFF.md at the end.
===== END =====
