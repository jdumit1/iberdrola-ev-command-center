import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { GoogleMap as GoogleMapCanvas, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { Navigation } from 'lucide-react';

export const SpainMap = ({
  stations,
  hoveredStation,
  setHoveredStation,
  minHeight = 350,
  regions,
  powerStandardKw,
  getGridColorHex,
  getRouteLabel,
}) => {
  const stationsByRegion = useMemo(() => {
    const map = {};
    stations.forEach((station) => {
      const region = regions.find((entry) => {
        const dx = station.mapX - entry.cx;
        const dy = station.mapY - entry.cy;
        return Math.sqrt(dx * dx + dy * dy) < entry.r + 15;
      });

      if (region) {
        if (!map[region.id]) map[region.id] = [];
        map[region.id].push(station);
      }
    });
    return map;
  }, [regions, stations]);

  const getRegionColor = (regionId) => {
    const regionStations = stationsByRegion[regionId] || [];
    if (regionStations.length === 0) return { fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.08)' };
    const hasCongested = regionStations.some((station) => station.gridStatus === 'Congested');
    const hasModerate = regionStations.some((station) => station.gridStatus === 'Moderate');
    if (hasCongested) return { fill: 'rgba(239,68,68,0.15)', stroke: 'rgba(239,68,68,0.4)' };
    if (hasModerate) return { fill: 'rgba(234,179,8,0.15)', stroke: 'rgba(234,179,8,0.4)' };
    return { fill: 'rgba(16,185,129,0.15)', stroke: 'rgba(16,185,129,0.4)' };
  };

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_24px_60px_rgba(148,163,184,0.12)]">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Sufficient
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> Moderate
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Congested
        </span>
      </div>
      <svg viewBox="0 0 480 400" className="h-auto w-full" style={{ minHeight }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M60,55 L110,40 L170,45 L230,50 L280,48 L340,55 L390,70 L410,95 L420,140 L430,190 L420,205 L380,240 L350,265 L330,290 L300,310 L260,340 L220,355 L180,350 L140,325 L110,300 L85,265 L65,230 L55,190 L50,150 L45,110 Z"
          fill="rgba(0,86,63,0.06)"
          stroke="rgba(148,163,184,0.48)"
          strokeWidth="1.5"
        />

        {regions.map((region) => {
          const colors = getRegionColor(region.id);
          return (
            <g key={region.id}>
              <circle cx={region.cx} cy={region.cy} r={region.r} fill={colors.fill} stroke={colors.stroke} strokeWidth="1" opacity="0.7" />
              <text
                x={region.cx}
                y={region.cy + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none fill-slate-500 text-[7px] font-medium"
              >
                {region.id}
              </text>
            </g>
          );
        })}

        {stations.map((station) => {
          const isHovered = hoveredStation === station.id;
          const color = getGridColorHex(station.gridStatus);
          return (
            <g
              key={station.id}
              onMouseEnter={() => setHoveredStation(station.id)}
              onMouseLeave={() => setHoveredStation(null)}
              className="cursor-pointer"
            >
              {isHovered && <circle cx={station.mapX} cy={station.mapY} r="14" fill={color} opacity="0.15" />}
              <circle
                cx={station.mapX}
                cy={station.mapY}
                r={isHovered ? 7 : 5}
                fill={color}
                stroke="white"
                strokeWidth={isHovered ? 2 : 1}
                opacity={isHovered ? 1 : 0.85}
                filter={isHovered ? 'url(#glow)' : undefined}
                style={{ transition: 'all 0.2s ease' }}
              />
              {isHovered && (
                <g>
                  <rect x={station.mapX + 12} y={station.mapY - 38} width="140" height="64" rx="6" fill="rgba(17,24,39,0.95)" stroke={color} strokeWidth="1" />
                  <text x={station.mapX + 18} y={station.mapY - 22} className="fill-white text-[9px] font-semibold">
                    {station.stationId || `ST-${station.id.slice(0, 4).toUpperCase()}`}
                  </text>
                  <text x={station.mapX + 18} y={station.mapY - 10} className="fill-gray-400 text-[8px]">
                    {getRouteLabel(station.routeSegment).slice(0, 25) || 'No route assigned'}
                  </text>
                  <text x={station.mapX + 18} y={station.mapY + 2} className="fill-gray-400 text-[8px]">
                    {station.numChargers} chargers · {station.numChargers * powerStandardKw} kW
                  </text>
                  <text x={station.mapX + 18} y={station.mapY + 13} className="fill-gray-400 text-[8px]">
                    Grid: {station.gridStatus}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {stations.length === 0 && (
          <text x="240" y="200" textAnchor="middle" className="fill-slate-500 text-[12px] font-medium">
            Import File 2.csv or add stations to see them on the map
          </text>
        )}
      </svg>
    </div>
  );
};

export const MapModeToggle = ({ mapMode, onChange, googleMapsConfigured }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white/85 p-1 shadow-sm">
      <button
        onClick={() => onChange('offline')}
        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
          mapMode === 'offline' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        Offline Map
      </button>
      <button
        onClick={() => onChange('google')}
        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
          mapMode === 'google' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        Google Maps
      </button>
    </div>
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
      googleMapsConfigured
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-amber-200 bg-amber-50 text-amber-700'
    }`}>
      {googleMapsConfigured ? 'API key loaded from .env' : 'API key required'}
    </span>
  </div>
);

export const MapModeNotice = ({ mapMode, message }) => (
  <div className={`rounded-2xl border px-3.5 py-2.5 text-xs shadow-sm ${
    mapMode === 'google'
      ? 'border-amber-200 bg-amber-50/90 text-amber-800'
      : 'border-sky-200 bg-sky-50/90 text-sky-800'
  }`}>
    {message}
  </div>
);

export const GoogleStationMap = ({
  stations,
  hoveredStation,
  setHoveredStation,
  height = 520,
  onLoadFailure,
  googleMapsApiKey,
  defaultMapCenter,
  googleMapOptions,
  gridStatusOptions,
  powerStandardKw,
  getGridColorHex,
  getRouteLabel,
  formatCoordinate,
  getGoogleMapsLocationUrl,
}) => {
  const mapRef = useRef(null);
  const failureReportedRef = useRef(false);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'iberdrola-google-map-script',
    googleMapsApiKey,
  });

  const fitMapToStations = useCallback((mapInstance) => {
    if (!window.google?.maps || !mapInstance) return;
    if (stations.length === 0) {
      mapInstance.setCenter(defaultMapCenter);
      mapInstance.setZoom(5.8);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    stations.forEach(({ lat, lng }) => bounds.extend({ lat, lng }));
    mapInstance.fitBounds(bounds, 120);

    if (stations.length === 1) {
      mapInstance.setZoom(7.5);
    }
  }, [defaultMapCenter, stations]);

  const handleMapLoad = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    fitMapToStations(mapInstance);
  }, [fitMapToStations]);

  useEffect(() => {
    if (mapRef.current) {
      fitMapToStations(mapRef.current);
    }
  }, [fitMapToStations]);

  useEffect(() => {
    if (loadError && !failureReportedRef.current) {
      failureReportedRef.current = true;
      onLoadFailure?.('Google Maps could not load. Reverted to the bundled offline map.');
    }
  }, [loadError, onLoadFailure]);

  const activeStation = stations.find((station) => station.id === hoveredStation) ?? null;

  if (loadError) {
    return null;
  }

  if (!isLoaded) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_24px_60px_rgba(148,163,184,0.12)]"
        style={{ minHeight: height }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(163,209,51,0.08),transparent_55%)]" />
        <div className="relative flex h-full min-h-[inherit] items-center justify-center px-6 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-900">Loading Google Maps</p>
            <p className="mt-1 text-xs text-slate-500">Fetching live map tiles and rendering station markers.</p>
          </div>
        </div>
      </div>
    );
  }

  const maps = window.google?.maps;
  if (!maps) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_24px_60px_rgba(148,163,184,0.12)]">
      <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl">
        {gridStatusOptions.map((option) => (
          <span key={option.value} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getGridColorHex(option.value) }} />
            {option.label}
          </span>
        ))}
      </div>
      <div className="absolute right-4 top-4 z-10 rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] font-medium text-amber-800 shadow-xl">
        Google Maps is using the .env API key and requires internet access at runtime
      </div>
      {stations.length === 0 && (
        <div className="absolute inset-x-4 bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-center text-xs text-slate-600 shadow-xl">
          Import File 2.csv or add stations manually to populate the live map.
        </div>
      )}
      <GoogleMapCanvas
        mapContainerStyle={{ width: '100%', height: `${height}px` }}
        center={defaultMapCenter}
        zoom={5.8}
        options={googleMapOptions}
        onClick={() => setHoveredStation(null)}
        onLoad={handleMapLoad}
        onUnmount={() => { mapRef.current = null; }}
      >
        {stations.map((station) => {
          const isActive = hoveredStation === station.id;
          return (
            <MarkerF
              key={station.id}
              position={{ lat: station.lat, lng: station.lng }}
              onClick={() => setHoveredStation(station.id)}
              onMouseOver={() => setHoveredStation(station.id)}
              onMouseOut={() => setHoveredStation((current) => (current === station.id ? null : current))}
              icon={{
                path: maps.SymbolPath.CIRCLE,
                fillColor: getGridColorHex(station.gridStatus),
                fillOpacity: 1,
                scale: isActive ? 10 : 8,
                strokeColor: '#ffffff',
                strokeOpacity: 0.95,
                strokeWeight: isActive ? 2.5 : 2,
              }}
              label={{
                text: String(station.numChargers),
                color: '#f9fafb',
                fontSize: '11px',
                fontWeight: '700',
              }}
            />
          );
        })}

        {activeStation && (
          <InfoWindowF
            position={{ lat: activeStation.lat, lng: activeStation.lng }}
            onCloseClick={() => setHoveredStation(null)}
          >
            <div className="min-w-[220px] pr-1 text-slate-900">
              <p className="text-sm font-semibold">{activeStation.stationId}</p>
              <p className="mt-1 text-xs text-slate-500">{getRouteLabel(activeStation.routeSegment)}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <p>{activeStation.numChargers} chargers</p>
                <p>{activeStation.numChargers * powerStandardKw} kW required capacity</p>
                <p>Grid status: {activeStation.gridStatus}</p>
                <p>{formatCoordinate(activeStation.lat, 'lat')} / {formatCoordinate(activeStation.lng, 'lng')}</p>
              </div>
              <a
                href={getGoogleMapsLocationUrl(activeStation.lat, activeStation.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
              >
                <Navigation size={12} /> Open in Google Maps
              </a>
            </div>
          </InfoWindowF>
        )}
      </GoogleMapCanvas>
    </div>
  );
};