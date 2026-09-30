# POLARIS — PROJECT_STATE

**Project:** POLARIS (Polar Operations & Logistics Advanced Remote Intelligence System) — SIH 2026, PS ID 26060 (MoES / NCPOR).
**All telemetry is SIMULATED and must always be labelled "SIMULATION / DEMO TELEMETRY".**

## Current phase
Phase 7 COMPLETE (What-If Simulation + Safety Protocols). Phases 1-7 are done. Next: Phase 8 (Polish, demo-flow test, README).

## Completed features
- Vite + React + TS + Tailwind v4 + Recharts project, builds cleanly (`npm run build`)
- Simulation banner, header with IST/UTC clocks, nav tabs (future tabs disabled with phase labels)
- Summary strip: stations online, personnel, active missions, open alerts
- Station cards for Maitri and Bharati: temp, wind, power (load/gen), personnel, fuel/water/comms/power-margin meters, generation sparkline, mission progress
- Station selection (state `selected` in App.tsx; highlighted card)
- Live telemetry simulation (2 s tick, random walk + mean reversion, fuel/water slowly drain)
- Alerts derived from telemetry thresholds (`deriveAlerts`) and per-station health level
- Live operations feed (routine simulated events)

- **Phase 2:** Digital Twin tab. SVG schematic of the selected station with 8 clickable systems (Generator 1, Generator 2, Heating, Research Lab, Communications, Water, Storage, Power), animated power/fuel lines, status colours, health bars, System Inspector panel (status, health, telemetry, note), station switcher, wind/temp readout, keyboard accessible. Command Center tab unchanged; header tabs now switch views (`view` state in App.tsx); Command Center has an "Open Digital Twin" button.
- **Phase 3:** Environment and Energy tabs use the existing selected station and live simulation. Environment shows temperature, wind, pressure, visibility, snowfall, derived weather condition, a wind/snow/visibility blizzard-risk score, atmospheric trends, and weather alerts. Energy shows generation, consumption, margin, generator load, estimated fuel consumption/endurance, battery state/backup duration, resource reserves, and live generation/load/battery trends. No backend or parallel telemetry store.
- **Phase 4:** Research and Logistics tabs share the station selection and `Station` data. Missions include IDs, team, active/paused/standby/completed state, live collection progress, and checked environmental/operational requirements; operators can start, pause, resume, or close a mission. Logistics tracks fuel, food, water, medical supplies, oxygen, and spares with stock, modelled consumption rates, endurance, inbound cargo manifests, and simulated ETAs. Cargo receipt applies shipment contents to station stock; shipments also deliver automatically at ETA zero. Supply consumption and mission collection advance in the existing simulation tick.
- **Phase 5:** Incidents tab runs generator failure, blizzard, communication failure, and low-fuel scenarios against the existing station telemetry. Active incidents, severity, affected systems, recommended response, and timestamped timelines are stored on `Station`; activation changes generator output, weather, comms, or fuel values used throughout the app. Active incidents contribute derived station alerts, show on Command Center cards, and change Digital Twin health/metrics. Trigger and resolution entries are added to the existing live operations feed. Resolving an incident restores or stabilizes its affected telemetry and retains a resolved history record.
- **Phase 6:** AI Operations Assistant tab uses a deterministic local rules engine over the selected or explicitly named station's current telemetry. It answers sustainability horizon, research pause, Generator 1 failure, limiting resource, and external-weather-operation questions. Each report includes recommendation, reason, risk, affected systems, and recommended action. Answers are recomputed against live station data on render, so incidents, weather, energy, supplies, and mission state affect the assessments. No API key, external AI service, or backend.
- **Phase 7:** What-If tab previews Generator Failure, Blizzard, Low Fuel, Communication Failure, and Power Surge against a copied station snapshot. It compares current/simulated weather, generation/load/margin, battery, fuel, communications, active incidents, limiting supply/endurance, research mission states, and shelter status; it derives system impacts and risk using existing alert, system, and mission requirement rules. Preview/reset never writes to real station state. The executable Blizzard Safety Protocol is separate: it suspends external operations, pauses field missions, shelters station personnel, marks heating priority, and sheds non-critical load on the real station. Its state/timeline is visible in What-If, Research, Environment, Command Center, alerts, Digital Twin, and the AI assistant. Stand-down restores previous load and resumes only missions whose requirements pass.

