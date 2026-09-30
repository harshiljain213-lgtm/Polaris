import { deriveAlerts, deriveSupplyReadings, requirementMet, stationLevel, type Incident, type IncidentType, type Level, type Station } from '../data';
import { deriveSystems } from '../twin/systems';

export type WhatIfScenario = 'GENERATOR_FAILURE' | 'BLIZZARD' | 'LOW_FUEL' | 'COMMUNICATION_FAILURE' | 'POWER_SURGE';

export interface ScenarioDefinition {
  id: WhatIfScenario; name: string; description: string; systems: string[]; actions: string[];
}

export const SCENARIOS: ScenarioDefinition[] = [
  { id: 'GENERATOR_FAILURE', name: 'Generator failure', description: 'Trip Generator 1 and transfer generation to the remaining unit.', systems: ['gen1', 'gen2', 'power', 'heating', 'battery'], actions: ['Transfer critical loads to Generator 2', 'Shed non-critical loads if generation margin is negative', 'Monitor battery discharge and protect heating'] },
  { id: 'BLIZZARD', name: 'Blizzard', description: 'Severe wind and snowfall reduce visibility and stop field operations.', systems: ['heating', 'lab', 'comms', 'power', 'field teams'], actions: ['Execute the Blizzard Safety Protocol', 'Suspend outdoor research and shelter personnel', 'Secure exposed equipment and prioritize heating'] },
  { id: 'LOW_FUEL', name: 'Low fuel', description: 'Reduce fuel reserves to emergency level and recalculate endurance.', systems: ['storage', 'gen1', 'gen2', 'power'], actions: ['Prioritize emergency fuel resupply', 'Shed discretionary power consumption', 'Preserve fuel for heating and life support'] },
  { id: 'COMMUNICATION_FAILURE', name: 'Communication failure', description: 'Degrade the primary satellite link to emergency beacon quality.', systems: ['comms', 'lab', 'operations feed'], actions: ['Switch to the low-rate backup beacon', 'Queue non-critical telemetry for retransmission', 'Verify local safety check-ins'] },
  { id: 'POWER_SURGE', name: 'Power surge', description: 'Increase station demand and discharge battery reserve.', systems: ['power', 'gen1', 'gen2', 'battery', 'heating'], actions: ['Isolate non-essential high-draw equipment', 'Maintain heating and life-support priority loads', 'Monitor bus margin and battery reserve'] },
];

export interface ScenarioState {
  generationKw: number; consumptionKw: number; marginKw: number; batteryPct: number; fuelPct: number;
  windKmh: number; visibilityKm: number; snowfallCmHr: number; commsPct: number;
  activeMissions: number; pausedMissions: number; shelteredPersonnel: number;
  externalOperationsSuspended: boolean; heatingPriority: boolean; limitingSupply: string;
  limitingDays: number; activeIncidentCount: number; risk: Level;
}

export interface ScenarioResult {
  scenario: ScenarioDefinition; current: ScenarioState; simulated: ScenarioState;
  simulatedStation: Station; impactedSystems: string[]; risk: Level; actions: string[];
}

function withSimulatedIncident(station: Station, type: IncidentType, title: string): Station {
  if (station.incidents.some(item => item.type === type && item.status === 'ACTIVE')) return station;
  const incident: Incident = {
    id: `WHATIF-${station.id}-${type}`, type, title, severity: type === 'COMMUNICATION_FAILURE' ? 'WARNING' : 'CRITICAL',
    status: 'ACTIVE', affectedSystems: [], recommendedActions: [], raisedAt: 'WHAT-IF',
    recovery: {}, timeline: [],
  };
  return { ...station, incidents: [...station.incidents, incident] };
}

