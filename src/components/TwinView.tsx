import { useState } from 'react';
import { LEVEL_STYLE, type Level, type Station } from '../data';
import { deriveSystems, type SystemId, type SystemInfo } from '../twin/systems';

const HEX: Record<Level, string> = { NOMINAL: '#34d399', ADVISORY: '#38bdf8', WARNING: '#fbbf24', CRITICAL: '#f87171' };
const W = 160, H = 72;
const POS: Record<SystemId, [number, number]> = {
  gen1: [30, 30], gen2: [30, 180], storage: [30, 330],
  comms: [320, 30], power: [320, 180], water: [320, 330],
  heating: [610, 105], lab: [610, 255],
};
const EDGES: [SystemId, SystemId][] = [
  ['gen1', 'power'], ['gen2', 'power'], ['power', 'heating'], ['power', 'lab'], ['power', 'comms'], ['power', 'water'],
  ['storage', 'gen1'], ['storage', 'gen2'],
];
const ctr = (id: SystemId) => [POS[id][0] + W / 2, POS[id][1] + H / 2];

export default function TwinView({ station, level, stations, onSelectStation }: {
  station: Station; level: Level; stations: Station[]; onSelectStation: (id: string) => void;
}) {
  const [sel, setSel] = useState<SystemId | null>(null);
  const systems = deriveSystems(station);
  const by = Object.fromEntries(systems.map(s => [s.id, s])) as Record<SystemId, SystemInfo>;
  const detail = sel ? by[sel] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {stations.map(s => (
            <button key={s.id} onClick={() => onSelectStation(s.id)}
              className={`rounded border px-3 py-1 text-xs tracking-widest ${s.id === station.id ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>
              {s.name.toUpperCase()}
            </button>
          ))}
        </div>
        <span className={`mono rounded border px-2 py-0.5 text-xs ${LEVEL_STYLE[level]}`}>STATION {level}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">
          <svg viewBox="0 0 800 430" className="w-full">
            <defs>
              <pattern id="tg" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" fill="none" stroke="#0e1e30" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="800" height="430" fill="#040912" />
            <rect width="800" height="430" fill="url(#tg)" />
            <text x="16" y="18" fill="#22d3ee" fontSize="11" className="mono">{station.name.toUpperCase()} · {station.coords}</text>
            <text x="784" y="18" textAnchor="end" fill={station.windKmh > 60 ? '#fbbf24' : '#64748b'} fontSize="11" className="mono">
              {station.windKmh > 60 ? '⚠ HIGH WIND ' : ''}{station.tempC.toFixed(1)}°C · {station.windKmh.toFixed(0)} km/h
            </text>
            {EDGES.map(([a, b]) => {
              const [x1, y1] = ctr(a), [x2, y2] = ctr(b);
              const bad = by[a].level === 'CRITICAL' || by[b].level === 'CRITICAL';
              return <line key={a + b} x1={x1} y1={y1} x2={x2} y2={y2} stroke={bad ? '#7f1d1d' : '#0e7490'} strokeWidth="2" strokeDasharray="6 6" className="flow" />;
            })}
            {systems.map(s => {
              const [x, y] = POS[s.id], c = HEX[s.level], on = sel === s.id;
              return (
                <g key={s.id} role="button" tabIndex={0} className="cursor-pointer outline-none" onClick={() => setSel(s.id)}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSel(s.id)}>
                  <rect x={x} y={y} width={W} height={H} rx={6} fill="#07111f" stroke={on ? '#22d3ee' : c} strokeWidth={on ? 2.5 : 1.2}
                    style={on ? { filter: 'drop-shadow(0 0 8px rgba(34,211,238,.6))' } : undefined} />
                  <text x={x + 12} y={y + 20} fill="#64748b" fontSize="10" className="mono">{s.code}</text>
                  <text x={x + 12} y={y + 40} fill="#f1f5f9" fontSize="14" fontWeight="600">{s.name}</text>
                  <text x={x + 12} y={y + 58} fill={c} fontSize="11" className="mono">{s.metrics[0].value}</text>
                  <circle cx={x + W - 14} cy={y + 14} r={4} fill={c} className={s.level === 'NOMINAL' ? '' : 'live-dot'} />
                  <rect x={x} y={y + H - 4} width={(W * s.health) / 100} height={4} fill={c} opacity={0.8} />
                </g>
              );
            })}
            <text x="16" y="420" fill="#475569" fontSize="10" className="mono">SCHEMATIC · NOT TO SCALE · SIMULATION / DEMO TELEMETRY</text>
          </svg>
        </div>

        <aside className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          {!detail ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-widest text-slate-500">System Inspector</p>
              <p className="mt-2 text-sm text-slate-400">Select a system on the schematic to view its status and telemetry.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="mono text-[10px] text-slate-500">{detail.code} · {station.name.toUpperCase()}</p>
                  <h3 className="text-lg font-semibold text-white">{detail.name}</h3>
                </div>
                <span className={`mono rounded border px-2 py-0.5 text-xs ${LEVEL_STYLE[detail.level]}`}>{detail.level}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-slate-400"><span>System health</span><span className="mono text-slate-100">{detail.health.toFixed(0)} %</span></div>
                <div className="mt-1 h-2 rounded bg-slate-800"><div className="h-full rounded" style={{ width: `${detail.health}%`, background: HEX[detail.level] }} /></div>
              </div>
              <dl className="mt-3 divide-y divide-slate-800/80 text-sm">
                {detail.metrics.map(m => (
                  <div key={m.label} className="flex justify-between py-1.5"><dt className="text-slate-400">{m.label}</dt><dd className="mono text-slate-100">{m.value}</dd></div>
                ))}
              </dl>
              <p className={`mt-3 rounded border p-2 text-xs ${LEVEL_STYLE[detail.level]}`}>{detail.note}</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
