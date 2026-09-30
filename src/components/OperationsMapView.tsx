import { useRef, useState } from 'react';
import { deriveAlerts, deriveSupplyReadings, stationLevel, type Level, type Station } from '../data';
import { getLatestNCPORObservation, getNCPORDataset } from '../services/ncporService';
import type { NCPORWeatherStates, NCPORWindRisk } from '../services/ncporWeather';
import AntarcticaMap from './AntarcticaMap';

type LayerKey = 'weather' | 'incidents' | 'research' | 'logistics';
const LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: 'weather', label: 'Weather', color: '#38bdf8' },
  { key: 'incidents', label: 'Incidents', color: '#fb7185' },
  { key: 'research', label: 'Research', color: '#a3e635' },
  { key: 'logistics', label: 'Logistics', color: '#fbbf24' },
];
const LEVEL_COLOR: Record<Level, string> = { NOMINAL: '#34d399', ADVISORY: '#38bdf8', WARNING: '#fbbf24', CRITICAL: '#fb7185' };
const WIND_RISK_RANK: Record<NCPORWindRisk, number> = { LOW: 0, CAUTION: 1, HIGH: 2, UNAVAILABLE: 3 };

export default function OperationsMapView({ stations, selectedId, onSelectStation, onNavigate, weatherStates }: {
  stations: Station[]; selectedId: string; onSelectStation: (id: string) => void;
  onNavigate: (view: 'assistant' | 'whatif') => void;
  weatherStates: NCPORWeatherStates;
}) {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ weather: true, incidents: true, research: true, logistics: true });
  const [fromId, setFromId] = useState('maitri');
  const [toId, setToId] = useState('bharati');
  const [routeVisible, setRouteVisible] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const selected = stations.find(station => station.id === selectedId) ?? stations[0];
  const selectedWeatherState = weatherStates[selected.id];
  const environmentalDataset = getNCPORDataset(selected.id);
  const environmentalObservation = getLatestNCPORObservation(selected.id);
  const routeFrom = stations.find(station => station.id === fromId) ?? stations[0];
  const routeTo = stations.find(station => station.id === toId && station.id !== fromId) ?? stations.find(station => station.id !== fromId) ?? stations[0];
  const routeFromWeather = weatherStates[routeFrom.id];
  const routeToWeather = weatherStates[routeTo.id];
  const routeStates = [routeFromWeather, routeToWeather];
  const routeWeatherAvailable = routeStates.every(state => state.status !== 'unavailable' && state.risk !== 'UNAVAILABLE');
  const routeWeatherCurrent = routeStates.every(state => state.status === 'current');
  const routeRisk = routeWeatherAvailable
    ? routeStates.reduce<NCPORWindRisk>((highest, state) => WIND_RISK_RANK[state.risk] > WIND_RISK_RANK[highest] ? state.risk : highest, 'LOW')
    : 'UNAVAILABLE';
  const routePeakWindKmh = routeWeatherAvailable
    ? Math.max(...routeStates.map(state => state.status === 'unavailable' ? 0 : state.windKmh ?? 0))
    : null;
  const routeComms = Math.min(routeFrom.commsPct, routeTo.commsPct);
  const activeIncidents = [...routeFrom.incidents, ...routeTo.incidents].filter(incident => incident.status === 'ACTIVE');
  const activeShipments = [...routeFrom.supplyMissions, ...routeTo.supplyMissions].filter(mission => mission.state === 'IN_TRANSIT');
  const minSupplyDays = Math.min(...[...deriveSupplyReadings(routeFrom), ...deriveSupplyReadings(routeTo)].map(item => item.daysRemaining));
  const routeHeld = !routeWeatherAvailable || !routeWeatherCurrent || routeRisk === 'HIGH' || routeComms < 40 || activeIncidents.some(item => item.type === 'GENERATOR_FAILURE' || item.type === 'BLIZZARD' || item.type === 'COMMUNICATION_FAILURE');
  const routeRestricted = !routeHeld && (routeRisk === 'CAUTION' || minSupplyDays < 7);
  const routeStatus = routeHeld ? 'HOLD' : routeRestricted ? 'RESTRICTED' : 'READY';
  const routeTone = routeHeld ? 'text-red-300 border-red-500/40 bg-red-500/10' : routeRestricted ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' : 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';
  const recommendedAction = !routeWeatherAvailable
    ? 'HOLD: NCPOR wind data is missing for one or both endpoints. Verify conditions directly with both stations before dispatch.'
    : !routeWeatherCurrent
      ? 'HOLD: latest NCPOR endpoint report is not current or lacks a published timezone. Obtain fresh station readings before dispatch.'
    : routeHeld
      ? 'HOLD: resolve active operational constraints and verify current local weather before reassessment.'
    : routeRestricted
      ? 'RESTRICTED: proceed only with approved essential tasks, confirmed check-ins, a return plan, and local weather verification.'
      : 'NCPOR wind readings are below caution thresholds. Verify visibility and other local conditions, confirm crew manifest, and check in before departure.';

  function toggleLayer(key: LayerKey) {
    setLayers(current => ({ ...current, [key]: !current[key] }));
  }

  function chooseDestination(id: string) {
    setToId(id === fromId ? (stations.find(station => station.id !== fromId)?.id ?? id) : id);
  }

  function togglePlannedRoute() {
    const showRoute = !routeVisible;
    setRouteVisible(showRoute);
    if (showRoute) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const selectedLevel = stationLevel(deriveAlerts([selected]), selected.id);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-cyan-500">South polar operations picture / NCPOR observations</p>
          <h2 className="mt-1 text-xl font-semibold tracking-wide text-white">Operations Map <span className="text-slate-500">/ ANTARCTICA</span></h2>
        </div>
        <span className="mono border border-cyan-900/60 px-2 py-1 text-[10px] text-cyan-300">NCPOR WEATHER DATA</span>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
        <div ref={mapRef} className="relative overflow-hidden border border-slate-800 bg-[#06101a]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <div className="flex flex-wrap gap-1">{LAYERS.map(layer => <button key={layer.key} type="button" aria-pressed={layers[layer.key]} onClick={() => toggleLayer(layer.key)} className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] uppercase tracking-wider ${layers[layer.key] ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-400'}`}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: layers[layer.key] ? layer.color : '#475569' }} />{layer.label}</button>)}</div>
            <span className="mono text-[9px] uppercase tracking-widest text-slate-600">OpenStreetMap · Antarctica overview · zoom for station detail</span>
          </div>
          <AntarcticaMap stations={stations} selectedId={selected.id} onSelectStation={onSelectStation} layers={layers} routeFrom={routeFrom} routeTo={routeTo} routeVisible={routeVisible} weatherStates={weatherStates} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-800 px-3 py-2 text-[9px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Nominal operations</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />Advisory</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Warning / stale weather</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Critical</span><span className="ml-auto">Markers use the station register; basemap © OpenStreetMap contributors. Route line is schematic, not surveyed.</span></div>
        </div>

        <aside className="space-y-3">
          <section className="border border-slate-800 bg-slate-950/75">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-4 py-3">
              <div><p className="mono text-[10px] text-cyan-600">{selected.coords}</p><h3 className="mt-1 text-lg font-semibold text-white">{selected.name}</h3><p className="text-xs text-slate-500">{selected.region}</p></div>
              <span className="mono rounded border px-2 py-1 text-[10px]" style={{ color: LEVEL_COLOR[selectedLevel], borderColor: `${LEVEL_COLOR[selectedLevel]}66` }}>{selectedLevel}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 text-xs">
              <div><span className="text-slate-500">NCPOR wind risk</span><p className="mono mt-1 text-slate-200">{selectedWeatherState.risk}</p></div>
              <div><span className="text-slate-500">Sim visibility</span><p className="mono mt-1 text-slate-200">{selected.visibilityKm.toFixed(1)} km</p></div>
              <div><span className="text-slate-500">Communications</span><p className={`mono mt-1 ${selected.commsPct < 40 ? 'text-red-300' : 'text-slate-200'}`}>{selected.commsPct.toFixed(0)}%</p></div>
              <div><span className="text-slate-500">Power</span><p className={`mono mt-1 ${selected.genKw < selected.loadKw ? 'text-red-300' : 'text-slate-200'}`}>{selected.loadKw.toFixed(0)} / {selected.genKw.toFixed(0)} kW</p></div>
            </div>
            <div className="border-t border-slate-800 px-4 py-3">
              <div className="mono text-[9px] uppercase tracking-widest text-cyan-400">NCPOR MET-DATA</div>
              {environmentalObservation ? <p className="mono mt-1 text-[10px] leading-5 text-slate-300">Report {environmentalObservation.observedAt} · timezone not published<br />{environmentalObservation.temperatureC?.toFixed(1) ?? 'N/A'}°C · {environmentalObservation.humidityPct?.toFixed(1) ?? 'N/A'}% RH · {environmentalObservation.pressureHpa?.toFixed(1) ?? 'N/A'} hPa<br />Wind {environmentalObservation.reportedWindSpeed?.toFixed(2) ?? 'N/A'} {environmentalObservation.reportedWindSpeedUnit ?? ''} · direction {environmentalObservation.windDirectionDeg?.toFixed(0) ?? 'N/A'}°</p> : <p className="mt-1 text-[10px] text-amber-300">No NCPOR observation loaded.</p>}
              <p className="mono mt-2 text-[9px] text-slate-600">{environmentalDataset.mode} · NO VISIBILITY DATA IN SNAPSHOT</p>
            </div>
            <div className="border-t border-slate-800 px-4 py-3">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500"><span>Research missions</span><span className="mono text-lime-300">{selected.missions.filter(mission => mission.state === 'ACTIVE').length} ACTIVE</span></div>
              <ul className="mt-2 space-y-1">{selected.missions.map(mission => <li key={mission.id} className="flex justify-between gap-2 text-xs"><span className="truncate text-slate-400">{mission.name}</span><span className={`mono ${mission.state === 'ACTIVE' ? 'text-lime-300' : mission.state === 'PAUSED' ? 'text-amber-300' : 'text-slate-600'}`}>{mission.state}</span></li>)}</ul>
            </div>
            <div className="border-t border-slate-800 px-4 py-3">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500"><span>Incident status</span><span className={selected.incidents.some(incident => incident.status === 'ACTIVE') ? 'text-rose-300' : 'text-emerald-300'}>{selected.incidents.filter(incident => incident.status === 'ACTIVE').length} ACTIVE</span></div>
              {selected.incidents.filter(incident => incident.status === 'ACTIVE').map(incident => <p key={incident.id} className="mt-1 text-xs text-rose-200">{incident.severity} · {incident.title}</p>)}
              <div className="mt-3 flex justify-between text-[10px] uppercase tracking-widest text-slate-500"><span>Inbound supplies</span><span className="mono text-amber-300">{selected.supplyMissions.filter(mission => mission.state === 'IN_TRANSIT').length} IN TRANSIT</span></div>
              {selected.safetyProtocol.active && <p className="mt-2 border-l-2 border-amber-400 pl-2 text-xs text-amber-200">Safety protocol active · {selected.safetyProtocol.shelteredPersonnel} sheltered</p>}
            </div>
            <div className="flex gap-2 border-t border-slate-800 p-3"><button onClick={() => onNavigate('assistant')} className="flex-1 rounded border border-cyan-500/40 px-2 py-2 text-[10px] uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/10">AI assessment</button><button onClick={() => onNavigate('whatif')} className="flex-1 rounded border border-slate-700 px-2 py-2 text-[10px] uppercase tracking-wider text-slate-300 hover:border-amber-500/50 hover:text-amber-200">What-If</button></div>
          </section>
        </aside>
      </section>

      <section id="mission-route-planning" className="scroll-mt-40 border border-slate-800 bg-slate-950/75">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 px-4 py-3"><div><h3 className="text-xs uppercase tracking-widest text-slate-300">Mission Route Planning</h3><p className="mono mt-1 text-[10px] text-slate-600">ENDPOINT-BASED WEATHER / COMMUNICATIONS / LOGISTICS CHECK</p></div><div className="flex items-center gap-2"><button type="button" aria-pressed={routeVisible} disabled={!layers.logistics} onClick={togglePlannedRoute} className="rounded border border-amber-500/40 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-amber-200 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40">{routeVisible ? 'Hide map route' : 'Plot map route'}</button><span className={`mono rounded border px-2 py-1 text-[10px] ${routeTone}`}>{routeStatus}</span></div></div>
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.5fr]">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Origin<select value={fromId} onChange={event => { setFromId(event.target.value); if (event.target.value === toId) chooseDestination(fromId); }} className="mt-1 block w-full border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100">{stations.map(station => <option key={station.id} value={station.id}>{station.name} · {station.coords}</option>)}</select></label>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Destination<select value={routeTo.id} onChange={event => chooseDestination(event.target.value)} className="mt-1 block w-full border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100">{stations.filter(station => station.id !== fromId).map(station => <option key={station.id} value={station.id}>{station.name} · {station.coords}</option>)}</select></label>
            <div className="border-l border-slate-800 pl-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">NCPOR wind risk</div><div className={`mono mt-1 text-lg ${routeRisk === 'HIGH' ? 'text-red-300' : routeRisk === 'CAUTION' || routeRisk === 'UNAVAILABLE' ? 'text-amber-300' : 'text-emerald-300'}`}>{routeRisk}{routePeakWindKmh === null ? '' : ` · ${routePeakWindKmh.toFixed(0)} km/h`}</div></div>
            <div className="border-l border-slate-800 pl-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">Communications</div><div className={`mono mt-1 text-lg ${routeComms < 40 ? 'text-red-300' : 'text-slate-200'}`}>{routeComms.toFixed(0)}%</div></div>
            <div className="border-l border-slate-800 pl-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">Logistics</div><div className="mono mt-1 text-lg text-slate-200">{activeShipments.length} inbound · {minSupplyDays.toFixed(1)} d min</div></div>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Recommended action</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{recommendedAction}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500"><span>{routeFrom.name}: {routeFrom.incidents.filter(incident => incident.status === 'ACTIVE').length} active incidents</span><span>{routeTo.name}: {routeTo.incidents.filter(incident => incident.status === 'ACTIVE').length} active incidents</span><span>Route geometry: calculated only between the two station coordinates; not a surveyed travel path.</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}