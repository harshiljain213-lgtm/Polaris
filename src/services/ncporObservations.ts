import { useEffect, useState } from 'react';

export type NCPORStationId = 'maitri' | 'bharati';

export interface NCPORObservation {
  stationId: NCPORStationId;
  observedAt: string;
  temperatureC: number;
  windSpeedMps: number;
  windDirectionDeg: number;
  pressureHpa: number;
  humidityPct: number;
  source: 'NCPOR/NPDC';
}

export interface NCPORObservationProvider {
  getLatestObservation(stationId: NCPORStationId, signal: AbortSignal): Promise<NCPORObservation | null>;
}

export type NCPORObservationState =
  | { status: 'loading'; source: 'NCPOR/NPDC'; reason: string }
  | { status: 'available'; source: 'NCPOR/NPDC'; observation: NCPORObservation }
  | { status: 'unavailable'; source: 'NCPOR/NPDC'; reason: string }
  | { status: 'error'; source: 'NCPOR/NPDC'; reason: string };

const SOURCE = 'NCPOR/NPDC' as const;
const UNCONFIGURED = 'No documented public observation API is configured. Simulated telemetry remains active.';

function validateObservation(value: NCPORObservation | null, stationId: NCPORStationId): NCPORObservation | null {
  if (value === null) return null;
  const validDate = Number.isFinite(Date.parse(value.observedAt));
  const validValues = Number.isFinite(value.temperatureC)
    && Number.isFinite(value.windSpeedMps)
    && Number.isFinite(value.windDirectionDeg)
    && Number.isFinite(value.pressureHpa)
    && Number.isFinite(value.humidityPct);
  const validRanges = value.temperatureC >= -100 && value.temperatureC <= 60
    && value.windSpeedMps >= 0 && value.windSpeedMps <= 150
    && value.windDirectionDeg >= 0 && value.windDirectionDeg <= 360
    && value.pressureHpa >= 300 && value.pressureHpa <= 1200
    && value.humidityPct >= 0 && value.humidityPct <= 100;
  if (value.stationId !== stationId || value.source !== SOURCE || !validDate || !validValues || !validRanges) {
    throw new Error('Observation failed station, timestamp, source, or value validation.');
  }
  return value;
}

export class NCPORObservationService {
  constructor(private provider?: NCPORObservationProvider, private readonly timeoutMs = 8000) {}

  configureProvider(provider: NCPORObservationProvider): void {
    this.provider = provider;
  }

  async getLatest(stationId: NCPORStationId): Promise<NCPORObservationState> {
    if (!this.provider) return { status: 'unavailable', source: SOURCE, reason: UNCONFIGURED };

    const controller = new AbortController();
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error('NCPOR observation request timed out.'));
      }, this.timeoutMs);
    });

    try {
      const observation = await Promise.race([this.provider.getLatestObservation(stationId, controller.signal), timeout]);
      const validated = validateObservation(observation, stationId);
      return validated
        ? { status: 'available', source: SOURCE, observation: validated }
        : { status: 'unavailable', source: SOURCE, reason: 'No latest observation is available; simulated telemetry remains active.' };
    } catch (error) {
      return {
        status: timedOut ? 'unavailable' : 'error',
        source: SOURCE,
        reason: error instanceof Error ? error.message : 'NCPOR observation service failed.',
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}

export const ncporObservationService = new NCPORObservationService();

export function useNCPORObservation(stationId: NCPORStationId): NCPORObservationState {
  const [state, setState] = useState<NCPORObservationState>({ status: 'unavailable', source: SOURCE, reason: UNCONFIGURED });

  useEffect(() => {
    let current = true;
    setState({ status: 'loading', source: SOURCE, reason: 'Requesting the latest official observation.' });
    void ncporObservationService.getLatest(stationId).then(result => {
      if (current) setState(result);
    });
    return () => { current = false; };
  }, [stationId]);

  return state;
}