import { useEffect, useRef, useState } from 'react';
import { LEVEL_STYLE, type Station } from '../data';
import { runWhatIf, SCENARIOS, type ScenarioState, type WhatIfScenario } from '../whatIf/simulation';

function Metric({ label, value, unit, tone }: { label: string; value: string; unit: string; tone?: string }) {
  return <div className="border-l border-slate-800 pl-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className={`mono mt-1 text-lg ${tone ?? 'text-slate-100'}`}>{value}<span className="ml-1 text-xs text-slate-500">{unit}</span></div></div>;
}

function StatePanel({ title, state, risk, simulated = false }: { title: string; state: ScenarioState; risk: string; simulated?: boolean }) {
  return (
    <section className={`border bg-slate-950/75 ${simulated ? 'border-cyan-900/60' : 'border-slate-800'}`}>
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5"><h3 className="text-xs uppercase tracking-widest text-slate-300">{title}</h3><span className={`mono rounded border px-2 py-0.5 text-[10px] ${LEVEL_STYLE[risk as keyof typeof LEVEL_STYLE]}`}>{risk}</span></div>
      <div className="grid grid-cols-2 gap-y-4 p-4 sm:grid-cols-3">
        <Metric label="Generation" value={state.generationKw.toFixed(0)} unit="kW" />
        <Metric label="Consumption" value={state.consumptionKw.toFixed(0)} unit="kW" />
        <Metric label="Power margin" value={state.marginKw.toFixed(0)} unit="kW" tone={state.marginKw < 0 ? 'text-red-300' : 'text-emerald-300'} />
        <Metric label="Battery" value={state.batteryPct.toFixed(0)} unit="%" />
        <Metric label="Fuel" value={state.fuelPct.toFixed(0)} unit="%" />
        <Metric label="Communications" value={state.commsPct.toFixed(0)} unit="%" />
        <Metric label="Wind" value={state.windKmh.toFixed(0)} unit="km/h" />
        <Metric label="Visibility" value={state.visibilityKm.toFixed(1)} unit="km" />
        <Metric label="Snowfall" value={state.snowfallCmHr.toFixed(1)} unit="cm/h" />
        <Metric label="Active missions" value={String(state.activeMissions)} unit="" />
        <Metric label="Paused missions" value={String(state.pausedMissions)} unit="" />
        <Metric label="Personnel sheltered" value={String(state.shelteredPersonnel)} unit="" tone={state.shelteredPersonnel ? 'text-emerald-300' : undefined} />
        <Metric label="Limiting supply" value={state.limitingSupply} unit={`${state.limitingDays.toFixed(1)} d`} tone={state.limitingDays < 7 ? 'text-amber-300' : undefined} />
        <Metric label="Active incidents" value={String(state.activeIncidentCount)} unit="" tone={state.activeIncidentCount ? 'text-red-300' : undefined} />
      </div>
      {(state.externalOperationsSuspended || state.heatingPriority) && <div className="border-t border-slate-800 px-4 py-2 text-[10px] uppercase tracking-widest text-amber-300">{state.externalOperationsSuspended ? 'External operations suspended' : ''}{state.externalOperationsSuspended && state.heatingPriority ? ' · ' : ''}{state.heatingPriority ? 'Heating priority active' : ''}</div>}
    </section>
  );
}

