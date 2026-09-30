import { getLatestNCPORObservation, type NCPORObservation, type NCPORStationId } from './ncporService';

export type NCPORWindRisk = 'LOW' | 'CAUTION' | 'HIGH' | 'UNAVAILABLE';

export type NCPORWeatherState =
  | { status: 'unavailable'; risk: 'UNAVAILABLE'; reason: string }
  | { status: 'stale' | 'current'; observation: NCPORObservation; ageHours: number; risk: NCPORWindRisk; windKmh: number | null };

export type NCPORWeatherStates = Record<NCPORStationId, NCPORWeatherState>;

const MAX_CLEARANCE_AGE_HOURS = 6;

export function assessNCPORObservation(observation: NCPORObservation, now = Date.now()): NCPORWeatherState {
  const observedAt = Date.parse(observation.observedAt);
  if (!Number.isFinite(observedAt)) {
    return { status: 'unavailable', risk: 'UNAVAILABLE', reason: 'NCPOR observation has no parseable timestamp.' };
  }

  const ageHours = Math.max(0, (now - observedAt) / (60 * 60 * 1000));
  const windKmh = observation.windSpeedMps === null ? null : observation.windSpeedMps * 3.6;
  const risk: NCPORWindRisk = windKmh === null
    ? 'UNAVAILABLE'
    : windKmh >= 65 ? 'HIGH' : windKmh >= 45 ? 'CAUTION' : 'LOW';
  const current = ageHours <= MAX_CLEARANCE_AGE_HOURS
    && observation.timestampPrecision === 'minute'
    && observation.timestampTimezone !== null;

  return { status: current ? 'current' : 'stale', observation, ageHours, risk, windKmh };
}

export function getNCPORWeatherState(stationId: NCPORStationId, now = Date.now()): NCPORWeatherState {
  const observation = getLatestNCPORObservation(stationId);
  return observation
    ? assessNCPORObservation(observation, now)
    : { status: 'unavailable', risk: 'UNAVAILABLE', reason: 'No NCPOR observations are loaded for this station.' };
}

export function getNCPORWeatherStates(now = Date.now()): NCPORWeatherStates {
  return {
    maitri: getNCPORWeatherState('maitri', now),
    bharati: getNCPORWeatherState('bharati', now),
  };
}