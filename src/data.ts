// All values are SIMULATED. Never present as real Antarctic telemetry.
export type Level = 'NOMINAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
export type MissionState = 'ACTIVE' | 'PAUSED' | 'STANDBY' | 'COMPLETED';
export type RequirementCondition = 'WIND_MAX' | 'VISIBILITY_MIN' | 'COMMS_MIN' | 'POWER_MARGIN' | 'WEATHER_WINDOW' | 'LAB_STABLE' | 'EQUIPMENT_ONLINE';
export interface MissionRequirement { label: string; condition: RequirementCondition; threshold?: number }
export interface Mission {
  id: string; name: string; team: string; progress: number; state: MissionState;
  requirements: MissionRequirement[];
}
export interface SupplyCargo { fuelL: number; foodKg: number; waterL: number; medicalKits: number; oxygenCylinders: number; sparePartsKits: number }
export interface SupplyMission { id: string; name: string; etaDays: number; cargo: SupplyCargo; state: 'IN_TRANSIT' | 'ARRIVED' }
export type IncidentType = 'GENERATOR_FAILURE' | 'BLIZZARD' | 'COMMUNICATION_FAILURE' | 'LOW_FUEL';
export interface IncidentEvent { time: string; text: string }
export interface Incident {
  id: string; type: IncidentType; title: string; severity: Level; status: 'ACTIVE' | 'RESOLVED';
  affectedSystems: string[]; recommendedActions: string[]; raisedAt: string; resolvedAt?: string;
  recovery: { genKw?: number; windKmh?: number; visibilityKm?: number; snowfallCmHr?: number; pressureHpa?: number; commsPct?: number };
  timeline: IncidentEvent[];
}
export interface SafetyProtocolState {
  active: boolean; executedAt?: string; previousLoadKw?: number; shelteredPersonnel: number;
  externalOperationsSuspended: boolean; heatingPriority: boolean; powerReductionKw: number;
  pausedMissionIds: string[]; timeline: IncidentEvent[];
}
export interface Station {
  id: 'maitri' | 'bharati'; name: string; coords: string; region: string;
  personnel: number; tempC: number; windKmh: number; pressureHpa: number; visibilityKm: number;
  snowfallCmHr: number; batteryPct: number; genKw: number; loadKw: number;
  fuelPct: number; waterPct: number; commsPct: number; foodKg: number; medicalKits: number;
  oxygenCylinders: number; sparePartsKits: number; missions: Mission[]; supplyMissions: SupplyMission[]; incidents: Incident[];
  safetyProtocol: SafetyProtocolState;
  history: { t: number; temp: number; power: number; load: number; battery: number; pressure: number; visibility: number; snowfall: number }[];
}
export interface Alert { id: string; stationId: string; level: Level; msg: string }
export interface FeedItem { id: number; time: string; station: string; text: string }

