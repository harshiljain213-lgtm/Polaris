import { deriveSupplyReadings, type Station, type SupplyCargo } from '../data';

const CARGO_ITEMS: { key: keyof SupplyCargo; label: string; unit: string }[] = [
  { key: 'fuelL', label: 'Fuel', unit: 'L' }, { key: 'foodKg', label: 'Food', unit: 'kg' },
  { key: 'waterL', label: 'Water', unit: 'L' }, { key: 'medicalKits', label: 'Medical', unit: 'kits' },
  { key: 'oxygenCylinders', label: 'Oxygen', unit: 'cyl' }, { key: 'sparePartsKits', label: 'Spares', unit: 'kits' },
];

function quantity(value: number, unit: string) {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: digits })} ${unit}`;
}

export default function LogisticsView({ stations, station, onSelectStation, onReceiveSupply }: {
  stations: Station[]; station: Station; onSelectStation: (id: string) => void;
  onReceiveSupply: (stationId: string, supplyMissionId: string) => void;
}) {
  const supplies = deriveSupplyReadings(station);
  const minimumEndurance = Math.min(...supplies.map(item => item.daysRemaining));
  const inbound = station.supplyMissions.filter(m => m.state === 'IN_TRANSIT');

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
        <div><p className="mono text-[10px] uppercase tracking-[0.24em] text-cyan-500">Station sustainment / live simulation</p><h2 className="mt-1 text-xl font-semibold tracking-wide text-white">Logistics <span className="text-slate-500">/ {station.name.toUpperCase()}</span></h2></div>
        <div className="flex gap-1">{stations.map(s => <button key={s.id} onClick={() => onSelectStation(s.id)} className={`rounded border px-3 py-1.5 text-xs tracking-widest ${s.id === station.id ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{s.name.toUpperCase()}</button>)}</div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border-l-2 border-cyan-400 bg-slate-950/60 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Tracked supply classes</div><div className="mono mt-1 text-xl text-cyan-300">{supplies.length}</div></div>
        <div className="border-l-2 border-amber-400 bg-slate-950/60 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Inbound missions</div><div className="mono mt-1 text-xl text-amber-300">{inbound.length}</div></div>
        <div className={`border-l-2 ${minimumEndurance < 7 ? 'border-red-400' : 'border-emerald-400'} bg-slate-950/60 px-3 py-2.5`}><div className="text-[10px] uppercase tracking-widest text-slate-500">Shortest endurance</div><div className={`mono mt-1 text-xl ${minimumEndurance < 7 ? 'text-red-300' : 'text-emerald-300'}`}>{minimumEndurance.toFixed(1)} <span className="text-xs text-slate-500">days</span></div></div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 px-4 py-3"><div><h3 className="text-xs uppercase tracking-widest text-slate-300">Inventory & endurance</h3><p className="mono mt-1 text-[10px] text-slate-600">LIVE STOCK · MODELLED DAILY CONSUMPTION</p></div><span className="mono text-[10px] text-slate-600">{station.personnel} PERSONNEL · {station.missions.filter(m => m.state === 'ACTIVE').length} ACTIVE MISSIONS</span></div>
        <div className="divide-y divide-slate-800/80">
          {supplies.map(item => {
            const health = Math.min(100, item.daysRemaining / 30 * 100);
            const tone = item.daysRemaining < 2 ? 'text-red-300' : item.daysRemaining < 7 ? 'text-amber-300' : 'text-emerald-300';
            return <div key={item.key} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(130px,1fr)_1fr_1fr_1fr_minmax(110px,1.2fr)] sm:items-center">
              <div className="text-sm font-medium text-slate-200">{item.label}</div>
              <div><div className="text-[10px] uppercase tracking-widest text-slate-600 sm:hidden">Current stock</div><div className="mono text-sm text-slate-100">{quantity(item.current, item.unit)}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-slate-600 sm:hidden">Daily consumption</div><div className="mono text-xs text-slate-400">{quantity(item.dailyRate, `${item.unit}/d`)}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-slate-600 sm:hidden">Remaining</div><div className={`mono text-sm ${tone}`}>{item.daysRemaining.toFixed(1)} d</div></div>
              <div><div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-slate-600"><span>30-day planning reserve</span><span className="mono">{Math.round(health)}%</span></div><div className="h-1.5 rounded bg-slate-800"><div className={`h-full rounded ${item.daysRemaining < 2 ? 'bg-red-400' : item.daysRemaining < 7 ? 'bg-amber-400' : 'bg-cyan-400'}`} style={{ width: `${health}%` }} /></div></div>
            </div>;
          })}
        </div>
        <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-600">Rates are simulated estimates from personnel, mission activity, and current generator load. Stock and endurance update with the shared station simulation.</p>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/70">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 px-4 py-3"><div><h3 className="text-xs uppercase tracking-widest text-slate-300">Incoming supply missions</h3><p className="mono mt-1 text-[10px] text-slate-600">ETA COUNTS DOWN IN DAYS · CARGO MANIFEST</p></div><span className="mono text-[10px] text-cyan-500">{station.supplyMissions.length} TOTAL</span></div>
        <div className="divide-y divide-slate-800/80">
          {station.supplyMissions.map(shipment => (
            <article key={shipment.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="mono text-[10px] text-cyan-500">{shipment.id}</span><span className={`mono rounded border px-1.5 py-0.5 text-[10px] ${shipment.state === 'ARRIVED' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>{shipment.state.replace('_', ' ')}</span><span className="mono text-xs text-slate-300">{shipment.state === 'ARRIVED' ? 'RECEIVED' : `ETA ${shipment.etaDays.toFixed(1)} DAYS`}</span></div>
                <h4 className="mt-1 text-sm font-medium text-white">{shipment.name}</h4>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{CARGO_ITEMS.filter(item => shipment.cargo[item.key] > 0).map(item => <span key={item.key} className="text-xs text-slate-500">{item.label} <span className="mono text-slate-300">{quantity(shipment.cargo[item.key], item.unit)}</span></span>)}</div>
              </div>
              {shipment.state === 'IN_TRANSIT' && <div className="flex items-center"><button onClick={() => onReceiveSupply(station.id, shipment.id)} className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-2 text-[10px] uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/20">Simulate cargo receipt</button></div>}
            </article>
          ))}
          {station.supplyMissions.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No supply missions on the manifest.</p>}
        </div>
        <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-600">Receipt applies the manifest to station inventory and marks the shipment arrived. Arrival also occurs automatically when simulated ETA reaches zero.</p>
      </section>
    </main>
  );
}