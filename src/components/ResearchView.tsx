import { useState } from 'react';
import { requirementMet, type MissionState, type Station } from '../data';

type Filter = 'ALL' | MissionState;
const FILTERS: Filter[] = ['ALL', 'ACTIVE', 'PAUSED', 'STANDBY', 'COMPLETED'];
const STATE_STYLE: Record<MissionState, string> = {
  ACTIVE: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  PAUSED: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  STANDBY: 'text-slate-400 border-slate-600/50 bg-slate-800/40',
  COMPLETED: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
};

export default function ResearchView({ stations, station, onSelectStation, onSetMissionState }: {
  stations: Station[]; station: Station; onSelectStation: (id: string) => void;
  onSetMissionState: (stationId: string, missionId: string, state: MissionState) => void;
}) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const active = station.missions.filter(m => m.state === 'ACTIVE').length;
  const completed = station.missions.filter(m => m.state === 'COMPLETED').length;
  const collection = station.missions.length ? station.missions.reduce((sum, m) => sum + m.progress, 0) / station.missions.length : 0;
  const missions = station.missions.filter(m => filter === 'ALL' || m.state === filter);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
        <div><p className="mono text-[10px] uppercase tracking-[0.24em] text-cyan-500">Science operations / live simulation</p><h2 className="mt-1 text-xl font-semibold tracking-wide text-white">Research <span className="text-slate-500">/ {station.name.toUpperCase()}</span></h2></div>
        <div className="flex gap-1">{stations.map(s => <button key={s.id} onClick={() => onSelectStation(s.id)} className={`rounded border px-3 py-1.5 text-xs tracking-widest ${s.id === station.id ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{s.name.toUpperCase()}</button>)}</div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Mission portfolio', String(station.missions.length)], ['Active collection', String(active)],
          ['Completed', String(completed)], ['Mean data progress', `${collection.toFixed(0)}%`],
        ].map(([label, value]) => <div key={label} className="border-b border-slate-800 bg-slate-950/60 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className="mono mt-1 text-xl text-cyan-300">{value}</div></div>)}
      </section>
      {station.safetyProtocol.active && <div className="border-l-2 border-amber-400 bg-amber-500/5 px-4 py-2 text-xs text-amber-200"><span className="mono mr-2 text-[10px] uppercase tracking-widest">Field operations suspended</span>Blizzard Safety Protocol active · {station.safetyProtocol.shelteredPersonnel} personnel returned to shelter.</div>}

      <section className="rounded-lg border border-slate-800 bg-slate-950/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div><h3 className="text-xs uppercase tracking-widest text-slate-300">Station mission register</h3><p className="mono mt-1 text-[10px] text-slate-600">MISSION CONTROL · DATA COLLECTION · REQUIREMENT STATUS</p></div>
          <div className="flex gap-1 overflow-x-auto">{FILTERS.map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wider ${filter === value ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{value}</button>)}</div>
        </div>
        <div className="divide-y divide-slate-800/80">
          {missions.map(m => {
            const fieldMission = m.requirements.some(r => r.condition === 'WEATHER_WINDOW' || r.condition === 'WIND_MAX');
            const protocolHold = station.safetyProtocol.active && fieldMission;
            const ready = m.requirements.every(r => requirementMet(station, r)) && !protocolHold;
            return (
              <article key={m.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="mono text-[10px] text-cyan-500">{m.id}</span><span className={`mono rounded border px-1.5 py-0.5 text-[10px] ${STATE_STYLE[m.state]}`}>{m.state}</span>{m.state === 'ACTIVE' && <span className={`mono text-[10px] ${ready ? 'text-emerald-400' : 'text-amber-400'}`}>{ready ? 'COLLECTING' : protocolHold ? 'HOLD · SAFETY PROTOCOL' : 'HOLD · REQUIREMENT'}</span>}</div>
                  <h4 className="mt-1 text-base font-medium text-white">{m.name}</h4>
                  <p className="mt-1 text-xs text-slate-500">Research team <span className="text-slate-300">{m.team}</span></p>
                  <div className="mt-4 flex items-center justify-between text-xs"><span className="uppercase tracking-widest text-slate-500">Data collection</span><span className="mono text-slate-200">{m.progress.toFixed(1)}%</span></div>
                  <div className="mt-1.5 h-2 rounded bg-slate-800"><div className={`h-full rounded transition-[width] ${m.state === 'COMPLETED' ? 'bg-cyan-400' : 'bg-emerald-400'}`} style={{ width: `${m.progress}%` }} /></div>
                </div>
                <aside className="border-l border-slate-800 pl-4">
                  <h5 className="text-[10px] uppercase tracking-widest text-slate-500">Environmental & operational requirements</h5>
                  <ul className="mt-2 space-y-1.5">{m.requirements.map(req => {
                    const met = requirementMet(station, req) && !protocolHold;
                    return <li key={req.label} className="flex items-start gap-2 text-xs"><span className={`mono mt-px ${met ? 'text-emerald-400' : 'text-amber-400'}`}>{met ? 'OK' : 'HOLD'}</span><span className={met ? 'text-slate-400' : 'text-amber-200/80'}>{req.label}</span></li>;
                  })}</ul>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.state === 'ACTIVE' && <button onClick={() => onSetMissionState(station.id, m.id, 'PAUSED')} className="rounded border border-amber-500/40 px-2.5 py-1 text-[10px] uppercase tracking-wider text-amber-300 hover:bg-amber-500/10">Pause</button>}
                    {(m.state === 'PAUSED' || m.state === 'STANDBY') && <button disabled={!ready} onClick={() => onSetMissionState(station.id, m.id, 'ACTIVE')} title={!ready ? 'Resolve outstanding requirements before starting' : ''} className="rounded border border-emerald-500/40 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-300 enabled:hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40">{m.state === 'PAUSED' ? 'Resume' : 'Start'}</button>}
                    {m.state !== 'COMPLETED' && <button onClick={() => onSetMissionState(station.id, m.id, 'COMPLETED')} className="rounded border border-cyan-500/40 px-2.5 py-1 text-[10px] uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/10">Close mission</button>}
                  </div>
                </aside>
              </article>
            );
          })}
          {missions.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No missions in this state for {station.name}.</p>}
        </div>
        <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-600">Active missions collect data on each simulation tick when requirements are satisfied. Progress and state are shared with the Command Center.</p>
      </section>
    </main>
  );
}