export const INITIAL_STATIONS: Station[] = [
  {
    id: 'maitri', name: 'Maitri', coords: `70°45'52"S, 11°44'03"E`, region: 'Schirmacher Oasis',
    personnel: 24, tempC: -18, windKmh: 48, pressureHpa: 982, visibilityKm: 19, snowfallCmHr: 0.1, batteryPct: 86, genKw: 180, loadKw: 142,
    fuelPct: 71, waterPct: 84, commsPct: 93, foodKg: 1650, medicalKits: 84,
    oxygenCylinders: 156, sparePartsKits: 42, history: [], incidents: [],
    safetyProtocol: { active: false, shelteredPersonnel: 0, externalOperationsSuspended: false, heatingPriority: false, powerReductionKw: 0, pausedMissionIds: [], timeline: [] },
    missions: [
      { id: 'MTR-ATM-026', name: 'Atmospheric Aerosol Study', team: 'Atmospheric Science · 4', progress: 62, state: 'ACTIVE', requirements: [{ label: 'Wind below 70 km/h', condition: 'WIND_MAX', threshold: 70 }, { label: 'Aerosol mast online', condition: 'EQUIPMENT_ONLINE' }, { label: 'Visibility above 3 km', condition: 'VISIBILITY_MIN', threshold: 3 }] },
      { id: 'MTR-GLA-014', name: 'Glacier Mass Balance', team: 'Glaciology · 6', progress: 45, state: 'ACTIVE', requirements: [{ label: 'Field team clearance', condition: 'WEATHER_WINDOW' }, { label: 'GPS array online', condition: 'EQUIPMENT_ONLINE' }, { label: 'Wind below 60 km/h', condition: 'WIND_MAX', threshold: 60 }] },
      { id: 'MTR-LAK-009', name: 'Lake Sediment Coring', team: 'Geoscience · 3', progress: 18, state: 'STANDBY', requirements: [{ label: 'Coring rig available', condition: 'EQUIPMENT_ONLINE' }, { label: 'Weather window approved', condition: 'WEATHER_WINDOW' }] },
    ],
    supplyMissions: [
      { id: 'SUP-26-041', name: 'Dronning Maud Land resupply', etaDays: 4.6, state: 'IN_TRANSIT', cargo: { fuelL: 24000, foodKg: 820, waterL: 12000, medicalKits: 24, oxygenCylinders: 48, sparePartsKits: 12 } },
      { id: 'SUP-26-038', name: 'Medical and engineering stores', etaDays: 1.8, state: 'IN_TRANSIT', cargo: { fuelL: 0, foodKg: 120, waterL: 0, medicalKits: 32, oxygenCylinders: 20, sparePartsKits: 18 } },
    ],
  },
  {
    id: 'bharati', name: 'Bharati', coords: `69°24.41'S, 76°11.72'E`, region: 'Larsemann Hills',
    personnel: 38, tempC: -14, windKmh: 58, pressureHpa: 976, visibilityKm: 14, snowfallCmHr: 0.3, batteryPct: 74, genKw: 260, loadKw: 214,
    fuelPct: 64, waterPct: 78, commsPct: 88, foodKg: 2240, medicalKits: 112,
    oxygenCylinders: 208, sparePartsKits: 58, history: [], incidents: [],
    safetyProtocol: { active: false, shelteredPersonnel: 0, externalOperationsSuspended: false, heatingPriority: false, powerReductionKw: 0, pausedMissionIds: [], timeline: [] },
    missions: [
      { id: 'BRT-MAR-021', name: 'Marine Ecosystem Survey', team: 'Marine Biology · 8', progress: 71, state: 'ACTIVE', requirements: [{ label: 'Coastal access window', condition: 'WEATHER_WINDOW' }, { label: 'Sea-ice safety review', condition: 'EQUIPMENT_ONLINE' }, { label: 'Comms link above 60%', condition: 'COMMS_MIN', threshold: 60 }] },
      { id: 'BRT-CLM-017', name: 'Climate Monitoring Array', team: 'Climate Systems · 5', progress: 88, state: 'ACTIVE', requirements: [{ label: 'Automatic station power', condition: 'POWER_MARGIN' }, { label: 'Sensor calibration current', condition: 'EQUIPMENT_ONLINE' }] },
      { id: 'BRT-ICE-012', name: 'Ice Core Analysis', team: 'Ice Chemistry · 4', progress: 33, state: 'PAUSED', requirements: [{ label: 'Core freezer below -18°C', condition: 'LAB_STABLE' }, { label: 'Lab power stable', condition: 'POWER_MARGIN' }] },
    ],
    supplyMissions: [
      { id: 'SUP-26-052', name: 'Coastal station scheduled cargo', etaDays: 6.2, state: 'IN_TRANSIT', cargo: { fuelL: 38000, foodKg: 1400, waterL: 18000, medicalKits: 36, oxygenCylinders: 64, sparePartsKits: 20 } },
    ],
  },
];

export const RANK: Record<Level, number> = { NOMINAL: 0, ADVISORY: 1, WARNING: 2, CRITICAL: 3 };
export const SIM_DAYS_PER_TICK = 0.005;

export interface SupplyReading { key: keyof SupplyCargo; label: string; current: number; unit: string; dailyRate: number; daysRemaining: number }

export function deriveSupplyReadings(s: Station): SupplyReading[] {
  const fuelL = (s.fuelPct / 100) * 200_000;
  const waterL = (s.waterPct / 100) * 80_000;
  const readings: SupplyReading[] = [
    { key: 'fuelL', label: 'Fuel', current: fuelL, unit: 'L', dailyRate: s.loadKw * 0.28 * 24, daysRemaining: fuelL / Math.max(1, s.loadKw * 0.28 * 24) },
    { key: 'foodKg', label: 'Food', current: s.foodKg, unit: 'kg', dailyRate: s.personnel * 1.8, daysRemaining: s.foodKg / Math.max(0.1, s.personnel * 1.8) },
    { key: 'waterL', label: 'Water', current: waterL, unit: 'L', dailyRate: s.personnel * 45, daysRemaining: waterL / Math.max(1, s.personnel * 45) },
    { key: 'medicalKits', label: 'Medical supplies', current: s.medicalKits, unit: 'kits', dailyRate: s.personnel * 0.006, daysRemaining: s.medicalKits / Math.max(0.01, s.personnel * 0.006) },
    { key: 'oxygenCylinders', label: 'Oxygen', current: s.oxygenCylinders, unit: 'cyl', dailyRate: s.personnel * 0.22, daysRemaining: s.oxygenCylinders / Math.max(0.1, s.personnel * 0.22) },
    { key: 'sparePartsKits', label: 'Spare parts', current: s.sparePartsKits, unit: 'kits', dailyRate: Math.max(0.1, s.missions.filter(m => m.state === 'ACTIVE').length * 0.12), daysRemaining: s.sparePartsKits / Math.max(0.1, s.missions.filter(m => m.state === 'ACTIVE').length * 0.12) },
  ];
  return readings;
}

export function blizzardRisk(s: Station): number {
  const windFactor = Math.max(0, (s.windKmh - 30) * 1.15);
  const visibilityFactor = Math.max(0, (8 - s.visibilityKm) * 5);
  const snowfallFactor = s.snowfallCmHr * 13;
  return Math.min(100, Math.round(windFactor + visibilityFactor + snowfallFactor));
}