function applyScenario(station: Station, scenario: WhatIfScenario): Station {
  let simulated: Station;
  switch (scenario) {
    case 'GENERATOR_FAILURE': {
      const alreadyFailed = station.incidents.some(item => item.type === scenario && item.status === 'ACTIVE');
      const affected = withSimulatedIncident(station, scenario, 'Generator 1 simulated trip');
      simulated = alreadyFailed ? affected : { ...affected, genKw: Math.max(35, station.genKw * 0.45) };
      break;
    }
    case 'BLIZZARD': {
      const affected = withSimulatedIncident(station, scenario, 'Simulated blizzard conditions');
      const pausedMissionIds = station.missions.filter(m => m.state === 'ACTIVE' && m.requirements.some(r => r.condition === 'WEATHER_WINDOW' || r.condition === 'WIND_MAX')).map(m => m.id);
      simulated = {
        ...affected,
        windKmh: Math.max(105, station.windKmh), visibilityKm: Math.min(1, station.visibilityKm),
        snowfallCmHr: Math.max(2.5, station.snowfallCmHr), pressureHpa: Math.min(945, station.pressureHpa),
        loadKw: Math.min(320, station.loadKw * 1.2),
        missions: station.missions.map(m => pausedMissionIds.includes(m.id) ? { ...m, state: 'PAUSED' } : m),
        safetyProtocol: { ...station.safetyProtocol, externalOperationsSuspended: true, shelteredPersonnel: station.personnel, heatingPriority: true },
      };
      break;
    }
    case 'LOW_FUEL': {
      const affected = withSimulatedIncident(station, scenario, 'Simulated emergency fuel reserve');
      simulated = { ...affected, fuelPct: Math.min(12, station.fuelPct) };
      break;
    }
    case 'COMMUNICATION_FAILURE': {
      const affected = withSimulatedIncident(station, scenario, 'Simulated satellite communications failure');
      simulated = { ...affected, commsPct: Math.min(15, station.commsPct) };
      break;
    }
    case 'POWER_SURGE':
      simulated = { ...station, loadKw: Math.min(320, station.loadKw * 1.4), batteryPct: Math.max(0, station.batteryPct - 18) };
      break;
  }
  return {
    ...simulated,
    missions: simulated.missions.map(mission => mission.state === 'ACTIVE' && !mission.requirements.every(requirement => requirementMet(simulated, requirement)) ? { ...mission, state: 'PAUSED' } : mission),
  };
}

function stateOf(station: Station): ScenarioState {
  const alerts = deriveAlerts([station]);
  const limiting = [...deriveSupplyReadings(station)].sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  return {
    generationKw: station.genKw, consumptionKw: station.loadKw, marginKw: station.genKw - station.loadKw,
    batteryPct: station.batteryPct, fuelPct: station.fuelPct, windKmh: station.windKmh,
    visibilityKm: station.visibilityKm, snowfallCmHr: station.snowfallCmHr, commsPct: station.commsPct,
    activeMissions: station.missions.filter(item => item.state === 'ACTIVE').length,
    pausedMissions: station.missions.filter(item => item.state === 'PAUSED').length,
    shelteredPersonnel: station.safetyProtocol.shelteredPersonnel,
    externalOperationsSuspended: station.safetyProtocol.externalOperationsSuspended,
    heatingPriority: station.safetyProtocol.heatingPriority,
    limitingSupply: limiting.label, limitingDays: limiting.daysRemaining,
    activeIncidentCount: station.incidents.filter(item => item.status === 'ACTIVE').length,
    risk: stationLevel(alerts, station.id),
  };
}

export function runWhatIf(station: Station, scenarioId: WhatIfScenario): ScenarioResult {
  const scenario = SCENARIOS.find(item => item.id === scenarioId) ?? SCENARIOS[0];
  const simulatedStation = applyScenario(station, scenarioId);
  const beforeSystems = deriveSystems(station);
  const afterSystems = deriveSystems(simulatedStation);
  const degraded = afterSystems.filter(after => {
    const before = beforeSystems.find(item => item.id === after.id);
    return before && after.health < before.health;
  }).map(item => item.name);
  const impactedSystems = [...new Set([...scenario.systems, ...degraded])];
  const simulated = stateOf(simulatedStation);
  return { scenario, current: stateOf(station), simulated, simulatedStation, impactedSystems, risk: simulated.risk, actions: scenario.actions };
}