export default function WhatIfView({ stations, station, onSelectStation, onExecuteProtocol, onStandDownProtocol, focusProtocol, onProtocolFocused }: {
  stations: Station[]; station: Station; onSelectStation: (id: string) => void;
  onExecuteProtocol: (stationId: string) => void; onStandDownProtocol: (stationId: string) => void;
  focusProtocol: boolean; onProtocolFocused: () => void;
}) {
  const [scenario, setScenario] = useState<WhatIfScenario | null>(null);
  const protocolRef = useRef<HTMLElement>(null);
  const result = scenario ? runWhatIf(station, scenario) : null;
  const protocol = station.safetyProtocol;

  useEffect(() => {
    if (!focusProtocol) return;
    protocolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onProtocolFocused();
  }, [focusProtocol, onProtocolFocused]);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
        <div><p className="mono text-[10px] uppercase tracking-[0.24em] text-cyan-500">Contingency planning / isolated simulation</p><h2 className="mt-1 text-xl font-semibold tracking-wide text-white">What-If <span className="text-slate-500">/ {station.name.toUpperCase()}</span></h2></div>
        <div className="flex gap-1">{stations.map(s => <button key={s.id} onClick={() => { if (s.id !== station.id) setScenario(null); onSelectStation(s.id); }} className={`rounded border px-3 py-1.5 text-xs tracking-widest ${s.id === station.id ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{s.name.toUpperCase()}</button>)}</div>
      </div>

      <section className="border border-cyan-900/40 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="text-xs uppercase tracking-widest text-slate-300">Scenario library</h3><p className="mono mt-1 text-[10px] text-slate-600">SNAPSHOT PREVIEW · LIVE STATION STATE IS NOT MODIFIED</p></div><span className="mono text-[10px] text-cyan-500">SIMULATION / DEMO TELEMETRY</span></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{SCENARIOS.map(item => <button key={item.id} onClick={() => setScenario(item.id)} className={`min-h-24 rounded border p-3 text-left transition ${scenario === item.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'}`}><span className={`text-xs font-semibold uppercase tracking-wider ${scenario === item.id ? 'text-cyan-200' : 'text-slate-300'}`}>{item.name}</span><span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{item.description}</span></button>)}</div>
      </section>

      {result ? <>
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="mono text-[10px] uppercase tracking-widest text-cyan-600">{result.scenario.name} · consequence preview</p><p className="mt-1 text-xs text-slate-500">Simulated values are derived from the selected station snapshot. Choose another scenario or reset to exit without applying changes.</p></div><button onClick={() => setScenario(null)} className="rounded border border-slate-700 px-3 py-1.5 text-xs uppercase tracking-wider text-slate-300 hover:border-cyan-600 hover:text-cyan-200">Reset / exit simulation</button></div>
        <section className="grid gap-3 xl:grid-cols-2">
          <StatePanel title="Current state" state={result.current} risk={result.current.risk} />
          <StatePanel title="Preview state · not applied" state={result.simulated} risk={result.risk} simulated />
        </section>
        <section className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
          <div className="border border-slate-800 bg-slate-950/70 p-4"><h3 className="text-xs uppercase tracking-widest text-slate-400">Impacted systems</h3><div className="mt-3 flex flex-wrap gap-2">{result.impactedSystems.map(system => <span key={system} className="mono border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-xs text-amber-200">{system}</span>)}</div><p className="mono mt-4 text-[10px] uppercase tracking-widest text-slate-600">Scenario risk · <span className={result.risk === 'CRITICAL' ? 'text-red-300' : result.risk === 'WARNING' ? 'text-amber-300' : 'text-slate-300'}>{result.risk}</span></p></div>
          <div className="border border-slate-800 bg-slate-950/70 p-4"><h3 className="text-xs uppercase tracking-widest text-slate-400">Recommended actions</h3><ol className="mt-3 space-y-2">{result.actions.map((action, index) => <li key={action} className="flex gap-3 text-sm text-slate-300"><span className="mono text-cyan-600">0{index + 1}</span>{action}</li>)}</ol></div>
        </section>
      </> : <div className="border border-dashed border-slate-800 px-4 py-5 text-center text-sm text-slate-500">Select a contingency scenario to compare current and simulated station states.</div>}

      <section ref={protocolRef} id="blizzard-safety-protocol" className="scroll-mt-40 border border-amber-900/50 bg-slate-950/80">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3"><div><p className="mono text-[10px] uppercase tracking-widest text-amber-500">Executable station action</p><h3 className="mt-1 text-base font-semibold text-white">Blizzard Safety Protocol</h3><p className="mt-1 max-w-2xl text-xs text-slate-500">Unlike What-If previews, executing this protocol changes the real simulated station state and coordinates with active missions, station load, alerts, and the operations assistant.</p></div><div>{protocol.active ? <button onClick={() => onStandDownProtocol(station.id)} className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs uppercase tracking-widest text-amber-200 hover:bg-amber-500/20">Stand down protocol</button> : <button onClick={() => onExecuteProtocol(station.id)} className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs uppercase tracking-widest text-red-200 hover:bg-red-500/20">Execute safety protocol</button>}</div></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">{[
          ['External operations', protocol.active ? 'SUSPENDED' : 'NORMAL', protocol.active ? 'text-amber-300' : 'text-slate-400'],
          ['Heating priority', protocol.heatingPriority ? 'PRIORITIZED' : 'NORMAL', protocol.heatingPriority ? 'text-emerald-300' : 'text-slate-400'],
          ['Non-critical load shed', `${protocol.powerReductionKw.toFixed(0)} kW`, protocol.active ? 'text-cyan-300' : 'text-slate-400'],
          ['Personnel sheltered', `${protocol.shelteredPersonnel} / ${station.personnel}`, protocol.active ? 'text-emerald-300' : 'text-slate-400'],
        ].map(([label, value, tone]) => <div key={label} className="border-l border-slate-800 pl-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className={`mono mt-1 text-sm ${tone}`}>{value}</div></div>)}</div>
        {protocol.active && <div className="border-t border-slate-800 px-4 py-3"><div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400"><span>Live load now <span className="mono text-cyan-300">{station.loadKw.toFixed(0)} kW</span></span><span>Previous load <span className="mono text-slate-200">{(protocol.previousLoadKw ?? station.loadKw).toFixed(0)} kW</span></span><span>Paused field missions <span className="mono text-amber-200">{protocol.pausedMissionIds.length}</span></span></div><ol className="mt-3 space-y-1 border-l border-slate-800 pl-3">{protocol.timeline.map((event, index) => <li key={`${event.time}-${index}`} className="text-xs text-slate-400"><span className="mono mr-2 text-[10px] text-cyan-600">{event.time}</span>{event.text}</li>)}</ol></div>}
      </section>
      <p className="pb-4 text-center text-[10px] uppercase tracking-widest text-slate-600">What-If scenarios are disposable snapshots · safety protocol execution changes live in-memory demo telemetry</p>
    </main>
  );
}