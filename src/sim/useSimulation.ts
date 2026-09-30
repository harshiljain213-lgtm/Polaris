import { useEffect, useRef, useState } from 'react';
import { deriveSupplyReadings, INITIAL_STATIONS, requirementMet, SIM_DAYS_PER_TICK, type FeedItem, type Incident, type IncidentType, type MissionState, type Station, type SupplyCargo } from '../data';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const BASE = {
  maitri: { temp: -18, wind: 50, pressure: 982, snowfall: 0.15 },
  bharati: { temp: -14, wind: 56, pressure: 976, snowfall: 0.3 },
};
const EVENTS = [
  'Automated weather mast sync completed', 'Generator 1 load balanced', 'Satellite uplink handshake OK',
  'Water melt plant cycle finished', 'Aerosol sampler data batch archived', 'Fuel tank level logged',
  'Personnel roll-call reconciled', 'Glacier stake readings received', 'Heating loop pressure nominal',
];
const stamp = () => new Date().toISOString().slice(11, 19) + 'Z';
const timeLabel = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
const FUEL_CAPACITY_L = 200_000;
const WATER_CAPACITY_L = 80_000;

function applyCargo(station: Station, cargo: SupplyCargo): Station {
  return {
    ...station,
    fuelPct: clamp(station.fuelPct + (cargo.fuelL / FUEL_CAPACITY_L) * 100, 0, 100),
    foodKg: station.foodKg + cargo.foodKg,
    waterPct: clamp(station.waterPct + (cargo.waterL / WATER_CAPACITY_L) * 100, 0, 100),
    medicalKits: station.medicalKits + cargo.medicalKits,
    oxygenCylinders: station.oxygenCylinders + cargo.oxygenCylinders,
    sparePartsKits: station.sparePartsKits + cargo.sparePartsKits,
  };
}