export function weatherCondition(s: Station): string {
  const risk = blizzardRisk(s);
  if (risk >= 75) return 'BLIZZARD CONDITIONS';
  if (s.visibilityKm < 5) return 'BLOWING SNOW';
  if (s.snowfallCmHr >= 0.8) return 'SNOWFALL';
  if (s.snowfallCmHr >= 0.2) return 'FLURRIES';
  return 'CLEAR / COLD';
}

export function requirementMet(s: Station, requirement: MissionRequirement): boolean {
  switch (requirement.condition) {
    case 'WIND_MAX': return s.windKmh <= (requirement.threshold ?? 0);
    case 'VISIBILITY_MIN': return s.visibilityKm >= (requirement.threshold ?? 0);
    case 'COMMS_MIN': return s.commsPct >= (requirement.threshold ?? 0);
    case 'POWER_MARGIN': return s.genKw > s.loadKw && s.batteryPct > 15;
    case 'WEATHER_WINDOW': return s.windKmh < 65 && s.visibilityKm >= 5 && blizzardRisk(s) < 60;
    case 'LAB_STABLE': return s.tempC > -35 && s.genKw > s.loadKw && s.batteryPct > 20;
    case 'EQUIPMENT_ONLINE': return true;
  }
}

export function deriveAlerts(stations: Station[]): Alert[] {
  const out: Alert[] = [];
  for (const s of stations) {
    const add = (level: Level, key: string, msg: string) =>
      out.push({ id: s.id + key, stationId: s.id, level, msg: `${s.name}: ${msg}` });
    if (s.windKmh > 90) add('CRITICAL', 'wind', `Blizzard-force wind ${s.windKmh.toFixed(0)} km/h`);
    else if (s.windKmh > 60) add('WARNING', 'wind', `High wind ${s.windKmh.toFixed(0)} km/h — blizzard risk rising`);
    const risk = blizzardRisk(s);
    if (risk >= 80) add('CRITICAL', 'blizzard', `Blizzard risk ${risk}% — restrict outdoor activity`);
    else if (risk >= 60) add('WARNING', 'blizzard', `Elevated blizzard risk ${risk}%`);
    if (s.visibilityKm < 2) add('CRITICAL', 'visibility', `Visibility critically low (${s.visibilityKm.toFixed(1)} km)`);
    else if (s.visibilityKm < 5) add('WARNING', 'visibility', `Visibility reduced (${s.visibilityKm.toFixed(1)} km)`);
    if (s.snowfallCmHr >= 1.5) add('WARNING', 'snowfall', `Heavy snowfall ${s.snowfallCmHr.toFixed(1)} cm/h`);
    if (s.fuelPct < 20) add('CRITICAL', 'fuel', `Fuel critically low (${s.fuelPct.toFixed(0)}%)`);
    else if (s.fuelPct < 35) add('WARNING', 'fuel', `Fuel low (${s.fuelPct.toFixed(0)}%)`);
    if (s.loadKw > s.genKw) add('WARNING', 'power', 'Load exceeds generation');
    if (s.batteryPct < 15) add('CRITICAL', 'battery', `Battery reserve critically low (${s.batteryPct.toFixed(0)}%)`);
    else if (s.batteryPct < 30) add('WARNING', 'battery', `Battery reserve low (${s.batteryPct.toFixed(0)}%)`);
    if (s.waterPct < 25) add('WARNING', 'water', `Water reserve low (${s.waterPct.toFixed(0)}%)`);
    if (s.commsPct < 40) add('WARNING', 'comms', `Comms link degraded (${s.commsPct.toFixed(0)}%)`);
    if (s.tempC < -35) add('ADVISORY', 'temp', `Extreme cold ${s.tempC.toFixed(1)}°C`);
    for (const incident of s.incidents.filter(item => item.status === 'ACTIVE')) {
      add(incident.severity, `incident-${incident.id}`, `INCIDENT ${incident.type.replace(/_/g, ' ')} — ${incident.title}`);
    }
    if (s.safetyProtocol.active) add('ADVISORY', 'safety-protocol', 'Blizzard Safety Protocol active — external operations suspended');
    for (const supply of deriveSupplyReadings(s)) {
      if (supply.daysRemaining < 2) add('CRITICAL', `supply-${supply.key}`, `${supply.label} endurance below 2 days (${supply.daysRemaining.toFixed(1)} d)`);
      else if (supply.daysRemaining < 7) add('WARNING', `supply-${supply.key}`, `${supply.label} endurance below 7 days (${supply.daysRemaining.toFixed(1)} d)`);
    }
  }
  return out.sort((a, b) => RANK[b.level] - RANK[a.level]);
}

export function stationLevel(alerts: Alert[], id: string): Level {
  return alerts.filter(a => a.stationId === id).reduce<Level>((m, a) => (RANK[a.level] > RANK[m] ? a.level : m), 'NOMINAL');
}

export const LEVEL_STYLE: Record<Level, string> = {
  NOMINAL: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  ADVISORY: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
  WARNING: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  CRITICAL: 'text-red-300 border-red-500/50 bg-red-500/15',
};
