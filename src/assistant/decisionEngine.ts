import {
  blizzardRisk,
  deriveSupplyReadings,
  requirementMet,
  type Level,
  type Station,
} from '../data';
import type { NCPORWeatherState } from '../services/ncporWeather';

export interface Decision {
  recommendation: string;
  reason: string;
  risk: Level;
  affectedSystems: string[];
  recommendedAction: string;
}

const has = (text: string, ...terms: string[]) => terms.some(term => text.includes(term));
const highestLevel = (levels: Level[]): Level => {
  const rank: Record<Level, number> = { NOMINAL: 0, ADVISORY: 1, WARNING: 2, CRITICAL: 3 };
  return levels.reduce((highest, level) => rank[level] > rank[highest] ? level : highest, 'NOMINAL');
};
const activeIncidents = (station: Station) => station.incidents.filter(incident => incident.status === 'ACTIVE');
const activeOutdoorMissions = (station: Station) => station.missions.filter(mission =>
  mission.state === 'ACTIVE' && mission.requirements.some(requirement =>
    requirement.condition === 'WEATHER_WINDOW' || requirement.condition === 'WIND_MAX',
  ),
);

function durationDays(question: string): number {
  const match = question.match(/(\d+(?:\.\d+)?)\s*(?:day|days|d\b)/);
  return match ? Number(match[1]) : 30;
}

function sustainabilityDecision(station: Station, days: number): Decision {
  const supplies = deriveSupplyReadings(station);
  const limiting = [...supplies].sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  const fuel = supplies.find(item => item.key === 'fuelL');
  const water = supplies.find(item => item.key === 'waterL');
  const generationMargin = station.genKw - station.loadKw;
  const active = activeIncidents(station);
  const insufficient = supplies.filter(item => item.daysRemaining < days);
  const criticalIncident = active.some(incident => incident.severity === 'CRITICAL');
  const powerAtRisk = generationMargin <= 0 || station.batteryPct < 20;
  const risk = highestLevel([
    active.some(incident => incident.severity === 'CRITICAL') ? 'CRITICAL' : active.length ? 'WARNING' : 'NOMINAL',
    powerAtRisk ? 'CRITICAL' : 'NOMINAL',
    insufficient.length ? insufficient.some(item => item.daysRemaining < 7) ? 'CRITICAL' : 'WARNING' : 'NOMINAL',
  ]);
  const recommendation = insufficient.length || powerAtRisk || criticalIncident
    ? `NO — ${station.name} is not currently provisioned for ${days} days without intervention.`
    : `CONDITIONAL YES — current modelled reserves cover ${days} days, subject to stable operations.`;
  const reason = `Limiting stock is ${limiting.label} (${limiting.daysRemaining.toFixed(1)} days). Fuel: ${(fuel?.daysRemaining ?? 0).toFixed(1)} d; water: ${(water?.daysRemaining ?? 0).toFixed(1)} d; power margin: ${generationMargin.toFixed(0)} kW; battery: ${station.batteryPct.toFixed(0)}%.${active.length ? ` Active incidents: ${active.map(item => item.title).join(', ')}.` : ''}${insufficient.length ? ` Below horizon: ${insufficient.map(item => item.label).join(', ')}.` : ''}`;
  return {
    recommendation, reason, risk,
    affectedSystems: [...new Set([...insufficient.map(item => item.label), ...(powerAtRisk ? ['generation', 'power bus', 'battery'] : []), ...active.flatMap(item => item.affectedSystems)])],
    recommendedAction: insufficient.length ? `Arrange resupply or reduce consumption for ${limiting.label}; prioritize cargo before the ${days}-day horizon.` : powerAtRisk ? 'Shed non-critical loads and protect battery reserve; reassess power margin.' : 'Maintain current consumption, monitor incoming supply ETAs, and reassess each shift.',
  };
}

