// Derives each station system's status from the existing Station telemetry.
// No separate data store: everything here is a pure function of Station. (SIMULATED)
import type { Level, Station } from '../data';

export type SystemId = 'gen1' | 'gen2' | 'heating' | 'lab' | 'comms' | 'water' | 'storage' | 'power';
export interface Metric { label: string; value: string }
export interface SystemInfo { id: SystemId; name: string; code: string; level: Level; health: number; metrics: Metric[]; note: string }

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
export const levelOf = (h: number): Level => (h < 40 ? 'CRITICAL' : h < 65 ? 'WARNING' : h < 85 ? 'ADVISORY' : 'NOMINAL');
// Tank health aligned with alert thresholds in data.ts (warn / crit percentages)
const tank = (p: number, warn: number, crit: number) =>
  p < crit ? (p * 40) / crit : p < warn ? 40 + ((p - crit) * 25) / (warn - crit) : Math.min(100, 65 + (p - warn) * 1.2);

export function deriveSystems(s: Station): SystemInfo[] {
  const util = s.loadKw / s.genKw;
  const margin = (s.genKw - s.loadKw) / s.genKw;
  const fuelPenalty = s.fuelPct < 20 ? 50 : s.fuelPct < 35 ? 25 : 0;
  const genHealth = clamp(100 - Math.max(0, util - 0.8) * 200 - fuelPenalty);
  const fuelL = (s.fuelPct / 100) * 200000;
  const burnLday = Math.max(1, s.loadKw * 0.28 * 24);
  const waterL = (s.waterPct / 100) * 80000;
  const active = s.missions.filter(m => m.state === 'ACTIVE').length;
  const paused = s.missions.filter(m => m.state === 'PAUSED').length;
  const avgProg = s.missions.reduce((a, m) => a + m.progress, 0) / s.missions.length;
  const incidentActive = (type: string) => s.incidents.some(i => i.type === type && i.status === 'ACTIVE');
  const genFailure = incidentActive('GENERATOR_FAILURE');
  const blizzard = incidentActive('BLIZZARD');
  const lowFuel = incidentActive('LOW_FUEL');
  const heatHealth = clamp(100 - Math.max(0, -30 - s.tempC) * 3 - (margin < 0 ? 20 : 0) - (blizzard ? 45 : 0));
  const labHealth = clamp(100 - (s.windKmh > 60 ? 25 : 0) - (s.commsPct < 40 ? 15 : 0) - (blizzard ? 35 : 0));
  const powerHealth = margin < 0 ? 30 : margin < 0.1 ? 55 : Math.min(100, 70 + margin * 150);
  const gen = (id: 'gen1' | 'gen2', n: number, share: number, role: string): SystemInfo => {
    const failed = genFailure && id === 'gen1';
    const health = failed ? 10 : lowFuel ? Math.min(genHealth, 35) : genHealth;
    return {
    id, name: `Generator ${n}`, code: `GEN-0${n}`, level: failed ? 'CRITICAL' : levelOf(health), health,
    metrics: [
      { label: 'Output', value: `${(failed ? 0 : s.genKw * (genFailure ? 1 : share)).toFixed(0)} kW` },
      { label: 'Load factor', value: `${(util * 100).toFixed(0)} %` },
      { label: 'Coolant temp', value: `${(78 + util * 12).toFixed(0)} °C` },
      { label: 'Fuel feed', value: `${s.fuelPct.toFixed(0)} % tank` },
      { label: 'Runtime', value: `${n === 1 ? '12,480' : '9,215'} h` },
      { label: 'Role', value: failed ? 'TRIPPED · ISOLATED' : genFailure && id === 'gen2' ? 'Emergency / carrying bus' : role },
    ],
    note: failed ? 'Generator failure incident active. Unit isolated; Generator 2 carries the available station bus.' : lowFuel ? 'Emergency fuel incident active; conserve fuel and shed non-critical loads.' : util > 0.8 ? 'Running near capacity; consider shedding non-critical load.' : 'Operating within normal envelope.',
  }; };
  return [
    gen('gen1', 1, 0.55, 'Primary'),
    gen('gen2', 2, 0.45, 'Secondary / standby assist'),
    {
      id: 'heating', name: 'Heating', code: 'HVAC-01', level: levelOf(heatHealth), health: heatHealth,
      metrics: [
        { label: 'Heat demand', value: `${clamp(-s.tempC * 1.6, 0, 120).toFixed(0)} kW` },
        { label: 'Boiler loop', value: '68 °C' }, { label: 'Indoor setpoint', value: '21 °C' },
        { label: 'Outside temp', value: `${s.tempC.toFixed(1)} °C` },
      ],
      note: s.safetyProtocol.heatingPriority ? 'Blizzard Safety Protocol active: heating is prioritized above non-critical loads.' : blizzard ? 'Blizzard incident active: heating and shelter loads are critical priorities.' : s.tempC < -30 ? 'Extreme cold: heating demand elevated.' : 'Heating loop stable; priority load on power bus.',
    },
    {
      id: 'lab', name: 'Research Lab', code: 'LAB-01', level: levelOf(labHealth), health: labHealth,
      metrics: [
        { label: 'Active missions', value: String(active) }, { label: 'Paused', value: String(paused) },
        { label: 'Avg progress', value: `${avgProg.toFixed(0)} %` },
        { label: 'External sampling', value: s.windKmh > 60 ? 'RESTRICTED' : 'PERMITTED' },
      ],
      note: blizzard ? 'Blizzard incident active: suspend field sampling and secure external instruments.' : s.windKmh > 60 ? 'High wind: outdoor sampling should be suspended.' : 'Instruments online; data logging normal.',
    },
    {
      id: 'comms', name: 'Communications', code: 'COM-01', level: levelOf(s.commsPct), health: clamp(s.commsPct),
      metrics: [
        { label: 'Link quality', value: `${s.commsPct.toFixed(0)} %` },
        { label: 'Uplink', value: `${((s.commsPct / 100) * 8).toFixed(1)} Mbps` },
        { label: 'Latency', value: `${(600 + (100 - s.commsPct) * 8).toFixed(0)} ms` },
        { label: 'Path', value: 'Satellite (sim)' },
      ],
      note: s.commsPct < 40 ? 'Link degraded: fall back to low-rate telemetry.' : 'Link to NCPOR Goa healthy.',
    },
    {
      id: 'water', name: 'Water', code: 'H2O-01', level: levelOf(tank(s.waterPct, 25, 10)), health: clamp(tank(s.waterPct, 25, 10)),
      metrics: [
        { label: 'Reserve', value: `${s.waterPct.toFixed(0)} %` }, { label: 'Volume', value: `${waterL.toFixed(0)} L` },
        { label: 'Endurance', value: `${(waterL / (s.personnel * 45)).toFixed(0)} days` }, { label: 'Melt plant', value: 'ONLINE' },
      ],
      note: s.waterPct < 25 ? 'Reserve low: enforce water conservation.' : 'Snow-melt plant supplying reserve.',
    },
    {
      id: 'storage', name: 'Storage', code: 'STO-01', level: levelOf(tank(s.fuelPct, 35, 20)), health: clamp(tank(s.fuelPct, 35, 20)),
      metrics: [
        { label: 'Fuel level', value: `${s.fuelPct.toFixed(0)} %` }, { label: 'Fuel volume', value: `${fuelL.toFixed(0)} L` },
        { label: 'Burn rate', value: `${burnLday.toFixed(0)} L/day` }, { label: 'Endurance', value: `${(fuelL / burnLday).toFixed(0)} days` },
      ],
      note: lowFuel ? 'Emergency fuel incident active: conserve generator fuel and prioritize essential loads.' : 'Fuel tanks shown with live reserve telemetry.',
    },
    {
      id: 'power', name: 'Power', code: 'PWR-BUS', level: levelOf(powerHealth), health: clamp(powerHealth),
      metrics: [
        { label: 'Generation', value: `${s.genKw.toFixed(0)} kW` }, { label: 'Consumption', value: `${s.loadKw.toFixed(0)} kW` },
        { label: 'Margin', value: `${(s.genKw - s.loadKw).toFixed(0)} kW (${(margin * 100).toFixed(0)} %)` },
        { label: 'Bus', value: '400 V AC (sim)' },
      ],
      note: s.safetyProtocol.active ? `Safety protocol load shedding active (${s.safetyProtocol.powerReductionKw.toFixed(0)} kW shed); heating and life support retain priority.` : margin < 0 ? 'Load exceeds generation: shed non-critical loads.' : margin < 0.1 ? 'Thin power margin.' : 'Power bus balanced.',
    },
  ];
}