## Architecture
- `src/data.ts`: types, INITIAL_STATIONS, derived `blizzardRisk`, `weatherCondition`, supply consumption/endurance, mission requirement checks, `deriveAlerts`, `stationLevel`, `LEVEL_STYLE`. Single source of truth for the data model.
- `src/sim/useSimulation.ts`: hook returning station/feed data and mission/cargo actions; owns the tick loop, simulated telemetry, mission progress, supply consumption, and shipment ETAs/receipt.
- `src/components/StationCard.tsx`: presentational card.
- `src/components/EnvironmentView.tsx`: selected-station weather telemetry, risk, trends and weather alerts.
- `src/components/EnergyView.tsx`: selected-station energy balance, reserve estimates and trends.
- `src/components/ResearchView.tsx`: mission register, live requirements, collection progress, filters and mission controls.
- `src/components/LogisticsView.tsx`: live inventory/endurance and incoming supply missions with cargo receipt controls.
- `src/components/IncidentsView.tsx`: scenario controls, active response queue, recommendations, timeline, and incident resolution/history.
- `src/components/AssistantView.tsx`: live station context, suggested assessments, operator question input, and structured decision reports.
- `src/assistant/decisionEngine.ts`: pure keyword-routed decision rules and structured analysis based on `Station` telemetry.
- `src/components/WhatIfView.tsx`: isolated current-vs-simulated state comparisons, scenario impacts/actions, and executable/stand-down safety protocol controls.
- `src/whatIf/simulation.ts`: pure What-If scenario transformations using existing Station, alerts, Twin systems, supply endurance, and mission requirement calculations; does not mutate live simulation state.
- `src/sim/useSimulation.ts`: hook returning station/feed data and mission/cargo/protocol actions; owns the tick loop, simulated telemetry, mission progress, supply consumption, shipment ETAs/receipt, and real safety-protocol state changes.
- `src/App.tsx`: layout; `view` state switches command, twin, environment, energy, research, logistics, incident, assistant, and What-If tab content; no router. `TABS` maps built tabs to views (null = not built yet).
- What-If scenarios are in-memory derived snapshots and are discarded on reset, station switch, or reload; safety-protocol execution is a real simulated station-state change and resets on page reload like other simulation state.
- `src/twin/systems.ts`: `deriveSystems(station)` — pure function turning Station telemetry and active incident effects into 8 `SystemInfo` (level, health 0-100, metrics, note). No separate store; systems update live with the simulation. Exports `SystemId`, `levelOf`.
- `src/components/TwinView.tsx`: SVG schematic + inspector. Props: station, level, stations, onSelectStation. Local state: selected system id.
- `src/App.tsx`: layout; `view` state switches command, twin, environment, energy, research, logistics, incident, and assistant tab content; no router. `TABS` maps built tabs to views (null = not built yet).
- Incident triggers and resolution are actions in `src/sim/useSimulation.ts`; scenario impact is applied to Station telemetry and active incident records persist on that station. Generator failure removes Generator 1's 55% share; the Twin shows Generator 1 isolated and Generator 2 carrying available output.
- Alerts are DERIVED from station state, not stored. Incidents (Phase 5) should mutate station state (or an `incidents` list applied in the hook) so alerts follow automatically.

## File structure
```
polaris/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ PROJECT_STATE.md
├─ HANDOFF.md
└─ src/
   ├─ main.tsx
   ├─ index.css
   ├─ App.tsx
   ├─ data.ts
   ├─ sim/useSimulation.ts
   ├─ twin/systems.ts
   └─ components/
      ├─ StationCard.tsx
      └─ TwinView.tsx
```

## Dependencies
react, react-dom, recharts; dev: vite, @vitejs/plugin-react, typescript, tailwindcss + @tailwindcss/vite (v4, no tailwind.config file needed), @types/react, @types/react-dom. No backend. Leaflet not installed yet (add only if a map is wanted).

## How to run
```
npm install
npm run dev      # open the printed http://localhost:5173
npm run build    # type-check + production build
```

## Known issues
- Feed includes incident trigger and resolution events plus routine simulated operations; derived alert transitions are not separately logged.
- Bundle >500 kB warning (Recharts) — harmless.
- Tabs after Digital Twin are disabled placeholders; no router (view state only).
- Digital Twin system values (runtime hours, boiler temp, bus voltage, generator 55/45 split, tank sizes 200,000 L fuel / 80,000 L water) are fixed simulated constants in systems.ts.
- Incident persistence is in-memory only and resets on page reload, like all simulation state.
- Assistant intent recognition is a local deterministic ruleset; unrecognized prompts receive a station-wide operational summary rather than a generated free-form answer.
- Simulation state lives in one hook; Phase 7 still needs snapshot/restore support for what-if scenarios.

## Remaining work
- Phase 7: What-if simulation + safety protocol (before/after)
- Phase 8: Polish, demo-flow test, README