function researchDecision(station: Station, weatherState?: NCPORWeatherState): Decision {
  const mission = station.missions.find(item => item.state === 'ACTIVE');
  const outdoor = activeOutdoorMissions(station);
  const weatherCurrent = weatherState?.status === 'current';
  const unsafeWeather = !weatherCurrent || weatherState.risk === 'HIGH' || weatherState.risk === 'CAUTION' || weatherState.risk === 'UNAVAILABLE';
  const powerShortfall = station.genKw <= station.loadKw || station.batteryPct < 20;
  const active = activeIncidents(station);
  const shouldPause = unsafeWeather && outdoor.length > 0 || powerShortfall || active.some(item => item.type === 'GENERATOR_FAILURE');
  const reason = unsafeWeather
    ? weatherState?.status === 'stale' ? `Latest NCPOR report is ${weatherState.ageHours.toFixed(0)} hours old; it cannot clear outdoor research.` : weatherState?.status === 'current' ? `Current NCPOR reported wind is ${weatherState.windKmh?.toFixed(0) ?? 'unavailable'} km/h (${weatherState.risk}).` : 'No NCPOR weather reading is available to clear outdoor research; verify local station conditions before deployment.'
    : powerShortfall
      ? `Generation is ${station.genKw.toFixed(0)} kW against ${station.loadKw.toFixed(0)} kW demand, with battery at ${station.batteryPct.toFixed(0)}%.`
      : mission
        ? `${mission.name} is ${mission.state.toLowerCase()} at ${mission.progress.toFixed(1)}% progress. Its requirements are ${mission.requirements.every(item => requirementMet(station, item)) ? 'currently met' : 'not all met'}. Conditions: wind ${station.windKmh.toFixed(0)} km/h, visibility ${station.visibilityKm.toFixed(1)} km, power margin ${(station.genKw - station.loadKw).toFixed(0)} kW.`
        : 'There are no active research missions at this station.';
  return {
    recommendation: shouldPause ? `YES — pause outdoor research at ${station.name}.` : mission ? `NO — continue ${mission.name} with routine monitoring.` : 'No active mission requires a pause decision.',
    reason,
    risk: shouldPause ? 'CRITICAL' : unsafeWeather ? 'WARNING' : 'NOMINAL',
    affectedSystems: shouldPause ? [...(unsafeWeather ? ['field teams', 'weather systems'] : []), ...(powerShortfall ? ['generation', 'power bus', 'battery'] : []), ...active.flatMap(item => item.affectedSystems)] : mission ? [mission.id, 'research team'] : ['research operations'],
    recommendedAction: shouldPause ? 'Hold outdoor deployments until a fresh NCPOR reading and local station verification are available, then reassess weather and power requirements.' : 'Continue data collection and recheck mission requirements on the next operational update.',
  };
}

function generatorFailureDecision(station: Station): Decision {
  const failureActive = activeIncidents(station).some(item => item.type === 'GENERATOR_FAILURE');
  const available = failureActive ? station.genKw : station.genKw * 0.45;
  const margin = available - station.loadKw;
  const criticalLoad = station.loadKw * 0.65;
  const batteryHours = station.batteryPct / 100 * 1200 / Math.max(1, criticalLoad * 0.35);
  const risk: Level = margin < 0 ? station.batteryPct < 25 ? 'CRITICAL' : 'WARNING' : 'ADVISORY';
  return {
    recommendation: failureActive ? `GENERATOR 1 FAILURE IS ACTIVE — available generation is approximately ${available.toFixed(0)} kW.` : `SIMULATED FAILURE — generation would fall from ${station.genKw.toFixed(0)} kW to approximately ${available.toFixed(0)} kW.`,
    reason: `Current load is ${station.loadKw.toFixed(0)} kW, leaving a ${margin.toFixed(0)} kW ${margin < 0 ? 'deficit' : 'margin'} after the 55% unit loss. Battery is ${station.batteryPct.toFixed(0)}% (about ${batteryHours.toFixed(1)} h at estimated critical load).`,
    risk,
    affectedSystems: ['Generator 1', 'Generator 2', 'power bus', 'battery', 'heating', 'research lab'],
    recommendedAction: margin < 0 ? 'Shed non-critical loads immediately, protect heating/life support, and monitor battery discharge while transferring essential loads to Generator 2.' : 'Transfer critical loads to Generator 2, verify bus stability, and defer discretionary loads until Generator 1 returns.',
  };
}

function weatherDecision(station: Station, weatherState?: NCPORWeatherState): Decision {
  if (!weatherState || weatherState.status !== 'current' || weatherState.risk === 'UNAVAILABLE') return {
    recommendation: 'HOLD — current NCPOR weather data is unavailable or stale.',
    reason: weatherState?.status === 'stale' ? `Latest NCPOR report (${weatherState.observation.observedAt}) is ${weatherState.ageHours.toFixed(0)} hours old.` : weatherState?.status === 'unavailable' ? weatherState.reason : 'A fresh, timestamped NCPOR wind reading is required for weather clearance.',
    risk: 'CRITICAL',
    affectedSystems: ['field teams', 'weather systems', 'external operations'],
    recommendedAction: 'Do not clear field movement from stale NCPOR data or simulated weather values. Confirm current local station conditions before dispatch.',
  };
  const riskScore = weatherState.risk;
  const active = activeIncidents(station);
  const stop = station.safetyProtocol.active || riskScore === 'HIGH' || active.some(item => item.type === 'BLIZZARD');
  const caution = riskScore === 'CAUTION';
  return {
    recommendation: stop ? 'NO — suspend external operations.' : caution ? 'RESTRICTED — proceed only with essential, approved field activity.' : 'WIND LOW — verify other local weather conditions before field activity.',
    reason: `Latest NCPOR station report: wind ${weatherState.windKmh?.toFixed(0) ?? 'unavailable'} km/h; wind-only risk ${riskScore}. Visibility and snowfall are not included in this snapshot.${station.safetyProtocol.active ? ' Blizzard Safety Protocol is active; external operations remain suspended.' : ''}${active.some(item => item.type === 'BLIZZARD') ? ' Active blizzard incident.' : ''}`,
    risk: stop ? 'CRITICAL' : caution ? 'WARNING' : 'NOMINAL',
    affectedSystems: ['field teams', 'weather systems', ...(stop ? ['external equipment', 'communications'] : [])],
    recommendedAction: stop ? 'Hold field movement and verify current conditions with station personnel.' : caution ? 'Restrict movement; require local station verification, buddy checks, and a logged route plan.' : 'Wind reading is below caution thresholds, but verify visibility, snowfall, and current local conditions before dispatch.',
  };
}

