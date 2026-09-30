import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Station } from '../data';

const FUEL_CAPACITY_L = 200_000;
const BATTERY_CAPACITY_KWH = 1_200;

function Metric({ label, value, unit, detail }: { label: string; value: string; unit: string; detail?: string }) {
  return (
    <div className="border-l border-slate-800 pl-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mono mt-1 text-2xl text-slate-100">{value}<span className="ml-1 text-xs text-slate-500">{unit}</span></div>
      {detail && <div className="mt-1 text-[10px] text-slate-500">{detail}</div>}
    </div>
  );
}

function ReserveBar({ label, value, warningAt }: { label: string; value: number; warningAt: number }) {
  const color = value < warningAt * 0.6 ? 'bg-red-400' : value < warningAt ? 'bg-amber-400' : 'bg-cyan-400';
  return <div><div className="flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="mono text-slate-200">{value.toFixed(0)}%</span></div><div className="mt-1 h-1.5 rounded bg-slate-800"><div className={`h-full rounded ${color}`} style={{ width: `${value}%` }} /></div></div>;
}

export default function EnergyView({ stations, station, onSelectStation }: {
  stations: Station[]; station: Station; onSelectStation: (id: string) => void;
}) {
  const margin = station.genKw - station.loadKw;
  const generatorLoad = (station.loadKw / Math.max(1, station.genKw)) * 100;
  const fuelBurnLDay = station.loadKw * 0.28 * 24;
  const fuelVolumeL = (station.fuelPct / 100) * FUEL_CAPACITY_L;
  const enduranceDays = fuelVolumeL / Math.max(1, fuelBurnLDay);
  const batteryKwh = (station.batteryPct / 100) * BATTERY_CAPACITY_KWH;
  const batteryHours = batteryKwh / Math.max(1, station.loadKw * 0.35);
  const marginTone = margin < 0 ? 'text-red-300' : margin < station.genKw * 0.1 ? 'text-amber-300' : 'text-emerald-300';

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-cyan-500">Power systems</p>
          <h2 className="mt-1 text-xl font-semibold tracking-wide text-white">Energy <span className="text-slate-500">/ {station.name.toUpperCase()}</span></h2>
        </div>
        <div className="flex gap-1">
          {stations.map(s => <button key={s.id} onClick={() => onSelectStation(s.id)} className={`rounded border px-3 py-1.5 text-xs tracking-widest ${s.id === station.id ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{s.name.toUpperCase()}</button>)}
        </div>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Generation" value={station.genKw.toFixed(0)} unit="kW" />
          <Metric label="Consumption" value={station.loadKw.toFixed(0)} unit="kW" />
          <Metric label="Power margin" value={margin.toFixed(0)} unit="kW" detail={margin < 0 ? 'Demand exceeds supply' : 'Available headroom'} />
          <Metric label="Generator load" value={generatorLoad.toFixed(0)} unit="%" detail="Load / rated output" />
          <Metric label="Fuel consumption" value={fuelBurnLDay.toFixed(0)} unit="L/day" detail="Estimated at current load" />
          <Metric label="Fuel endurance" value={enduranceDays.toFixed(0)} unit="days" detail="At current consumption" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xs uppercase tracking-widest text-slate-400">Power balance & reserve trend</h3><span className="mono text-[10px] text-slate-600">{station.history.length} SAMPLES · 2 S TICK</span></div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={station.history}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 5" />
                <XAxis dataKey="t" tick={false} axisLine={false} tickLine={false} />
                <YAxis yAxisId="power" domain={[0, 'auto']} stroke="#22d3ee" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="battery" orientation="right" domain={[0, 100]} stroke="#a3e635" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#07111f', border: '1px solid #1e293b', borderRadius: 4 }} labelStyle={{ color: '#94a3b8' }} />
                <Area yAxisId="battery" type="monotone" dataKey="battery" name="Battery (%)" stroke="#a3e635" fill="#84cc16" fillOpacity={0.08} strokeWidth={1.5} isAnimationActive={false} />
                <Line yAxisId="power" type="monotone" dataKey="power" name="Generation (kW)" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="power" type="monotone" dataKey="load" name="Consumption (kW)" stroke="#fb923c" strokeWidth={1.7} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-800 pt-3 text-[10px] text-slate-500"><span><i className="mr-1 inline-block h-1.5 w-3 bg-cyan-400" />Generation</span><span><i className="mr-1 inline-block h-1.5 w-3 bg-orange-400" />Consumption</span><span><i className="mr-1 inline-block h-1.5 w-3 bg-lime-400" />Battery reserve</span></div>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div>
            <div className="flex items-start justify-between gap-2"><div><h3 className="text-xs uppercase tracking-widest text-slate-400">Battery storage</h3><p className="mono mt-1 text-2xl text-lime-300">{batteryKwh.toFixed(0)} <span className="text-xs text-slate-500">/ {BATTERY_CAPACITY_KWH} kWh</span></p></div><span className="mono text-lg text-slate-200">{station.batteryPct.toFixed(0)}%</span></div>
            <div className="mt-2 h-2 rounded bg-slate-800"><div className="h-full rounded bg-lime-400" style={{ width: `${station.batteryPct}%` }} /></div>
            <p className="mt-2 text-xs text-slate-500">Estimated backup at 35% critical load: <span className="mono text-slate-300">{batteryHours.toFixed(1)} h</span></p>
          </div>
          <div className="border-t border-slate-800 pt-3"><h3 className="mb-3 text-xs uppercase tracking-widest text-slate-400">Resource reserves</h3><div className="space-y-4"><ReserveBar label="Fuel stores" value={station.fuelPct} warningAt={35} /><ReserveBar label="Battery state of charge" value={station.batteryPct} warningAt={30} /></div></div>
          <div className={`border-t border-slate-800 pt-3 text-xs ${marginTone}`}><div className="mono uppercase tracking-widest">{margin < 0 ? 'Power deficit' : margin < station.genKw * 0.1 ? 'Thin reserve margin' : 'Supply stable'}</div><p className="mt-1 text-slate-500">{margin < 0 ? 'Current demand exceeds generation. Battery reserve is supporting critical loads.' : `Generation exceeds consumption by ${margin.toFixed(0)} kW at this sample.`}</p></div>
        </div>
      </section>
      <p className="pb-4 text-center text-[10px] uppercase tracking-widest text-slate-600">Endurance estimates use simulated tank capacity and current load · not operational forecasts</p>
    </main>
  );
}