export function useSimulation() {
  const [stations, setStations] = useState<Station[]>(() =>
    INITIAL_STATIONS.map(s => ({
      ...s,
      history: Array.from({ length: 24 }, (_, i) => ({
        t: i, temp: s.tempC + rnd(-1.5, 1.5), power: s.genKw + rnd(-8, 8),
        load: s.loadKw + rnd(-6, 6), battery: s.batteryPct + rnd(-2, 2),
        pressure: s.pressureHpa + rnd(-1.5, 1.5), visibility: s.visibilityKm + rnd(-1, 1),
        snowfall: Math.max(0, s.snowfallCmHr + rnd(-0.15, 0.15)),
      })),
    })),
  );
  const [feed, setFeed] = useState<FeedItem[]>([
    { id: 0, time: stamp(), station: 'POLARIS', text: 'Simulation engine online — DEMO TELEMETRY' },
  ]);
  const n = useRef(0);

  function setMissionState(stationId: string, missionId: string, state: MissionState) {
    setStations(prev => prev.map(s => {
      if (s.id !== stationId) return s;
      return {
        ...s,
        missions: s.missions.map(m => {
          if (m.id !== missionId || m.state === 'COMPLETED') return m;
          if (state === 'ACTIVE' && s.safetyProtocol.active && m.requirements.some(r => r.condition === 'WEATHER_WINDOW' || r.condition === 'WIND_MAX')) return m;
          if (state === 'ACTIVE' && !m.requirements.every(r => requirementMet(s, r))) return m;
          return { ...m, progress: state === 'COMPLETED' ? 100 : m.progress, state };
        }),
      };
    }));
  }

  function receiveSupplyMission(stationId: string, missionId: string) {
    setStations(prev => prev.map(s => {
      if (s.id !== stationId) return s;
      const shipment = s.supplyMissions.find(m => m.id === missionId && m.state === 'IN_TRANSIT');
      if (!shipment) return s;
      const received = applyCargo(s, shipment.cargo);
      return { ...received, supplyMissions: received.supplyMissions.map(m => m.id === missionId ? { ...m, state: 'ARRIVED', etaDays: 0 } : m) };
    }));
  }

  function triggerIncident(stationId: string, type: IncidentType) {
    const station = stations.find(s => s.id === stationId);
    if (!station || station.incidents.some(i => i.type === type && i.status === 'ACTIVE')) return;
    const id = `INC-${station.id.toUpperCase()}-${Date.now()}`;
    const raisedAt = timeLabel();
    const recovery: Incident['recovery'] = {};
    let affectedSystems: string[] = [];
    let recommendedActions: string[] = [];
    let title = '';
    let severity: Incident['severity'] = 'WARNING';
    let impact = '';

    switch (type) {
      case 'GENERATOR_FAILURE':
        title = 'Generator 1 trip'; severity = 'CRITICAL'; affectedSystems = ['gen1', 'power'];
        recommendedActions = ['Transfer critical loads to Generator 2', 'Inspect Generator 1 and fuel feed', 'Verify bus stability before rejoining unit'];
        recovery.genKw = station.genKw; impact = 'Generator 1 tripped; available station generation reduced by 55%.';
        break;
      case 'BLIZZARD':
        title = 'Severe blizzard conditions'; severity = 'CRITICAL'; affectedSystems = ['heating', 'lab', 'comms', 'power'];
        recommendedActions = ['Suspend all outdoor field activity', 'Secure external equipment and air intakes', 'Confirm shelter and heating readiness'];
        recovery.windKmh = station.windKmh; recovery.visibilityKm = station.visibilityKm;
        recovery.snowfallCmHr = station.snowfallCmHr; recovery.pressureHpa = station.pressureHpa;
        impact = 'Blizzard simulation engaged; field operations restricted and weather telemetry degraded.';
        break;
      case 'COMMUNICATION_FAILURE':
        title = 'Satellite communications outage'; severity = 'WARNING'; affectedSystems = ['comms', 'lab'];
        recommendedActions = ['Switch to low-rate backup beacon', 'Queue non-critical telemetry for retransmission', 'Check antenna power and satellite line-of-sight'];
        recovery.commsPct = station.commsPct; impact = 'Primary communications link degraded to emergency beacon level.';
        break;
      case 'LOW_FUEL':
        title = 'Emergency fuel reserve'; severity = 'CRITICAL'; affectedSystems = ['storage', 'gen1', 'gen2', 'power'];
        recommendedActions = ['Shed non-essential electrical loads', 'Prioritize heating, life support, and communications', 'Request or transfer emergency fuel stores'];
        impact = 'Fuel reserve forced to emergency level; generator endurance and system health reduced.';
        break;
    }

    const incident: Incident = {
      id, type, title, severity, status: 'ACTIVE', affectedSystems, recommendedActions, raisedAt, recovery,
      timeline: [{ time: raisedAt, text: `Incident raised: ${title}.` }, { time: raisedAt, text: impact }],
    };
    setStations(prev => prev.map(s => {
      if (s.id !== stationId) return s;
      const changed = { ...s, incidents: [...s.incidents, incident] };
      switch (type) {
        case 'GENERATOR_FAILURE': changed.genKw = Math.max(35, s.genKw * 0.45); break;
        case 'BLIZZARD':
          changed.windKmh = Math.max(100, s.windKmh); changed.visibilityKm = Math.min(1.5, s.visibilityKm);
          changed.snowfallCmHr = Math.max(2, s.snowfallCmHr); changed.pressureHpa = Math.min(950, s.pressureHpa);
          break;
        case 'COMMUNICATION_FAILURE': changed.commsPct = 18; break;
        case 'LOW_FUEL': changed.fuelPct = Math.min(15, s.fuelPct); break;
      }
      return changed;
    }));
    setFeed(f => [{ id: ++n.current, time: stamp(), station: station.name, text: `[${severity}] ${type.replace(/_/g, ' ')}: ${impact}` }, ...f].slice(0, 40));
  }

  function resolveIncident(stationId: string, incidentId: string) {
    const station = stations.find(s => s.id === stationId);
    const incident = station?.incidents.find(i => i.id === incidentId && i.status === 'ACTIVE');
    if (!station || !incident) return;
    const resolvedAt = timeLabel();
    const recoveryText: Record<IncidentType, string> = {
      GENERATOR_FAILURE: 'Generator 1 inspected and returned to service; station generation restored.',
      BLIZZARD: 'Blizzard warning stood down; weather conditions returning to baseline.',
      COMMUNICATION_FAILURE: 'Backup communications link established and telemetry restored.',
      LOW_FUEL: 'Emergency fuel transfer completed; reserve restored to 35%.',
    };
    setStations(prev => prev.map(s => {
      if (s.id !== stationId) return s;
      const changed = { ...s };
      switch (incident.type) {
        case 'GENERATOR_FAILURE': changed.genKw = incident.recovery.genKw ?? s.genKw; break;
        case 'BLIZZARD':
          changed.windKmh = BASE[s.id].wind; changed.visibilityKm = Math.max(12, incident.recovery.visibilityKm ?? 12);
          changed.snowfallCmHr = Math.min(0.3, incident.recovery.snowfallCmHr ?? 0.2);
          changed.pressureHpa = incident.recovery.pressureHpa ?? BASE[s.id].pressure;
          break;
        case 'COMMUNICATION_FAILURE': changed.commsPct = Math.max(75, incident.recovery.commsPct ?? 85); break;
        case 'LOW_FUEL': changed.fuelPct = Math.max(35, s.fuelPct); break;
      }
      return {
        ...changed,
        incidents: s.incidents.map(i => i.id !== incidentId ? i : {
          ...i, status: 'RESOLVED', resolvedAt,
          timeline: [...i.timeline, { time: resolvedAt, text: recoveryText[i.type] }, { time: resolvedAt, text: 'Incident resolved by station operator.' }],
        }),
      };
    }));
    setFeed(f => [{ id: ++n.current, time: stamp(), station: station.name, text: `Incident resolved: ${incident.title}. ${recoveryText[incident.type]}` }, ...f].slice(0, 40));
  }

  function executeBlizzardSafetyProtocol(stationId: string) {
    const station = stations.find(s => s.id === stationId);
    if (!station || station.safetyProtocol.active) return;
    const executedAt = timeLabel();
    const pausedMissionIds = station.missions.filter(m => m.state === 'ACTIVE' && m.requirements.some(r => r.condition === 'WEATHER_WINDOW' || r.condition === 'WIND_MAX')).map(m => m.id);
    const targetLoadKw = Math.max(80, station.loadKw * 0.8);
    const powerReductionKw = station.loadKw - targetLoadKw;
    const timeline = [
      { time: executedAt, text: 'Blizzard Safety Protocol executed by station operator.' },
      { time: executedAt, text: 'External operations suspended; active field missions paused.' },
      { time: executedAt, text: `Heating assigned priority load; non-critical demand reduced by ${powerReductionKw.toFixed(0)} kW.` },
      { time: executedAt, text: `${station.personnel} personnel accounted for and returned to shelter.` },
    ];
    setStations(prev => prev.map(s => s.id !== stationId ? s : ({
      ...s,
      safetyProtocol: {
        active: true, executedAt, previousLoadKw: s.loadKw, shelteredPersonnel: s.personnel,
        externalOperationsSuspended: true, heatingPriority: true, powerReductionKw,
        pausedMissionIds, timeline,
      },
      loadKw: targetLoadKw,
      missions: s.missions.map(m => pausedMissionIds.includes(m.id) ? { ...m, state: 'PAUSED' } : m),
    })));
    setFeed(f => [{ id: ++n.current, time: stamp(), station: station.name, text: `[SAFETY PROTOCOL] Blizzard actions executed: external operations suspended, heating prioritized, ${powerReductionKw.toFixed(0)} kW non-critical load shed, personnel sheltered.` }, ...f].slice(0, 40));
  }

  function standDownBlizzardSafetyProtocol(stationId: string) {
    const station = stations.find(s => s.id === stationId);
    if (!station?.safetyProtocol.active) return;
    const stoodDownAt = timeLabel();
    setStations(prev => prev.map(s => {
      if (s.id !== stationId || !s.safetyProtocol.active) return s;
      const resumable = new Set(s.safetyProtocol.pausedMissionIds);
      const timeline = [...s.safetyProtocol.timeline, { time: stoodDownAt, text: 'Blizzard Safety Protocol stood down by station operator; operations may resume subject to mission requirements.' }];
      return {
        ...s,
        loadKw: s.safetyProtocol.previousLoadKw ?? s.loadKw,
        safetyProtocol: { ...s.safetyProtocol, active: false, shelteredPersonnel: 0, externalOperationsSuspended: false, heatingPriority: false, powerReductionKw: 0, timeline },
        missions: s.missions.map(m => resumable.has(m.id) && m.state === 'PAUSED' && m.requirements.every(r => requirementMet(s, r)) ? { ...m, state: 'ACTIVE' } : m),
      };
    }));
    setFeed(f => [{ id: ++n.current, time: stamp(), station: station.name, text: '[SAFETY PROTOCOL] Blizzard protocol stood down; mission resumption remains subject to live requirements.' }, ...f].slice(0, 40));
  }

  useEffect(() => {
    const id = setInterval(() => {
      setStations(prev => prev.map(s => {
        const b = BASE[s.id];
        const t = s.history[s.history.length - 1].t + 1;
        const tempC = clamp(s.tempC + (b.temp - s.tempC) * 0.05 + rnd(-0.4, 0.4), -45, -2);
        const blizzardActive = s.incidents.some(i => i.type === 'BLIZZARD' && i.status === 'ACTIVE');
        const generatorFailure = s.incidents.find(i => i.type === 'GENERATOR_FAILURE' && i.status === 'ACTIVE');
        const commsFailure = s.incidents.some(i => i.type === 'COMMUNICATION_FAILURE' && i.status === 'ACTIVE');
        const windKmh = blizzardActive ? Math.max(95, s.windKmh + rnd(-2, 2)) : clamp(s.windKmh + (b.wind - s.windKmh) * 0.06 + rnd(-6, 6), 8, 130);
        const genKw = generatorFailure ? clamp(s.genKw + rnd(-1, 1), 35, (generatorFailure.recovery.genKw ?? s.genKw) * 0.45) : clamp(s.genKw + rnd(-4, 4), 100, 320);
        const loadKw = s.safetyProtocol.active ? clamp(s.loadKw + rnd(-1, 1), 80, 300) : clamp(s.loadKw + rnd(-4, 4), 80, 300);
        const snowfallCmHr = blizzardActive ? Math.max(1.7, s.snowfallCmHr + rnd(-0.1, 0.1)) : clamp(s.snowfallCmHr + (b.snowfall - s.snowfallCmHr) * 0.08 + rnd(-0.16, 0.16), 0, 3);
        const visibilityTarget = blizzardActive ? 1 : clamp(22 - snowfallCmHr * 7 - Math.max(0, windKmh - 45) * 0.16, 0.5, 24);
        const visibilityKm = blizzardActive ? clamp(s.visibilityKm + (visibilityTarget - s.visibilityKm) * 0.3, 0.5, 2) : clamp(s.visibilityKm + (visibilityTarget - s.visibilityKm) * 0.12 + rnd(-0.7, 0.7), 0.5, 24);
        const pressureHpa = blizzardActive ? clamp(s.pressureHpa - 0.3, 930, 1015) : clamp(s.pressureHpa + (b.pressure - s.pressureHpa) * 0.08 + rnd(-0.8, 0.8), 930, 1015);
        const batteryPct = clamp(s.batteryPct + (genKw > loadKw ? 0.12 : -0.18) + rnd(-0.12, 0.12), 0, 100);
        const supplyReadings = deriveSupplyReadings(s);
        const fuelRate = supplyReadings.find(v => v.key === 'fuelL')?.dailyRate ?? 0;
        const waterRate = supplyReadings.find(v => v.key === 'waterL')?.dailyRate ?? 0;
        const otherRates = Object.fromEntries(supplyReadings.filter(v => v.key !== 'fuelL' && v.key !== 'waterL').map(v => [v.key, v.dailyRate * SIM_DAYS_PER_TICK]));
        const missions = s.missions.map(m => {
          if (m.state !== 'ACTIVE' || !m.requirements.every(r => requirementMet(s, r))) return m;
          const progress = Math.min(100, m.progress + 0.03);
          return { ...m, progress, state: progress >= 100 ? 'COMPLETED' as const : m.state };
        });
        let next = {
          ...s,
          fuelPct: clamp(s.fuelPct - (fuelRate * SIM_DAYS_PER_TICK / FUEL_CAPACITY_L) * 100, 0, 100),
          waterPct: clamp(s.waterPct - (waterRate * SIM_DAYS_PER_TICK / WATER_CAPACITY_L) * 100, 0, 100),
          foodKg: Math.max(0, s.foodKg - (otherRates.foodKg ?? 0)),
          medicalKits: Math.max(0, s.medicalKits - (otherRates.medicalKits ?? 0)),
          oxygenCylinders: Math.max(0, s.oxygenCylinders - (otherRates.oxygenCylinders ?? 0)),
          sparePartsKits: Math.max(0, s.sparePartsKits - (otherRates.sparePartsKits ?? 0)),
          missions,
          supplyMissions: s.supplyMissions.map(m => ({ ...m, etaDays: m.state === 'IN_TRANSIT' ? Math.max(0, m.etaDays - SIM_DAYS_PER_TICK) : m.etaDays })),
        };
        for (const shipment of next.supplyMissions) {
          if (shipment.state === 'IN_TRANSIT' && shipment.etaDays <= 0) {
            next = applyCargo(next, shipment.cargo);
            next.supplyMissions = next.supplyMissions.map(m => m.id === shipment.id ? { ...m, state: 'ARRIVED' } : m);
          }
        }
        return {
          ...next, tempC, windKmh, pressureHpa, visibilityKm, snowfallCmHr, batteryPct, genKw, loadKw,
          commsPct: commsFailure ? clamp(s.commsPct + rnd(-1, 1), 10, 25) : clamp(s.commsPct + rnd(-2, 2), 0, 100),
          history: [...s.history.slice(-29), {
            t, temp: tempC, power: genKw, load: loadKw, battery: batteryPct,
            pressure: pressureHpa, visibility: visibilityKm, snowfall: snowfallCmHr,
          }],
        };
      }));
      if (Math.random() < 0.6) {
        setFeed(f => [{ id: ++n.current, time: stamp(), station: pick(INITIAL_STATIONS).name, text: pick(EVENTS) }, ...f].slice(0, 40));
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return { stations, feed, setMissionState, receiveSupplyMission, triggerIncident, resolveIncident, executeBlizzardSafetyProtocol, standDownBlizzardSafetyProtocol };
}
