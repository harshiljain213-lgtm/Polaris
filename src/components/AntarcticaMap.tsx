import { useEffect, useRef, useState } from 'react';
import L, { type LayerGroup, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { deriveAlerts, stationLevel, type Level, type Station } from '../data';
import type { NCPORWeatherStates } from '../services/ncporWeather';

type MapLayers = { weather: boolean; incidents: boolean; research: boolean; logistics: boolean };

const LEVEL_COLOR: Record<Level, string> = {
  NOMINAL: '#34d399',
  ADVISORY: '#38bdf8',
  WARNING: '#fbbf24',
  CRITICAL: '#fb7185',
};

interface MapOverlays {
  weather: LayerGroup;
  incidents: LayerGroup;
  research: LayerGroup;
  logistics: LayerGroup;
  stations: LayerGroup;
  route: LayerGroup;
}

function parseCoordinates(value: string): [number, number] | null {
  const match = value.match(/(\d+)°(?:(\d+(?:\.\d+)?)')?(?:(\d+(?:\.\d+)?)")?\s*([NS])\s*,?\s*(\d+)°(?:(\d+(?:\.\d+)?)')?(?:(\d+(?:\.\d+)?)")?\s*([EW])/i);
  if (!match) return null;
  const latitude = Number(match[1]) + Number(match[2] ?? 0) / 60 + Number(match[3] ?? 0) / 3600;
  const longitude = Number(match[5]) + Number(match[6] ?? 0) / 60 + Number(match[7] ?? 0) / 3600;
  return [
    latitude * (match[4].toUpperCase() === 'S' ? -1 : 1),
    longitude * (match[8].toUpperCase() === 'W' ? -1 : 1),
  ];
}

function addBadge(group: LayerGroup, point: L.LatLngExpression, offset: [number, number], label: string, tone: string): void {
  const [offsetX, offsetY] = offset;
  L.marker(point, {
    interactive: false,
    icon: L.divIcon({
      className: 'polaris-badge-icon',
      html: `<span class="polaris-map-badge ${tone}">${label}</span>`,
      iconSize: [28, 22],
      iconAnchor: [14 - offsetX, 11 - offsetY],
    }),
  }).addTo(group);
}

export default function AntarcticaMap({
  stations,
  selectedId,
  onSelectStation,
  layers,
  routeFrom,
  routeTo,
  routeVisible,
  weatherStates,
}: {
  stations: Station[];
  selectedId: string;
  onSelectStation: (id: string) => void;
  layers: MapLayers;
  routeFrom: Station;
  routeTo: Station;
  routeVisible: boolean;
  weatherStates: NCPORWeatherStates;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlaysRef = useRef<MapOverlays | null>(null);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
      preferCanvas: true,
      minZoom: 1,
      maxZoom: 19,
    });
    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);
    tileLayer.on('tileerror', () => setTileError(true));
    L.control.zoom({ position: 'topright' }).addTo(map);

    const overlays: MapOverlays = {
      weather: L.layerGroup().addTo(map),
      incidents: L.layerGroup().addTo(map),
      research: L.layerGroup().addTo(map),
      logistics: L.layerGroup().addTo(map),
      stations: L.layerGroup().addTo(map),
      route: L.layerGroup().addTo(map),
    };
    mapRef.current = map;
    overlaysRef.current = overlays;

    map.setView([-70, 0], 1);

    return () => {
      map.remove();
      mapRef.current = null;
      overlaysRef.current = null;
    };
  }, []);

  useEffect(() => {
    const overlays = overlaysRef.current;
    if (!overlays) return;
    overlays.stations.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) {
        layer.unbindTooltip();
        layer.unbindPopup();
      }
    });
    Object.values(overlays).forEach(group => group.clearLayers());

    for (const station of stations) {
      const coordinates = parseCoordinates(station.coords);
      if (!coordinates) continue;
      const point: L.LatLngExpression = coordinates;
      const selected = station.id === selectedId;
      const level = stationLevel(deriveAlerts([station]), station.id);
      const weatherState = weatherStates[station.id];
      const weatherColor = weatherState.status === 'stale'
        ? '#fbbf24'
        : weatherState.risk === 'HIGH'
          ? '#f87171'
          : weatherState.risk === 'CAUTION'
            ? '#fbbf24'
            : weatherState.risk === 'LOW' ? '#38bdf8' : '#64748b';

      if (layers.weather) {
        L.circleMarker(point, {
          radius: 23,
          color: weatherColor,
          weight: 1.5,
          fillColor: weatherColor,
          fillOpacity: 0.12,
          opacity: 0.55,
        }).bindTooltip(`NCPOR wind risk ${weatherState.risk} · ${weatherState.status}`, { sticky: true }).addTo(overlays.weather);
      }

      const activeIncidents = station.incidents.filter(incident => incident.status === 'ACTIVE');
      if (layers.incidents && activeIncidents.length > 0) {
        addBadge(overlays.incidents, point, [-15, -15], '!', 'polaris-map-badge-critical');
      }

      const activeMissions = station.missions.filter(mission => mission.state === 'ACTIVE');
      if (layers.research && activeMissions.length > 0) {
        addBadge(overlays.research, point, [15, -15], String(activeMissions.length), 'polaris-map-badge-research');
      }

      if (layers.logistics && station.supplyMissions.some(mission => mission.state === 'IN_TRANSIT')) {
        addBadge(overlays.logistics, point, [0, 18], 'SUP', 'polaris-map-badge-logistics');
      }

      L.marker(point, {
        title: `${station.name} · simulated operations ${level} · NCPOR wind risk ${weatherState.risk} (${weatherState.status})`,
        alt: `${station.name} research station`,
        zIndexOffset: selected ? 1000 : 0,
        icon: L.divIcon({
          className: 'polaris-map-station-icon',
          html: `<span class="polaris-map-station"><i class="polaris-map-station-dot" style="--station-color:${LEVEL_COLOR[level]}"></i><span class="polaris-map-station-name">${station.name.toUpperCase()}</span></span>`,
          iconSize: [132, 28],
          iconAnchor: [8, 14],
        }),
      })
        .bindPopup(`<strong>${station.name}</strong><br>${station.coords}<br>Simulated operations: ${level}<br>NCPOR wind risk: ${weatherState.risk} (${weatherState.status})`)
        .on('click', () => onSelectStation(station.id))
        .addTo(overlays.stations);
    }

    if (routeVisible && layers.logistics) {
      const start = parseCoordinates(routeFrom.coords);
      const end = parseCoordinates(routeTo.coords);
      if (start && end) {
        L.polyline([start, end], { color: '#fbbf24', weight: 3, dashArray: '8 8', opacity: 0.9 })
          .bindTooltip('Schematic station-to-station route · not surveyed', { sticky: true })
          .addTo(overlays.route);
      }
    }

    mapRef.current?.invalidateSize();
  }, [stations, selectedId, onSelectStation, layers, routeFrom, routeTo, routeVisible, weatherStates]);

  return (
    <div className="relative">
      <div ref={containerRef} className="polaris-leaflet-map h-[min(68vh,620px)] min-h-[390px] w-full" role="application" aria-label="Interactive Antarctica map with research station markers" />
      {tileError && <div className="absolute bottom-3 left-3 border border-amber-500/50 bg-slate-950/90 px-3 py-2 text-[10px] text-amber-200">Some basemap tiles could not be loaded. Station markers remain available.</div>}
    </div>
  );
}