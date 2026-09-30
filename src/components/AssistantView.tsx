import { useState, type FormEvent } from 'react';
import { blizzardRisk, deriveAlerts, deriveSupplyReadings, stationLevel, type Level, type Station } from '../data';
import { analyzeQuestion } from '../assistant/decisionEngine';
import { getLatestNCPORObservation, getNCPORDataset } from '../services/ncporService';
import type { NCPORWeatherStates } from '../services/ncporWeather';

const PROMPTS = [
  'Can this station operate for 30 days?',
  'Should we pause the current research mission?',
  'What happens if Generator 1 fails?',
  'Which resource is limiting station endurance?',
  'Should external operations continue in the current weather?',
];

const RISK_STYLE: Record<Level, string> = {
  NOMINAL: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  ADVISORY: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  WARNING: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  CRITICAL: 'border-red-500/50 bg-red-500/15 text-red-300',
};
const RISK_TEXT: Record<Level, string> = { NOMINAL: 'text-emerald-300', ADVISORY: 'text-sky-300', WARNING: 'text-amber-300', CRITICAL: 'text-red-300' };

interface Query { id: number; text: string }

export default function AssistantView({ stations, station, onSelectStation, weatherStates }: {
  stations: Station[]; station: Station; onSelectStation: (id: string) => void; weatherStates: NCPORWeatherStates;
}) {
  const [question, setQuestion] = useState('');
  const [queries, setQueries] = useState<Query[]>([]);
  const limiting = [...deriveSupplyReadings(station)].sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  const risk = stationLevel(deriveAlerts([station]), station.id);
  const environmentalDataset = getNCPORDataset(station.id);
  const environmentalObservation = getLatestNCPORObservation(station.id);
  const weatherState = weatherStates[station.id];

  function ask(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    setQueries(current => [...current, { id: Date.now() + current.length, text: cleaned }]);
    setQuestion('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
        <div><p className="mono text-[10px] uppercase tracking-[0.24em] text-cyan-500">Decision support / local rules engine</p><h2 className="mt-1 text-xl font-semibold tracking-wide text-white">AI Operations Assistant <span className="text-slate-500">/ {station.name.toUpperCase()}</span></h2></div>
        <div className="flex gap-1">{stations.map(s => <button key={s.id} onClick={() => onSelectStation(s.id)} className={`rounded border px-3 py-1.5 text-xs tracking-widest ${s.id === station.id ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{s.name.toUpperCase()}</button>)}</div>
      </div>

      <section className="grid grid-cols-2 gap-px overflow-hidden border border-slate-800 bg-slate-800 sm:grid-cols-4">
        <div className="bg-slate-950/90 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Station status</div><div className={`mono mt-1 text-sm ${RISK_TEXT[risk]}`}>{risk}</div></div>
        <div className="bg-slate-950/90 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Power margin</div><div className={`mono mt-1 text-sm ${station.genKw > station.loadKw ? 'text-emerald-300' : 'text-red-300'}`}>{(station.genKw - station.loadKw).toFixed(0)} kW</div></div>
        <div className="bg-slate-950/90 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Sim blizzard risk</div><div className="mono mt-1 text-sm text-slate-200">{blizzardRisk(station)}%</div></div>
        <div className="bg-slate-950/90 px-3 py-2.5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Limiting supply</div><div className="mono mt-1 text-sm text-slate-200">{limiting.label} · {limiting.daysRemaining.toFixed(1)} d</div></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="border border-cyan-900/50 bg-slate-950/75 p-4">
            <div className="flex items-center justify-between"><h3 className="text-xs uppercase tracking-widest text-slate-300">Local decision engine</h3><span className="live-dot h-2 w-2 rounded-full bg-emerald-400" /></div>
            <p className="mono mt-2 text-[10px] text-cyan-500">LOCAL RULE ENGINE · NCPOR OFFLINE OBSERVATIONS</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">Weather assessments use the dated NCPOR MET-Data snapshot. Stale or incomplete NCPOR data cannot clear field operations. Power, reserves, alerts, and incidents use simulated {station.name} operational state.</p>
            <div className="mt-3 border-t border-slate-800 pt-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">Operational conditions</div><div className="mono mt-1 text-xs leading-6 text-slate-300">WIND {station.windKmh.toFixed(0)} KM/H<br />VISIBILITY {station.visibilityKm.toFixed(1)} KM<br />GEN / LOAD {station.genKw.toFixed(0)} / {station.loadKw.toFixed(0)} KW<br />FUEL {station.fuelPct.toFixed(0)}% · BATTERY {station.batteryPct.toFixed(0)}%</div></div>
            <div className="mt-3 border-t border-slate-800 pt-3"><div className="mono text-[9px] uppercase tracking-widest text-sky-400">SOURCE: {environmentalDataset.source} · {environmentalDataset.portal}</div>{environmentalObservation ? <p className="mono mt-1 text-[10px] leading-5 text-slate-300">REPORT {environmentalObservation.observedAt} · TIMEZONE NOT PUBLISHED<br />TEMP {environmentalObservation.temperatureC?.toFixed(1) ?? 'N/A'}°C · RH {environmentalObservation.humidityPct?.toFixed(1) ?? 'N/A'}% · PRESSURE {environmentalObservation.pressureHpa?.toFixed(1) ?? 'N/A'} hPa<br />WIND {environmentalObservation.reportedWindSpeed?.toFixed(2) ?? 'N/A'} {environmentalObservation.reportedWindSpeedUnit ?? ''} · DIRECTION {environmentalObservation.windDirectionDeg?.toFixed(0) ?? 'N/A'}°</p> : <p className="mt-1 text-[10px] text-slate-500">No NCPOR observations in the local dataset.</p>}</div>
            <div className="mt-3 border-t border-slate-800 pt-3"><div className="mono text-[9px] uppercase tracking-widest text-amber-400">NCPOR WIND RISK</div><p className="mono mt-1 text-[10px] leading-5 text-slate-300">{weatherState.status === 'unavailable' ? weatherState.reason : `${weatherState.risk} · ${weatherState.windKmh === null ? 'wind unavailable' : `${weatherState.windKmh.toFixed(0)} km/h`} · ${weatherState.status === 'stale' ? 'report not current; clearance held' : 'current report'}`}</p></div>
          </div>
          <div className="border border-slate-800 bg-slate-950/75 p-3">
            <h3 className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Suggested assessments</h3>
            <div className="space-y-1">{PROMPTS.map(prompt => <button key={prompt} onClick={() => ask(prompt)} className="w-full border-l border-slate-700 px-2 py-1.5 text-left text-xs text-slate-400 hover:border-cyan-400 hover:bg-cyan-500/5 hover:text-cyan-200">{prompt}</button>)}</div>
          </div>
        </aside>

        <section className="flex min-h-[540px] flex-col border border-slate-800 bg-slate-950/75">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><h3 className="text-xs uppercase tracking-widest text-slate-300">Operations assessment log</h3><p className="mono mt-1 text-[10px] text-slate-600">LIVE ANALYSIS · {queries.length} QUER{queries.length === 1 ? 'Y' : 'IES'}</p></div><span className="mono rounded border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300">OFFLINE / READY</span></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {queries.length === 0 && <div className="flex min-h-72 flex-col items-center justify-center text-center"><div className="mono text-[10px] tracking-[0.25em] text-cyan-600">POLARIS · OPS ADVISOR</div><p className="mt-3 max-w-sm text-sm text-slate-400">Submit an operational question or select an assessment on the left. Each report is grounded in current {station.name} telemetry.</p><div className="mono mt-5 text-[10px] text-slate-600">SIMULATION / DEMO TELEMETRY</div></div>}
            {queries.map(query => {
              const namedStation = query.text.toLowerCase().includes('bharati')
                ? stations.find(item => item.id === 'bharati')
                : query.text.toLowerCase().includes('maitri')
                  ? stations.find(item => item.id === 'maitri')
                  : station;
              const decisionStation = namedStation ?? station;
              const decision = analyzeQuestion(query.text, decisionStation, weatherStates[decisionStation.id]);
              return <article key={query.id} className="border border-slate-800 bg-[#07111f]">
                <div className="border-b border-slate-800 px-3 py-2"><div className="text-[10px] uppercase tracking-widest text-slate-600">Operator query</div><p className="mt-1 text-sm text-slate-200">{query.text}</p></div>
                <div className="p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-[10px] uppercase tracking-widest text-cyan-600">Recommendation</div><p className="mt-1 text-sm font-semibold text-white">{decision.recommendation}</p></div><span className={`mono shrink-0 rounded border px-2 py-1 text-[10px] ${RISK_STYLE[decision.risk]}`}>{decision.risk} RISK</span></div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div><h4 className="text-[10px] uppercase tracking-widest text-slate-500">Reason</h4><p className="mt-1 text-xs leading-relaxed text-slate-400">{decision.reason}</p></div>
                    <div><h4 className="text-[10px] uppercase tracking-widest text-slate-500">Affected systems</h4><div className="mt-1 flex flex-wrap gap-1">{decision.affectedSystems.map(system => <span key={system} className="mono border border-slate-700 px-1.5 py-1 text-[10px] text-slate-300">{system}</span>)}</div></div>
                  </div>
                  <div className="mt-3 border-l-2 border-amber-400/60 bg-amber-500/5 px-3 py-2"><h4 className="text-[10px] uppercase tracking-widest text-amber-500">Recommended action</h4><p className="mt-1 text-xs leading-relaxed text-slate-300">{decision.recommendedAction}</p></div>
                  <p className="mono mt-2 text-[9px] uppercase tracking-widest text-slate-700">Weather: NCPOR data · decision support only</p>
                </div>
              </article>;
            })}
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-slate-800 p-3">
            <label className="sr-only" htmlFor="ops-question">Ask an operational question</label>
            <input id="ops-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about endurance, weather, power, research..." className="min-w-0 flex-1 border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-600" />
            <button type="submit" disabled={!question.trim()} className="rounded border border-cyan-500/50 bg-cyan-500/10 px-4 text-xs uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40">Assess</button>
          </form>
        </section>
      </section>
      <p className="pb-4 text-center text-[10px] uppercase tracking-widest text-slate-600">Local rule-based decision support · not a substitute for station commander judgement</p>
    </main>
  );
}