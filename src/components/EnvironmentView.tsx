import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { deriveAlerts, LEVEL_STYLE, type Station, weatherCondition } from '../data';
import { getNCPORDataset } from '../services/ncporService';
import type { NCPORWeatherState } from '../services/ncporWeather';

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="border-l border-slate-800 pl-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mono mt-1 text-slate-100 ${unit ? 'text-xl' : 'break-words text-sm leading-5'}`}>{value}{unit && <span className="ml-1 text-xs text-slate-500">{unit}</span>}</div>
    </div>
  );
}

export default function EnvironmentView({ stations, station, onSelectStation, weatherState }: {
  stations: Station[]; station: Station; onSelectStation: (id: string) => void; weatherState: NCPORWeatherState;
}) {
  const observation = weatherState.status === 'unavailable' ? null : weatherState.observation;
  const risk = weatherState.status === 'unavailable' ? 'UNAVAILABLE' : weatherState.risk;
  const condition = weatherCondition(station);
  const ncporDataset = getNCPORDataset(station.id);
  const weatherAlerts = deriveAlerts([station]).filter(a => /wind|blizzard|visibility|snowfall|temp/.test(a.id));
  const riskColor = risk === 'HIGH' ? 'text-red-300' : risk === 'CAUTION' ? 'text-amber-300' : risk === 'LOW' ? 'text-emerald-300' : 'text-slate-400';

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-cyan-500">NCPOR station data</p>
          <h2 className="mt-1 text-xl font-semibold tracking-wide text-white">Environment <span className="text-slate-500">/ {station.name.toUpperCase()}</span></h2>
        </div>
        <div className="flex gap-1">
          {stations.map(s => <button key={s.id} onClick={() => onSelectStation(s.id)} className={`rounded border px-3 py-1.5 text-xs tracking-widest ${s.id === station.id ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{s.name.toUpperCase()}</button>)}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {station.safetyProtocol.active && <div className="border-l-2 border-amber-400 bg-amber-500/5 px-4 py-2 text-xs text-amber-200 lg:col-span-2"><span className="mono mr-2 text-[10px] uppercase tracking-widest">Safety protocol active</span>External operations suspended · {station.safetyProtocol.shelteredPersonnel} personnel sheltered.</div>}
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div><h3 className="text-xs uppercase tracking-widest text-slate-300">NCPOR station observations</h3><p className="mono mt-1 text-[9px] text-slate-600">SOURCE: NCPOR MET-DATA</p></div>
          </div>
          {observation ? <>
            <p className="mono mb-3 text-[10px] text-slate-500">NCPOR REPORT {observation.observedAt} · TIMEZONE NOT PUBLISHED</p>
            <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-3">
              <Metric label="Air temperature" value={observation.temperatureC?.toFixed(1) ?? 'N/A'} unit="°C" />
              <Metric label="Wind speed" value={observation.reportedWindSpeed?.toFixed(2) ?? observation.windSpeedMps?.toFixed(2) ?? 'N/A'} unit={observation.reportedWindSpeedUnit ?? 'm/s'} />
              <Metric label="Wind direction" value={observation.windDirectionDeg?.toFixed(0) ?? 'N/A'} unit="°" />
              <Metric label="Air pressure" value={observation.pressureHpa?.toFixed(1) ?? 'N/A'} unit="hPa" />
              <Metric label="Relative humidity" value={observation.humidityPct?.toFixed(1) ?? 'N/A'} unit="%" />
              <Metric label="Station coordinates" value={`${observation.coordinates.latitude.toFixed(4)}, ${observation.coordinates.longitude.toFixed(4)}`} unit="" />
            </div>
          </> : <div className="border-l-2 border-amber-500/70 bg-amber-500/5 px-3 py-3 text-xs text-slate-400"><p>{weatherState.status === 'unavailable' ? weatherState.reason : 'No NCPOR observation is available.'}</p></div>}
          <p className="mono mt-3 border-t border-slate-800 pt-2 text-[9px] text-slate-600">{ncporDataset.portal} · {ncporDataset.mode} · <a href={ncporDataset.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-500 underline">OFFICIAL SOURCE PAGE</a> · COORDINATES FROM {ncporDataset.coordinateSource.toUpperCase()}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-4 border-b border-slate-800 pb-3"><h3 className="text-xs uppercase tracking-widest text-slate-300">Operational weather</h3></div>
          <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-3">
            <Metric label="Air temperature" value={station.tempC.toFixed(1)} unit="°C" />
            <Metric label="Wind speed" value={station.windKmh.toFixed(0)} unit="km/h" />
            <Metric label="Station pressure" value={station.pressureHpa.toFixed(1)} unit="hPa" />
            <Metric label="Visibility" value={station.visibilityKm.toFixed(1)} unit="km" />
            <Metric label="Snowfall" value={station.snowfallCmHr.toFixed(2)} unit="cm/h" />
            <Metric label="Weather condition" value={condition} unit="" />
          </div>
        </div>

        <aside className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs uppercase tracking-widest text-slate-400">NCPOR wind risk</h3>
            <span className={`mono text-lg font-semibold ${riskColor}`}>{risk}</span>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-baseline justify-between"><h3 className="text-xs uppercase tracking-widest text-slate-400">Atmospheric trend</h3><span className="mono text-[10px] text-slate-600">LAST 30 TICKS</span></div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={station.history}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 5" />
                <XAxis dataKey="t" tick={false} axisLine={false} tickLine={false} />
                <YAxis yAxisId="visibility" domain={[0, 25]} stroke="#38bdf8" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="snow" orientation="right" domain={[0, 3]} stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#07111f', border: '1px solid #1e293b', borderRadius: 4 }} labelStyle={{ color: '#94a3b8' }} />
                <Area yAxisId="visibility" type="monotone" dataKey="visibility" name="Visibility (km)" stroke="#38bdf8" fill="#0ea5e9" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="snow" type="monotone" dataKey="snowfall" name="Snowfall (cm/h)" stroke="#e2e8f0" strokeWidth={1.6} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-slate-800 pt-3">
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Pressure trend</div><div className="mt-1 h-12"><ResponsiveContainer width="100%" height="100%"><AreaChart data={station.history}><Area type="monotone" dataKey="pressure" stroke="#fbbf24" fill="#f59e0b" fillOpacity={0.08} strokeWidth={1.5} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Temperature trend</div><div className="mt-1 h-12"><ResponsiveContainer width="100%" height="100%"><AreaChart data={station.history}><Area type="monotone" dataKey="temp" stroke="#fb7185" fill="#f43f5e" fillOpacity={0.08} strokeWidth={1.5} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-baseline justify-between"><h3 className="text-xs uppercase tracking-widest text-slate-400">Weather alerts</h3><span className="mono text-[10px] text-slate-600">{weatherAlerts.length} ACTIVE</span></div>
          {weatherAlerts.length ? <ul className="space-y-2">{weatherAlerts.map(a => <li key={a.id} className={`mono rounded border px-2.5 py-2 text-xs ${LEVEL_STYLE[a.level]}`}>[{a.level}] {a.msg}</li>)}</ul> : <p className="mono rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-3 text-xs text-emerald-300">No active weather alerts. Conditions within operating thresholds.</p>}
        </div>
      </section>
    </main>
  );
}