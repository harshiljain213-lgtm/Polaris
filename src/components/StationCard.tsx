import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { LEVEL_STYLE, type Level, type MissionState, type Station } from '../data';
import { getLatestNCPORObservation, getNCPORDataset } from '../services/ncporService';
import type { NCPORWeatherState } from '../services/ncporWeather';

const Meter = ({ label, value, low }: { label: string; value: number; low: number }) => (
  <div>
    <div className="flex justify-between text-[11px] text-slate-400">
      <span>{label}</span><span className="mono text-slate-200">{value.toFixed(0)}%</span>
    </div>
    <div className="mt-1 h-1.5 rounded bg-slate-800">
      <div className={`h-full rounded ${value < low ? 'bg-red-500' : value < low * 1.6 ? 'bg-amber-400' : 'bg-cyan-400'}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const Stat = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
  <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
    <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
    <div className="mono text-lg text-slate-100">{value}<span className="ml-1 text-xs text-slate-500">{unit}</span></div>
  </div>
);

const MISSION_COLOR: Record<MissionState, string> = { ACTIVE: 'text-emerald-300', PAUSED: 'text-amber-300', STANDBY: 'text-slate-400', COMPLETED: 'text-cyan-300' };

export default function StationCard({ s, level, selected, onSelect, weatherState }: { s: Station; level: Level; selected: boolean; onSelect: () => void; weatherState: NCPORWeatherState }) {
  const activeIncidents = s.incidents.filter(incident => incident.status === 'ACTIVE');
  const dataset = getNCPORDataset(s.id);
  const observation = getLatestNCPORObservation(s.id);
  return (
    <section role="button" tabIndex={0} aria-pressed={selected} onClick={onSelect}
      onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && onSelect()}
      className={`cursor-pointer rounded-lg border bg-slate-950/70 p-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${selected ? 'border-cyan-400/70 shadow-[0_0_24px_-6px_rgba(34,211,238,0.5)]' : 'border-slate-800 hover:border-slate-600'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-wide text-white">{s.name.toUpperCase()}</h2>
          <p className="mono text-xs text-slate-500">{s.coords} · {s.region}</p>
          {activeIncidents.length > 0 && <p className="mono mt-1 text-[10px] uppercase tracking-widest text-red-300">{activeIncidents.length} ACTIVE INCIDENT{activeIncidents.length === 1 ? '' : 'S'} · {activeIncidents[0].type.replace(/_/g, ' ')}</p>}
          {s.safetyProtocol.active && <p className="mono mt-1 text-[10px] uppercase tracking-widest text-amber-300">BLIZZARD SAFETY PROTOCOL · {s.safetyProtocol.shelteredPersonnel} SHELTERED</p>}
        </div>
        <span className={`mono rounded border px-2 py-0.5 text-xs ${LEVEL_STYLE[level]}`}>{level}</span>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Temp" value={s.tempC.toFixed(1)} unit="°C" />
        <Stat label="Wind" value={s.windKmh.toFixed(0)} unit="km/h" />
        <Stat label="Power" value={`${s.loadKw.toFixed(0)}/${s.genKw.toFixed(0)}`} unit="kW" />
        <Stat label="Personnel" value={String(s.personnel)} unit="on station" />
      </div>

      <div className="mt-3 border-l-2 border-sky-500/50 bg-sky-500/5 px-3 py-2">
        <div className="mono text-[9px] uppercase tracking-widest text-sky-400">SOURCE: {dataset.source}</div>
        <p className="mt-1 text-[10px] text-slate-400">{observation ? `NCPOR report ${observation.observedAt} · ${observation.temperatureC?.toFixed(1) ?? 'N/A'}°C · wind ${observation.reportedWindSpeed?.toFixed(2) ?? 'N/A'} ${observation.reportedWindSpeedUnit ?? ''}` : 'No NCPOR observations in local dataset.'}</p>
      </div>
      <div className="mt-2 border-l-2 border-cyan-500/50 bg-cyan-500/5 px-3 py-2">
        <div className="mono text-[9px] uppercase tracking-widest text-cyan-400">NCPOR WIND RISK</div>
        <p className="mono mt-1 text-[10px] text-slate-300">{weatherState.status === 'unavailable' ? weatherState.reason : `${weatherState.risk} · ${weatherState.windKmh === null ? 'wind unavailable' : `${weatherState.windKmh.toFixed(0)} km/h`}`}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meter label="Fuel" value={s.fuelPct} low={20} />
        <Meter label="Water" value={s.waterPct} low={25} />
        <Meter label="Comms" value={s.commsPct} low={40} />
        <Meter label="Power margin" value={Math.max(0, ((s.genKw - s.loadKw) / s.genKw) * 100)} low={5} />
      </div>

      <div className="mt-3 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={s.history}>
            <YAxis hide domain={['auto', 'auto']} />
            <Line type="monotone" dataKey="power" stroke="#22d3ee" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-slate-600">Generation trend (kW)</p>

      <div className="mt-3 space-y-1.5">
        {s.missions.map(m => (
          <div key={m.name} className="text-xs">
            <div className="flex justify-between"><span className="text-slate-300">{m.name}</span><span className={`mono ${MISSION_COLOR[m.state]}`}>{m.state} · {m.progress.toFixed(0)}%</span></div>
            <div className="mt-1 h-1 rounded bg-slate-800"><div className="h-full rounded bg-emerald-400/70" style={{ width: `${m.progress}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
