import { LEVEL_STYLE, type Incident, type IncidentType, type Station } from '../data';

const SCENARIOS: { type: IncidentType; title: string; description: string; color: string }[] = [
  { type: 'GENERATOR_FAILURE', title: 'Generator failure', description: 'Trip Generator 1 and reduce available station generation.', color: 'border-red-500/40 text-red-300 hover:bg-red-500/10' },
  { type: 'BLIZZARD', title: 'Blizzard', description: 'Force severe wind, snowfall, low visibility, and falling pressure.', color: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10' },
  { type: 'COMMUNICATION_FAILURE', title: 'Communication failure', description: 'Drop the satellite link to emergency-beacon quality.', color: 'border-sky-500/40 text-sky-300 hover:bg-sky-500/10' },
  { type: 'LOW_FUEL', title: 'Low fuel', description: 'Set station fuel to emergency reserve and degrade generator health.', color: 'border-orange-500/40 text-orange-300 hover:bg-orange-500/10' },
];

function IncidentCard({ incident, stationId, onResolve }: { incident: Incident; stationId: string; onResolve: (stationId: string, incidentId: string) => void }) {
  const active = incident.status === 'ACTIVE';
  return (
    <article className={`border-l-2 ${active ? incident.severity === 'CRITICAL' ? 'border-red-400' : 'border-amber-400' : 'border-slate-700'} bg-slate-950/65`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className="mono text-[10px] text-slate-500">{incident.id}</span><span className={`mono rounded border px-1.5 py-0.5 text-[10px] ${LEVEL_STYLE[incident.severity]}`}>{incident.severity}</span><span className={`mono text-[10px] ${active ? 'text-amber-300' : 'text-slate-500'}`}>{incident.status}</span></div>
          <h3 className="mt-1 text-base font-medium text-white">{incident.title}</h3>
          <p className="mono mt-1 text-[10px] text-slate-600">{incident.type.replace(/_/g, ' ')} · RAISED {incident.raisedAt}{incident.resolvedAt ? ` · RESOLVED ${incident.resolvedAt}` : ''}</p>
        </div>
        {active && <button onClick={() => onResolve(stationId, incident.id)} className="rounded border border-emerald-500/50 bg-emerald-500/5 px-3 py-1.5 text-[10px] uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/15">Resolve incident</button>}
      </div>
      <div className="grid gap-4 px-4 py-3 md:grid-cols-2">
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-slate-500">Affected systems</h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{incident.affectedSystems.map(system => <span key={system} className="mono rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300">{system.toUpperCase()}</span>)}</div>
          <h4 className="mt-4 text-[10px] uppercase tracking-widest text-slate-500">Recommended actions</h4>
          <ol className="mt-1.5 space-y-1">{incident.recommendedActions.map((action, index) => <li key={action} className="flex gap-2 text-xs text-slate-400"><span className="mono text-cyan-600">0{index + 1}</span>{action}</li>)}</ol>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-slate-500">Incident timeline</h4>
          <ol className="mt-2 space-y-2 border-l border-slate-800 pl-3">{incident.timeline.map((event, index) => <li key={`${event.time}-${index}`} className="relative text-xs text-slate-300"><span className="absolute -left-[17px] top-1 h-1.5 w-1.5 rounded-full bg-cyan-500" /><span className="mono mr-2 text-[10px] text-cyan-600">{event.time}</span>{event.text}</li>)}</ol>
        </div>
      </div>
    </article>
  );
}

export default function IncidentsView({ stations, station, onSelectStation, onTrigger, onResolve }: {
  stations: Station[]; station: Station; onSelectStation: (id: string) => void;
  onTrigger: (stationId: string, type: IncidentType) => void;
  onResolve: (stationId: string, incidentId: string) => void;
}) {
  const active = station.incidents.filter(i => i.status === 'ACTIVE');
  const history = [...station.incidents].filter(i => i.status === 'RESOLVED').reverse();
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
        <div><p className="mono text-[10px] uppercase tracking-[0.24em] text-cyan-500">Response coordination / live simulation</p><h2 className="mt-1 text-xl font-semibold tracking-wide text-white">Incidents <span className="text-slate-500">/ {station.name.toUpperCase()}</span></h2></div>
        <div className="flex gap-1">{stations.map(s => <button key={s.id} onClick={() => onSelectStation(s.id)} className={`rounded border px-3 py-1.5 text-xs tracking-widest ${s.id === station.id ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{s.name.toUpperCase()}</button>)}</div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="border-l-2 border-red-400 bg-slate-950/60 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Active incidents</div><div className="mono mt-1 text-xl text-red-300">{active.length}</div></div>
        <div className="border-l-2 border-amber-400 bg-slate-950/60 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Critical severity</div><div className="mono mt-1 text-xl text-amber-300">{active.filter(i => i.severity === 'CRITICAL').length}</div></div>
        <div className="border-l-2 border-cyan-400 bg-slate-950/60 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Incident records</div><div className="mono mt-1 text-xl text-cyan-300">{station.incidents.length}</div></div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="text-xs uppercase tracking-widest text-slate-300">Scenario injection</h3><p className="mono mt-1 text-[10px] text-slate-600">APPLIES EFFECTS TO LIVE STATION TELEMETRY</p></div><span className="mono text-[10px] text-amber-400/80">SIMULATION ONLY</span></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map(scenario => {
            const disabled = active.some(i => i.type === scenario.type);
            return <button key={scenario.type} disabled={disabled} onClick={() => onTrigger(station.id, scenario.type)} className={`min-h-24 rounded border bg-slate-900/70 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${scenario.color}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">{scenario.title}</span><span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{disabled ? 'This scenario is already active at this station.' : scenario.description}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between"><h3 className="text-xs uppercase tracking-widest text-slate-400">Active response queue</h3><span className="mono text-[10px] text-slate-600">{active.length} OPEN</span></div>
        {active.length ? active.map(incident => <IncidentCard key={incident.id} incident={incident} stationId={station.id} onResolve={onResolve} />) : <p className="rounded border border-emerald-500/25 bg-emerald-500/5 px-4 py-5 text-center text-sm text-emerald-300">No active incidents at {station.name}. Station telemetry is nominal.</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between"><h3 className="text-xs uppercase tracking-widest text-slate-400">Incident history</h3><span className="mono text-[10px] text-slate-600">{history.length} RECORDS</span></div>
        {history.length ? history.map(incident => <IncidentCard key={incident.id} incident={incident} stationId={station.id} onResolve={onResolve} />) : <p className="rounded border border-slate-800 bg-slate-950/50 px-4 py-5 text-center text-sm text-slate-500">No incident records. Select a scenario above to begin a simulation.</p>}
      </section>
      <p className="pb-4 text-center text-[10px] uppercase tracking-widest text-slate-600">All incident scenarios and responses are simulated demonstration telemetry.</p>
    </main>
  );
}