function limitingResourceDecision(station: Station): Decision {
  const readings = deriveSupplyReadings(station);
  const limiting = [...readings].sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  const risk: Level = limiting.daysRemaining < 2 ? 'CRITICAL' : limiting.daysRemaining < 7 ? 'WARNING' : limiting.daysRemaining < 30 ? 'ADVISORY' : 'NOMINAL';
  return {
    recommendation: `${limiting.label.toUpperCase()} is the limiting resource at ${station.name}.`,
    reason: `${limiting.current.toFixed(limiting.current >= 100 ? 0 : 1)} ${limiting.unit} in stock; estimated consumption ${limiting.dailyRate.toFixed(2)} ${limiting.unit}/day; ${limiting.daysRemaining.toFixed(1)} days remaining.`,
    risk,
    affectedSystems: [limiting.label, ...(limiting.key === 'fuelL' ? ['storage', 'generators', 'power'] : limiting.key === 'waterL' ? ['water plant', 'personnel'] : ['station sustainment'])],
    recommendedAction: limiting.daysRemaining < 30 ? `Prioritize ${limiting.label.toLowerCase()} resupply and reduce avoidable consumption; review the incoming cargo manifest and ETA.` : `Track ${limiting.label.toLowerCase()} use against the resupply schedule during each shift.`,
  };
}

function generalDecision(station: Station): Decision {
  const incidents = activeIncidents(station);
  const alerts = incidents.map(item => item.severity);
  const supplies = deriveSupplyReadings(station);
  const limiting = [...supplies].sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  const risk = highestLevel([
    ...alerts,
    station.genKw <= station.loadKw ? 'CRITICAL' : 'NOMINAL',
    station.windKmh >= 65 || station.visibilityKm < 5 ? 'WARNING' : 'NOMINAL',
    limiting.daysRemaining < 7 ? 'WARNING' : 'NOMINAL',
  ]);
  const nominal = risk === 'NOMINAL';
  return {
    recommendation: nominal ? `${station.name} is currently within monitored operating margins.` : `${station.name} requires operator attention before non-essential operations proceed.`,
    reason: `Power margin ${(station.genKw - station.loadKw).toFixed(0)} kW; wind ${station.windKmh.toFixed(0)} km/h; visibility ${station.visibilityKm.toFixed(1)} km; shortest supply endurance ${limiting.daysRemaining.toFixed(1)} days (${limiting.label}). ${incidents.length ? `Active incidents: ${incidents.map(item => item.title).join(', ')}.` : 'No active incidents.'}`,
    risk,
    affectedSystems: [...new Set([...incidents.flatMap(item => item.affectedSystems), ...(station.genKw <= station.loadKw ? ['generation', 'power bus'] : []), limiting.label])],
    recommendedAction: nominal ? 'Continue routine monitoring and reassess after the next telemetry update.' : 'Review the active alerts and incident recommendations; preserve critical loads and defer discretionary field activity until margins recover.',
  };
}

export function analyzeQuestion(question: string, station: Station, weatherState?: NCPORWeatherState): Decision {
  const text = question.toLowerCase();
  if (has(text, 'generator', 'gen 1', 'gen1', 'power failure', 'power outage')) return generatorFailureDecision(station);
  if (has(text, 'pause', 'research', 'mission', 'field team')) return researchDecision(station, weatherState);
  if (has(text, 'external', 'outside', 'weather', 'blizzard', 'field operation')) return weatherDecision(station, weatherState);
  if (has(text, 'sustainab', 'operate', 'survive', 'how long') || /\d+(?:\.\d+)?\s*(?:day|days|d\b)/.test(text)) {
    return sustainabilityDecision(station, durationDays(text));
  }
  if (has(text, 'limiting', 'resource', 'suppl', 'fuel', 'food', 'water', 'oxygen', 'medical', 'spare')) {
    return limitingResourceDecision(station);
  }
  return generalDecision(station);
}