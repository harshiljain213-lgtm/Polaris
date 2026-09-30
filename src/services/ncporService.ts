import bharatiData from '../data/ncpor/bharati.json';
import maitriData from '../data/ncpor/maitri.json';

export type NCPORStationId = 'maitri' | 'bharati';

export interface StationCoordinates {
  latitude: number;
  longitude: number;
}

export interface NCPORObservation {
  stationId: NCPORStationId;
  observedAt: string;
  timestampPrecision: 'minute' | 'day';
  timestampTimezone: string | null;
  temperatureC: number | null;
  humidityPct: number | null;
  pressureHpa: number | null;
  windSpeedMps: number | null;
  reportedWindSpeed: number | null;
  reportedWindSpeedUnit: 'knots' | 'm/s' | null;
  windDirectionDeg: number | null;
  coordinates: StationCoordinates;
  sourceUrls: string[];
}

export interface NCPORDataset {
  stationId: NCPORStationId;
  stationName: string;
  source: 'NCPOR';
  mode: 'OFFLINE DATASET';
  portal: string;
  sourceUrl: string;
  coordinateSource: string;
  coordinates: StationCoordinates;
  observations: NCPORObservation[];
}

const datasets: Record<NCPORStationId, NCPORDataset> = {
  maitri: maitriData as NCPORDataset,
  bharati: bharatiData as NCPORDataset,
};

export function getNCPORDataset(stationId: NCPORStationId): NCPORDataset {
  return datasets[stationId];
}

export function getLatestNCPORObservation(stationId: NCPORStationId): NCPORObservation | null {
  const observations = getNCPORDataset(stationId).observations;
  if (observations.length === 0) return null;
  return [...observations].sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt))[0];
}