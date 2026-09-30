import { lazy, Suspense, useEffect, useState } from 'react';
import StationCard from './components/StationCard';
import TwinView from './components/TwinView';
import EnvironmentView from './components/EnvironmentView';
import EnergyView from './components/EnergyView';
import ResearchView from './components/ResearchView';
import LogisticsView from './components/LogisticsView';
import IncidentsView from './components/IncidentsView';
import AssistantView from './components/AssistantView';
import WhatIfView from './components/WhatIfView';
import { LEVEL_STYLE, deriveAlerts, stationLevel } from './data';
import { useSimulation } from './sim/useSimulation';
import { getNCPORWeatherStates } from './services/ncporWeather';

const OperationsMapView = lazy(() => import('./components/OperationsMapView'));

type View = 'command' | 'twin' | 'environment' | 'energy' | 'research' | 'logistics' | 'incidents' | 'assistant' | 'whatif' | 'operations';
const TABS: readonly (readonly [string, number, View | null])[] = [
  ['Command Center', 1, 'command'], ['Digital Twin', 2, 'twin'], ['Environment', 3, 'environment'], ['Energy', 3, 'energy'], ['Research', 4, 'research'],
  ['Logistics', 4, 'logistics'], ['Incidents', 5, 'incidents'], ['AI Assistant', 6, 'assistant'], ['What-If', 7, 'whatif'], ['Operations Map', 8, 'operations'],
];
const DEMO_ROUTE: readonly { label: string; view: View; focusProtocol?: boolean }[] = [
  { label: 'Command Center', view: 'command' },
  { label: 'Digital Twin', view: 'twin' },
  { label: 'Environment', view: 'environment' },
  { label: 'Incident', view: 'incidents' },
  { label: 'Safety Protocol', view: 'whatif', focusProtocol: true },
  { label: 'AI Assistant', view: 'assistant' },
  { label: 'What-If', view: 'whatif' },
  { label: 'Operations Map', view: 'operations' },
];

export default function App() {
  const { stations, feed, setMissionState, receiveSupplyMission, triggerIncident, resolveIncident, executeBlizzardSafetyProtocol, standDownBlizzardSafetyProtocol } = useSimulation();
  const ncporWeather = getNCPORWeatherStates();
  const [selected, setSelected] = useState<string>('maitri');
  const [view, setView] = useState<View>('command');
  const [focusProtocol, setFocusProtocol] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const alerts = deriveAlerts(stations);
  const people = stations.reduce((a, s) => a + s.personnel, 0);
  const missions = stations.reduce((a, s) => a + s.missions.filter(m => m.state === 'ACTIVE').length, 0);
  const ist = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

  function navigateToView(nextView: View) {
    const routeIndex = nextView === 'whatif' ? 6 : nextView === 'operations' ? 7 : DEMO_ROUTE.findIndex(step => step.view === nextView && !step.focusProtocol);
    if (routeIndex >= 0) setDemoStep(routeIndex);
    setView(nextView);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-cyan-900/40 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <h1 className="text-2xl font-bold tracking-[0.35em] text-white">POLARIS</h1>
            <p className="text-[10px] uppercase tracking-widest text-cyan-400/70">Polar Operations & Logistics Advanced Remote Intelligence System</p>
          </div>
          <div className="mono text-right text-xs text-slate-400">
            <div><span className="live-dot mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />NCPOR WEATHER DATA</div>
            <div>IST {ist} · UTC {now.toISOString().slice(11, 19)}</div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map(([name, phase, key]) => (
            <button key={name} disabled={!key} onClick={() => key && navigateToView(key)} title={!key ? `Coming in Phase ${phase}` : ''}
              className={`whitespace-nowrap rounded px-3 py-1 text-xs tracking-wide ${key === view ? 'bg-cyan-500/15 text-cyan-300' : key ? 'text-slate-300 hover:text-white' : 'cursor-not-allowed text-slate-600'}`}>
              {name}
            </button>
          ))}
        </nav>
        <nav aria-label="POLARIS demo route" className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-2">
          <span className="mono mr-1 shrink-0 text-[9px] uppercase tracking-widest text-slate-600">Demo route</span>
          {DEMO_ROUTE.map((step, index) => {
            const active = demoStep === index;
            return <button key={step.label} aria-current={active ? 'step' : undefined} onClick={() => {
              setSelected('maitri');
              setDemoStep(index);
              if (step.focusProtocol) setFocusProtocol(true);
              setView(step.view);
            }} className={`shrink-0 rounded border px-2 py-1 text-[10px] ${active ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-transparent text-slate-500 hover:border-slate-700 hover:text-slate-300'}`}>
              <span className="mono mr-1 text-cyan-700">0{index + 1}</span>{step.label}
            </button>;
          })}
        </nav>
      </header>

      {view === 'twin' && (
        <main className="mx-auto max-w-7xl px-4 py-4">
          <TwinView station={stations.find(s => s.id === selected) ?? stations[0]} level={stationLevel(alerts, selected)}
            stations={stations} onSelectStation={setSelected} />
        </main>
      )}
      {view === 'environment' && <EnvironmentView stations={stations} station={stations.find(s => s.id === selected) ?? stations[0]} onSelectStation={setSelected} weatherState={ncporWeather[stations.find(s => s.id === selected)?.id ?? stations[0].id]} />}
      {view === 'energy' && <EnergyView stations={stations} station={stations.find(s => s.id === selected) ?? stations[0]} onSelectStation={setSelected} />}
      {view === 'research' && <ResearchView stations={stations} station={stations.find(s => s.id === selected) ?? stations[0]} onSelectStation={setSelected} onSetMissionState={setMissionState} />}
      {view === 'logistics' && <LogisticsView stations={stations} station={stations.find(s => s.id === selected) ?? stations[0]} onSelectStation={setSelected} onReceiveSupply={receiveSupplyMission} />}
      {view === 'incidents' && <IncidentsView stations={stations} station={stations.find(s => s.id === selected) ?? stations[0]} onSelectStation={setSelected} onTrigger={triggerIncident} onResolve={resolveIncident} />}
      {view === 'assistant' && <AssistantView stations={stations} station={stations.find(s => s.id === selected) ?? stations[0]} onSelectStation={setSelected} weatherStates={ncporWeather} />}
      {view === 'whatif' && <WhatIfView stations={stations} station={stations.find(s => s.id === selected) ?? stations[0]} onSelectStation={setSelected} onExecuteProtocol={executeBlizzardSafetyProtocol} onStandDownProtocol={standDownBlizzardSafetyProtocol} focusProtocol={focusProtocol} onProtocolFocused={() => setFocusProtocol(false)} />}
      {view === 'operations' && <Suspense fallback={<main className="mx-auto max-w-7xl px-4 py-4"><p className="mono border border-slate-800 bg-slate-950/80 p-4 text-xs text-cyan-300">LOADING BUNDLED ANTARCTIC CARTOGRAPHY…</p></main>}><OperationsMapView stations={stations} selectedId={selected} onSelectStation={setSelected} onNavigate={navigateToView} weatherStates={ncporWeather} /></Suspense>}
      {view === 'command' && (
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['Stations online', `${stations.length}/2`], ['Personnel (sim)', String(people)], ['Active missions', String(missions)], ['Open alerts', String(alerts.length)]].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{l}</div>
              <div className="mono text-2xl text-cyan-300">{v}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {stations.map(s => (
            <StationCard key={s.id} s={s} level={stationLevel(alerts, s.id)} selected={selected === s.id} onSelect={() => setSelected(s.id)} weatherState={ncporWeather[s.id]} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <h3 className="mb-2 text-xs uppercase tracking-widest text-slate-400">Active Alerts</h3>
            {alerts.length === 0 && <p className="mono text-sm text-emerald-300">All systems nominal.</p>}
            <ul className="space-y-1.5">
              {alerts.map(a => (
                <li key={a.id} className={`mono rounded border px-2 py-1 text-xs ${LEVEL_STYLE[a.level]}`}>[{a.level}] {a.msg}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <h3 className="mb-2 text-xs uppercase tracking-widest text-slate-400">Live Operations Feed</h3>
            <ul className="mono max-h-56 space-y-1 overflow-y-auto text-xs">
              {feed.map(f => (
                <li key={f.id} className="text-slate-400"><span className="text-cyan-500">{f.time}</span> <span className="text-slate-200">{f.station}</span> · {f.text}</li>
              ))}
            </ul>
          </section>
        </div>
        <p className="pb-6 text-center text-[10px] uppercase tracking-widest text-slate-600">
          Selected station: {selected}
        </p>
        <div className="pb-6 text-center">
          <button onClick={() => navigateToView('twin')} className="rounded border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/20">
            Open Digital Twin · {selected} →
          </button>
        </div>
      </main>
      )}
    </div>
  );
}
