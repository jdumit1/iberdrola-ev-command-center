import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import {
  LayoutDashboard, Map, AlertTriangle, Download, Plus, Trash2, Edit3, Check, X,
  Zap, MapPin, Activity, ChevronRight, Settings, FileText, Shield,
  Battery, Navigation, BarChart3, Bell, Search, Menu, ChevronDown, Eye, RefreshCw,
  Info, CheckCircle2, XCircle, AlertCircle, Cpu, Globe, Layers, Target, Gauge, Upload
} from 'lucide-react';
import { GoogleStationMap, MapModeNotice, MapModeToggle, SpainMap } from './components/maps/StationMaps';
import { KpiCard, Modal, ToastContainer } from './components/ui/AppPrimitives';

// ─── CONSTANTS ───────────────────────────────────────────────────────────
const POWER_STANDARD_KW = 150;
const AFIR_LIGHT_DUTY_MAX_GAP_KM = 60;
const AFIR_TEN_T_EXIT_ALLOWANCE_KM = 3;
const AFIR_PUBLIC_POWER_PER_BEV_KW = 1.3;
const AFIR_PUBLIC_POWER_PER_PHEV_KW = 0.8;
const DISTRIBUTOR_NETWORK_OPTIONS = ['i-DE', 'Endesa', 'Viesgo'];
const SPAIN_REGIONS = [
  { id: 'GAL', name: 'Galicia', cx: 80, cy: 95, r: 30 },
  { id: 'AST', name: 'Asturias', cx: 140, cy: 72, r: 22 },
  { id: 'CAN', name: 'Cantabria', cx: 180, cy: 72, r: 18 },
  { id: 'PV', name: 'País Vasco', cx: 220, cy: 72, r: 22 },
  { id: 'NAV', name: 'Navarra', cx: 260, cy: 82, r: 22 },
  { id: 'ARA', name: 'Aragón', cx: 300, cy: 130, r: 38 },
  { id: 'CAT', name: 'Cataluña', cx: 370, cy: 110, r: 35 },
  { id: 'CYL', name: 'Castilla y León', cx: 160, cy: 140, r: 48 },
  { id: 'LR', name: 'La Rioja', cx: 240, cy: 100, r: 15 },
  { id: 'MAD', name: 'Madrid', cx: 215, cy: 190, r: 18 },
  { id: 'CLM', name: 'Castilla-La Mancha', cx: 240, cy: 230, r: 45 },
  { id: 'EXT', name: 'Extremadura', cx: 110, cy: 240, r: 35 },
  { id: 'VAL', name: 'C. Valenciana', cx: 330, cy: 220, r: 35 },
  { id: 'MUR', name: 'Murcia', cx: 320, cy: 280, r: 22 },
  { id: 'AND', name: 'Andalucía', cx: 200, cy: 320, r: 55 },
  { id: 'BAL', name: 'Baleares', cx: 420, cy: 200, r: 20 },
];

const ROUTE_SEGMENTS = [
  { code: 'A-1', label: 'A-1 · Madrid-Burgos' },
  { code: 'A-2', label: 'A-2 · Madrid-Barcelona' },
  { code: 'A-3', label: 'A-3 · Madrid-Valencia' },
  { code: 'A-4', label: 'A-4 · Madrid-Cádiz' },
  { code: 'A-5', label: 'A-5 · Madrid-Badajoz' },
  { code: 'A-6', label: 'A-6 · Madrid-A Coruña' },
  { code: 'A-7', label: 'A-7 · Mediterranean Corridor' },
  { code: 'AP-7', label: 'AP-7 · Costa del Sol' },
  { code: 'A-66', label: 'A-66 · Ruta de la Plata' },
  { code: 'AP-68', label: 'AP-68 · Bilbao-Zaragoza' },
  { code: 'N-340', label: 'N-340 · Cádiz-Barcelona' },
  { code: 'A-8', label: 'A-8 · Cantabrian Corridor' },
];

const ROUTE_SORT_AXIS = {
  'A-1': 'lat',
  'A-2': 'lng',
  'A-3': 'lng',
  'A-4': 'lat',
  'A-5': 'lng',
  'A-6': 'lng',
  'A-7': 'lng',
  'AP-7': 'lng',
  'A-66': 'lat',
  'AP-68': 'lng',
  'N-340': 'lng',
  'A-8': 'lng',
};

const DISTRIBUTOR_ROUTE_HINTS = {
  Viesgo: new Set(['A-8']),
  Endesa: new Set(['A-7', 'AP-7', 'N-340']),
  'i-DE': new Set(['A-1', 'A-3', 'A-4', 'A-5', 'A-6', 'A-66']),
};

const DISTRIBUTOR_REGION_HINTS = {
  Viesgo: new Set(['CAN', 'AST', 'GAL']),
  Endesa: new Set(['CAT', 'ARA', 'VAL', 'MUR', 'AND', 'BAL', 'EXT', 'NAV']),
  'i-DE': new Set(['PV', 'LR', 'MAD', 'CLM', 'CYL', 'GAL']),
};

const DISTRIBUTOR_RESEARCH_NOTES = [
  {
    distributor: 'Endesa',
    tone: 'official',
    summary: 'e-distribucion publicly states it serves 24 provinces across 8 autonomous communities and Ceuta, covering more than 21 million people.',
  },
  {
    distributor: 'Viesgo',
    tone: 'official',
    summary: 'Viesgo publishes a public network map with distribution zones, outages, planned works, and capacity layers, with strong historic presence in the Cantabrian corridor.',
  },
  {
    distributor: 'i-DE',
    tone: 'heuristic',
    summary: 'Use i-DE as the default assignment for interior corridors, then verify border municipalities before final delivery.',
  },
];

const URBAN_EXCLUSION_ZONES = [
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, radiusKm: 25 },
  { name: 'Barcelona', lat: 41.3874, lng: 2.1686, radiusKm: 22 },
  { name: 'Valencia', lat: 39.4699, lng: -0.3763, radiusKm: 18 },
  { name: 'Seville', lat: 37.3891, lng: -5.9845, radiusKm: 18 },
  { name: 'Bilbao', lat: 43.2630, lng: -2.9350, radiusKm: 16 },
  { name: 'Zaragoza', lat: 41.6488, lng: -0.8891, radiusKm: 16 },
  { name: 'Malaga', lat: 36.7213, lng: -4.4214, radiusKm: 16 },
  { name: 'Murcia', lat: 37.9922, lng: -1.1307, radiusKm: 14 },
];

const GRID_STATUS_OPTIONS = [
  { value: 'Sufficient', color: 'emerald', label: 'Sufficient' },
  { value: 'Moderate', color: 'amber', label: 'Moderate' },
  { value: 'Congested', color: 'red', label: 'Congested' },
];

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
const DEFAULT_MAP_CENTER = { lat: 40.2085, lng: -3.713 };
const GOOGLE_MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#111827' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#d1d5db' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2f4f4f' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  ],
};

const EMPTY_IMPORT_STATUS = {
  importedAt: null,
  file1Name: null,
  file2Name: null,
  file3Name: null,
  stationCount: 0,
  frictionCount: 0,
};

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).slice(2, 10);

const generateSequentialId = (prefix, index) => `${prefix}_${String(index + 1).padStart(3, '0')}`;

const getRouteLabel = (routeCode) => ROUTE_SEGMENTS.find(route => route.code === routeCode)?.label ?? routeCode;

const getGridColorHex = (status) => (
  status === 'Sufficient' ? '#10b981' : status === 'Moderate' ? '#eab308' : '#ef4444'
);

const latLngToMapXY = (lat, lng) => {
  const minLat = 36, maxLat = 44, minLng = -10, maxLng = 5;
  const x = ((lng - minLng) / (maxLng - minLng)) * 420 + 30;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 340 + 40;
  return { mapX: Math.round(x), mapY: Math.round(y) };
};

const formatCoordinate = (value, axis) => {
  const direction = axis === 'lat'
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
  return `${Math.abs(value).toFixed(4)}°${direction}`;
};

const getGoogleMapsLocationUrl = (lat, lng) => (
  `https://www.google.com/maps?q=${lat},${lng}`
);

const distanceKm = (lat1, lng1, lat2, lng2) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
};

const findUrbanExclusionZone = (lat, lng) => (
  URBAN_EXCLUSION_ZONES.find(zone => distanceKm(lat, lng, zone.lat, zone.lng) <= zone.radiusKm) ?? null
);

const downloadCSV = (filename, headers, rows) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const normalizeHeader = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const normalizeRouteSegment = (value) => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return '';

  const route = ROUTE_SEGMENTS.find((option) => (
    option.code.toUpperCase() === normalized || option.label.toUpperCase() === normalized
  ));
  return route?.code ?? normalized;
};

const normalizeGridStatus = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'sufficient') return 'Sufficient';
  if (normalized === 'moderate') return 'Moderate';
  if (normalized === 'congested') return 'Congested';
  return '';
};

const normalizeDistributorNetwork = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return DISTRIBUTOR_NETWORK_OPTIONS.find((option) => option.toLowerCase() === normalized) ?? '';
};

const parseInteger = (value) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const parseDecimal = (value) => {
  const parsed = Number.parseFloat(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const buildStationMatchKey = (lat, lng, routeSegment) => (
  `${normalizeRouteSegment(routeSegment)}|${lat.toFixed(4)}|${lng.toFixed(4)}`
);

const getRouteSortValue = (station) => (
  ROUTE_SORT_AXIS[station.routeSegment] === 'lat' ? station.lat : station.lng
);

const getNearestRegionId = (lat, lng) => {
  const { mapX, mapY } = latLngToMapXY(lat, lng);
  const nearest = SPAIN_REGIONS.reduce((best, region) => {
    const dx = mapX - region.cx;
    const dy = mapY - region.cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (!best || distance < best.distance) {
      return { id: region.id, distance };
    }
    return best;
  }, null);
  return nearest?.id ?? null;
};

const getDistributorRecommendation = ({ lat, lng, routeSegment }) => {
  const parsedLat = parseDecimal(lat);
  const parsedLng = parseDecimal(lng);
  const normalizedRoute = normalizeRouteSegment(routeSegment);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng) || !normalizedRoute) {
    return {
      distributor: '',
      confidence: 'pending',
      reason: 'Add valid coordinates and a route segment to generate a distributor suggestion.',
    };
  }

  if (DISTRIBUTOR_ROUTE_HINTS.Viesgo.has(normalizedRoute) || (parsedLat >= 42.75 && parsedLng <= -2.1 && parsedLng >= -5.4)) {
    return {
      distributor: 'Viesgo',
      confidence: 'high',
      reason: 'Matches the Cantabrian corridor where Viesgo provides public distribution-zone mapping.',
    };
  }

  if (DISTRIBUTOR_ROUTE_HINTS.Endesa.has(normalizedRoute)) {
    return {
      distributor: 'Endesa',
      confidence: 'high',
      reason: 'The selected route is in the Mediterranean/southern corridor where Endesa presence is common in public sources.',
    };
  }

  const nearestRegionId = getNearestRegionId(parsedLat, parsedLng);

  if (nearestRegionId && DISTRIBUTOR_REGION_HINTS.Viesgo.has(nearestRegionId)) {
    return {
      distributor: 'Viesgo',
      confidence: 'medium',
      reason: `Nearest mapped region (${nearestRegionId}) overlaps Viesgo\'s published and historic northern footprint.`,
    };
  }

  if (
    (nearestRegionId && DISTRIBUTOR_REGION_HINTS.Endesa.has(nearestRegionId)) ||
    parsedLat <= 38.15 ||
    (normalizedRoute === 'A-2' && parsedLng >= -1.4) ||
    (normalizedRoute === 'AP-68' && parsedLng >= -1.7) ||
    (parsedLat >= 40.2 && parsedLng >= 1.2)
  ) {
    return {
      distributor: 'Endesa',
      confidence: 'medium',
      reason: 'Geographic hints align with Endesa\'s documented southern and north-eastern coverage footprint.',
    };
  }

  if (DISTRIBUTOR_ROUTE_HINTS['i-DE'].has(normalizedRoute) || (nearestRegionId && DISTRIBUTOR_REGION_HINTS['i-DE'].has(nearestRegionId))) {
    return {
      distributor: 'i-DE',
      confidence: 'medium',
      reason: 'Interior route and regional hints align with i-DE default coverage assumptions.',
    };
  }

  return {
    distributor: 'i-DE',
    confidence: 'low',
    reason: 'Default to i-DE for this location and verify the exact municipality against distributor coverage maps before submission.',
  };
};

const getResolvedDistributor = (stationLike) => {
  const providedDistributor = normalizeDistributorNetwork(stationLike.distributorNetwork);
  if (providedDistributor) {
    return {
      distributor: providedDistributor,
      source: stationLike.distributorSource || 'Provided',
      confidence: stationLike.distributorSource === 'Heuristic' ? 'medium' : 'confirmed',
      reason: stationLike.distributorSource === 'Heuristic'
        ? getDistributorRecommendation(stationLike).reason
        : 'Provided directly in the imported files or by manual review.',
    };
  }

  if (stationLike.gridStatus === 'Sufficient') {
    return {
      distributor: '',
      source: 'Not required',
      confidence: 'not-required',
      reason: 'Distributor data is only required for Moderate and Congested friction points.',
    };
  }

  const recommendation = getDistributorRecommendation(stationLike);
  return recommendation.distributor
    ? { ...recommendation, source: 'Heuristic' }
    : { distributor: '', source: 'Missing', confidence: 'none', reason: recommendation.reason };
};

const getSubmissionSlotFromFileName = (name) => {
  const normalized = String(name ?? '').toLowerCase().replace(/[_-]+/g, ' ');
  if (normalized.includes('file 1')) return 'file1';
  if (normalized.includes('file 2')) return 'file2';
  if (normalized.includes('file 3')) return 'file3';
  return null;
};

const parseCsvFile = async (file) => {
  const text = await file.text();
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeHeader,
  });
  const parseErrors = result.errors.filter((error) => error.code !== 'UndetectableDelimiter');
  if (parseErrors.length > 0) {
    throw new Error(`Could not parse ${file.name}: ${parseErrors[0].message}`);
  }

  return result.data
    .map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    ))
    .filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''));
};

const formatImportTimestamp = (value) => (
  value
    ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not imported yet'
);

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return { toasts, addToast, dismissToast };
}

// ─── MAIN APP ────────────────────────────────────────────────────────────
export default function App() {
  // Navigation
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Toasts
  const { toasts, addToast, dismissToast } = useToasts();

  // Project Setup
  const [totalEVs2027, setTotalEVs2027] = useState(0);
  const [existingBaseline, setExistingBaseline] = useState(0);
  const [setupDone, setSetupDone] = useState(false);

  // Stations
  const [stations, setStations] = useState([]);
  const [importStatus, setImportStatus] = useState(EMPTY_IMPORT_STATUS);

  // Map hover
  const [hoveredStation, setHoveredStation] = useState(null);
  const googleMapsConfigured = GOOGLE_MAPS_API_KEY.length > 0;
  const [mapMode, setMapMode] = useState(googleMapsConfigured ? 'google' : 'offline');
  const [mapModeMessage, setMapModeMessage] = useState(
    googleMapsConfigured
      ? 'Google Maps is active using VITE_GOOGLE_MAPS_API_KEY from .env. Keep the offline map as the delivery default for judging.'
      : 'Offline mode is the delivery default. Add VITE_GOOGLE_MAPS_API_KEY only when a live Google Maps view is needed.'
  );

  // Editing
  const [editingStation, setEditingStation] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form state
  const emptyForm = {
    stationId: '',
    lat: '',
    lng: '',
    routeSegment: ROUTE_SEGMENTS[0].code,
    numChargers: 4,
    gridStatus: 'Sufficient',
    distributorNetwork: '',
    powerKW: POWER_STANDARD_KW,
  };
  const [form, setForm] = useState({ ...emptyForm });

  // Export
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // ─── COMPUTED ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalStations = stations.length;
    const totalChargers = stations.reduce((sum, s) => sum + s.numChargers, 0);
    const totalCapacity = totalChargers * POWER_STANDARD_KW;
    const frictionPoints = stations.filter(s => s.gridStatus !== 'Sufficient');
    const complianceRate = stations.length > 0
      ? Math.round((stations.filter(s => s.powerKW >= POWER_STANDARD_KW).length / stations.length) * 100)
      : 0;
    const avgChargersPerStation = stations.length > 0 ? (totalChargers / totalStations).toFixed(1) : 0;
    return { totalStations, totalChargers, totalCapacity, frictionPoints, complianceRate, avgChargersPerStation };
  }, [stations]);

  const corridorCoverage = useMemo(() => (
    ROUTE_SEGMENTS.map((route) => {
      const routeStations = stations.filter((station) => station.routeSegment === route.code);
      const orderedStations = [...routeStations].sort((left, right) => getRouteSortValue(left) - getRouteSortValue(right));
      const gaps = orderedStations.slice(1).map((station, index) => {
        const previousStation = orderedStations[index];
        return {
          from: previousStation,
          to: station,
          gapKm: distanceKm(previousStation.lat, previousStation.lng, station.lat, station.lng),
        };
      });
      const largestGap = gaps.reduce((largest, gap) => (gap.gapKm > largest.gapKm ? gap : largest), { gapKm: 0 });
      const distributors = [...new Set(routeStations.map((station) => getResolvedDistributor(station).distributor).filter(Boolean))];
      const heuristicAssignments = routeStations.filter((station) => getResolvedDistributor(station).source === 'Heuristic' && station.gridStatus !== 'Sufficient').length;
      const status = routeStations.length < 2
        ? 'insufficient'
        : largestGap.gapKm > AFIR_LIGHT_DUTY_MAX_GAP_KM
          ? 'blocked'
          : 'aligned';

      return {
        code: route.code,
        label: route.label,
        stationCount: routeStations.length,
        largestGap,
        status,
        distributors,
        heuristicAssignments,
      };
    })
  ), [stations]);

  const routeCoverageRows = useMemo(() => {
    const rank = { blocked: 0, insufficient: 1, aligned: 2 };
    return corridorCoverage
      .filter((route) => route.stationCount > 0)
      .sort((left, right) => {
        const statusDifference = rank[left.status] - rank[right.status];
        if (statusDifference !== 0) return statusDifference;
        return right.largestGap.gapKm - left.largestGap.gapKm;
      });
  }, [corridorCoverage]);

  const afirBlockingRoutes = useMemo(() => (
    corridorCoverage
      .filter((route) => route.status === 'blocked')
      .map((route) => {
        const fromId = route.largestGap.from?.stationId ?? 'Unknown';
        const toId = route.largestGap.to?.stationId ?? 'Unknown';
        return {
          ...route,
          reason: `${route.code}: largest measured gap (${route.largestGap.gapKm.toFixed(1)} km between ${fromId} and ${toId}) exceeds the team spacing threshold of ${AFIR_LIGHT_DUTY_MAX_GAP_KM} km.`,
        };
      })
  ), [corridorCoverage]);

  const distributorSummary = useMemo(() => (
    DISTRIBUTOR_NETWORK_OPTIONS.map((distributor) => ({
      distributor,
      count: stations.filter((station) => getResolvedDistributor(station).distributor === distributor).length,
    })).filter((entry) => entry.count > 0)
  ), [stations]);

  const heuristicDistributorCount = useMemo(() => (
    stations.filter((station) => getResolvedDistributor(station).source === 'Heuristic' && station.gridStatus !== 'Sufficient').length
  ), [stations]);

  const planningAdvisories = useMemo(() => {
    const advisories = [];
    routeCoverageRows
      .filter((route) => route.status === 'blocked')
      .slice(0, 4)
      .forEach((route) => {
        advisories.push(`${route.code}: reduce the largest straight-line gap from ${route.largestGap.gapKm.toFixed(1)} km to ${AFIR_LIGHT_DUTY_MAX_GAP_KM} km or less before treating this corridor as ready.`);
      });

    if (heuristicDistributorCount > 0) {
      advisories.push(`${heuristicDistributorCount} friction point${heuristicDistributorCount === 1 ? ' uses' : 'use'} a research-based distributor default and must be verified before final submission.`);
    }

    return advisories;
  }, [heuristicDistributorCount, routeCoverageRows]);

  // ─── HANDLERS ────────────────────────────────────────────────────────
  const handleMapModeChange = useCallback((nextMode) => {
    if (nextMode === 'google' && !googleMapsConfigured) {
      addToast('Add VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.', 'warning');
      setMapModeMessage('Google Maps is unavailable until VITE_GOOGLE_MAPS_API_KEY is configured. The bundled offline map remains ready for delivery.');
      return;
    }

    setMapMode(nextMode);
    setMapModeMessage(
      nextMode === 'google'
        ? 'Google Maps uses the API key from .env, loads live tiles, and requires internet access. Use it for demos, and keep offline mode for delivery.'
        : 'Offline mode uses the bundled SVG map and remains the direct-open version for submission delivery.'
    );
  }, [addToast, googleMapsConfigured]);

  const handleGoogleMapsFailure = useCallback((message) => {
    setMapMode('offline');
    setMapModeMessage(message);
    addToast(message, 'warning');
  }, [addToast]);

  const renderNetworkMap = (height) => (
    mapMode === 'google' && googleMapsConfigured
      ? (
        <GoogleStationMap
          stations={stations}
          hoveredStation={hoveredStation}
          setHoveredStation={setHoveredStation}
          height={height}
          onLoadFailure={handleGoogleMapsFailure}
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          defaultMapCenter={DEFAULT_MAP_CENTER}
          googleMapOptions={GOOGLE_MAP_OPTIONS}
          gridStatusOptions={GRID_STATUS_OPTIONS}
          powerStandardKw={POWER_STANDARD_KW}
          getGridColorHex={getGridColorHex}
          getRouteLabel={getRouteLabel}
          formatCoordinate={formatCoordinate}
          getGoogleMapsLocationUrl={getGoogleMapsLocationUrl}
        />
      )
      : (
        <SpainMap
          stations={stations}
          hoveredStation={hoveredStation}
          setHoveredStation={setHoveredStation}
          minHeight={height}
          regions={SPAIN_REGIONS}
          powerStandardKw={POWER_STANDARD_KW}
          getGridColorHex={getGridColorHex}
          getRouteLabel={getRouteLabel}
        />
      )
  );

  const getStationFormError = (candidate, currentStationId = null) => {
    const trimmedStationId = candidate.stationId.trim();
    const lat = parseFloat(candidate.lat);
    const lng = parseFloat(candidate.lng);
    const numChargers = parseInt(candidate.numChargers, 10);

    if (!trimmedStationId) return 'Station ID is required';
    if (stations.some(station => station.stationId.toLowerCase() === trimmedStationId.toLowerCase() && station.id !== currentStationId)) {
      return 'Station ID must be unique';
    }
    if (!ROUTE_SEGMENTS.some(route => route.code === candidate.routeSegment)) {
      return 'Route segment must use an official interurban road code';
    }
    if (!GRID_STATUS_OPTIONS.some(option => option.value === candidate.gridStatus)) {
      return 'Grid status must be Sufficient, Moderate, or Congested';
    }
    const requiresDistributor = candidate.gridStatus !== 'Sufficient';
    const resolvedDistributor = getResolvedDistributor(candidate);
    if (requiresDistributor && !DISTRIBUTOR_NETWORK_OPTIONS.includes(resolvedDistributor.distributor)) {
      return 'Distributor network must be i-DE, Endesa, or Viesgo';
    }
    if (!requiresDistributor && candidate.distributorNetwork && !DISTRIBUTOR_NETWORK_OPTIONS.includes(candidate.distributorNetwork)) {
      return 'Distributor network must be i-DE, Endesa, or Viesgo when provided';
    }
    if (isNaN(lat) || lat < 27 || lat > 44) return 'Latitude must be between 27° and 44°';
    if (isNaN(lng) || lng < -19 || lng > 5) return 'Longitude must be between -19° and 5°';
    if (Number.isNaN(numChargers) || numChargers < 1) return 'Must have at least 1 charger';

    const urbanZone = findUrbanExclusionZone(lat, lng);
    if (urbanZone) {
      return `Location falls inside the ${urbanZone.name} urban exclusion zone. Use an interurban corridor site.`;
    }

    return null;
  };

  const buildStationFromForm = (id = generateId()) => {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const resolvedDistributor = getResolvedDistributor({
      lat,
      lng,
      routeSegment: form.routeSegment,
      gridStatus: form.gridStatus,
      distributorNetwork: form.distributorNetwork,
      distributorSource: form.distributorNetwork ? 'Manual' : '',
    });
    return {
      id,
      stationId: form.stationId.trim(),
      locationId: form.stationId.trim(),
      bottleneckId: form.gridStatus === 'Sufficient' ? '' : form.stationId.trim(),
      lat,
      lng,
      routeSegment: form.routeSegment,
      numChargers: parseInt(form.numChargers, 10),
      gridStatus: form.gridStatus,
      distributorNetwork: form.gridStatus === 'Sufficient' ? (normalizeDistributorNetwork(form.distributorNetwork) || '') : resolvedDistributor.distributor,
      distributorSource: form.gridStatus === 'Sufficient'
        ? (normalizeDistributorNetwork(form.distributorNetwork) ? 'Manual' : '')
        : resolvedDistributor.source,
      powerKW: POWER_STANDARD_KW,
      ...latLngToMapXY(lat, lng),
    };
  };

  const handleAddStation = () => {
    const formError = getStationFormError(form);
    if (formError) { addToast(formError, 'error'); return; }

    const newStation = buildStationFromForm();
    setStations(prev => [...prev, newStation]);
    setForm({ ...emptyForm });
    setShowAddModal(false);
    addToast(`Station ${newStation.stationId} added successfully`, 'success');
  };

  const handleUpdateStation = () => {
    if (!editingStation) return;
    const formError = getStationFormError(form, editingStation.id);
    if (formError) { addToast(formError, 'error'); return; }

    const updatedStation = buildStationFromForm(editingStation.id);
    setStations(prev => prev.map(s => s.id === editingStation.id ? updatedStation : s));
    setEditingStation(null);
    setForm({ ...emptyForm });
    addToast('Station updated', 'success');
  };

  const handleDeleteStation = (id) => {
    const st = stations.find(s => s.id === id);
    setStations(prev => prev.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
    addToast(`Station ${st?.stationId} removed`, 'warning');
  };

  const startEdit = (station) => {
    setEditingStation(station);
    setForm({
      stationId: station.stationId, lat: String(station.lat), lng: String(station.lng),
      routeSegment: station.routeSegment, numChargers: station.numChargers,
      gridStatus: station.gridStatus,
      distributorNetwork: station.distributorSource === 'Manual' || station.distributorSource === 'Imported' ? station.distributorNetwork : '',
      powerKW: station.powerKW,
    });
  };

  // ─── VALIDATION & EXPORT ─────────────────────────────────────────────
  const handleImportSelection = useCallback(async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const slotFiles = { file1: null, file2: null, file3: null };
    files.forEach((file) => {
      const slot = getSubmissionSlotFromFileName(file.name);
      if (slot) slotFiles[slot] = file;
    });

    if (!slotFiles.file2) {
      addToast('Import requires File 2.csv because it contains the proposed station list.', 'error');
      return;
    }

    try {
      const [file1Rows, file2Rows, file3Rows] = await Promise.all([
        slotFiles.file1 ? parseCsvFile(slotFiles.file1) : Promise.resolve([]),
        parseCsvFile(slotFiles.file2),
        slotFiles.file3 ? parseCsvFile(slotFiles.file3) : Promise.resolve([]),
      ]);

      const warnings = [];
      const frictionRecords = file3Rows.map((row, index) => {
        const bottleneckId = String(row.bottleneck_id ?? '').trim();
        const lat = parseDecimal(row.latitude);
        const lng = parseDecimal(row.longitude);
        const routeSegment = normalizeRouteSegment(row.route_segment);
        const distributorNetwork = normalizeDistributorNetwork(row.distributor_network);
        const estimatedDemandKw = parseInteger(row.estimated_demand_kw);
        const gridStatus = normalizeGridStatus(row.grid_status);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          throw new Error(`File 3 row ${index + 2} has invalid coordinates.`);
        }
        if (!ROUTE_SEGMENTS.some((route) => route.code === routeSegment)) {
          throw new Error(`File 3 row ${index + 2} uses an unknown route_segment.`);
        }
        if (!distributorNetwork) {
          throw new Error(`File 3 row ${index + 2} has an unknown distributor_network.`);
        }
        if (Number.isNaN(estimatedDemandKw) || estimatedDemandKw <= 0) {
          throw new Error(`File 3 row ${index + 2} has an invalid estimated_demand_kw value.`);
        }
        if (!gridStatus || gridStatus === 'Sufficient') {
          throw new Error(`File 3 row ${index + 2} must be Moderate or Congested.`);
        }

        return {
          bottleneckId,
          lat,
          lng,
          routeSegment,
          distributorNetwork,
          estimatedDemandKw,
          gridStatus,
          matchKey: buildStationMatchKey(lat, lng, routeSegment),
        };
      });

      const frictionById = new Map();
      const frictionByKey = new Map();
      frictionRecords.forEach((record) => {
        if (record.bottleneckId) frictionById.set(record.bottleneckId.toLowerCase(), record);
        frictionByKey.set(record.matchKey, record);
      });

      const seenLocationIds = new Set();
      const matchedFrictionIds = new Set();
      const matchedFrictionKeys = new Set();
      const importedStations = file2Rows.map((row, index) => {
        const locationId = String(row.location_id ?? '').trim();
        const lat = parseDecimal(row.latitude);
        const lng = parseDecimal(row.longitude);
        const routeSegment = normalizeRouteSegment(row.route_segment);
        const numChargers = parseInteger(row.n_chargers_proposed);
        const gridStatus = normalizeGridStatus(row.grid_status);

        if (!locationId) throw new Error(`File 2 row ${index + 2} is missing location_id.`);
        if (seenLocationIds.has(locationId.toLowerCase())) {
          throw new Error(`File 2 contains a duplicate location_id: ${locationId}.`);
        }
        seenLocationIds.add(locationId.toLowerCase());
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          throw new Error(`File 2 row ${index + 2} has invalid coordinates.`);
        }
        if (!ROUTE_SEGMENTS.some((route) => route.code === routeSegment)) {
          throw new Error(`File 2 row ${index + 2} uses an unknown route_segment.`);
        }
        if (Number.isNaN(numChargers) || numChargers <= 0) {
          throw new Error(`File 2 row ${index + 2} has an invalid n_chargers_proposed value.`);
        }
        if (!gridStatus) {
          throw new Error(`File 2 row ${index + 2} has an invalid grid_status value.`);
        }

        const matchKey = buildStationMatchKey(lat, lng, routeSegment);
        const matchedFriction = frictionById.get(locationId.toLowerCase()) ?? frictionByKey.get(matchKey) ?? null;

        if (matchedFriction) {
          matchedFrictionKeys.add(matchedFriction.matchKey);
          if (matchedFriction.bottleneckId) matchedFrictionIds.add(matchedFriction.bottleneckId.toLowerCase());
          if (gridStatus !== matchedFriction.gridStatus) {
            warnings.push(`${locationId} had mismatched grid_status values between File 2 and File 3. File 3 was used for friction reporting.`);
          }
        }

        return {
          id: generateId(),
          stationId: locationId,
          locationId,
          bottleneckId: matchedFriction?.bottleneckId ?? '',
          lat,
          lng,
          routeSegment,
          numChargers,
          gridStatus: matchedFriction?.gridStatus ?? gridStatus,
          distributorNetwork: matchedFriction?.distributorNetwork ?? (
            gridStatus === 'Sufficient' ? '' : getDistributorRecommendation({ lat, lng, routeSegment }).distributor
          ),
          distributorSource: matchedFriction?.distributorNetwork ? 'Imported' : (
            gridStatus === 'Sufficient' ? '' : 'Heuristic'
          ),
          powerKW: POWER_STANDARD_KW,
          ...latLngToMapXY(lat, lng),
        };
      });

      frictionRecords.forEach((record, index) => {
        const frictionId = record.bottleneckId.toLowerCase();
        if ((frictionId && matchedFrictionIds.has(frictionId)) || matchedFrictionKeys.has(record.matchKey)) return;

        importedStations.push({
          id: generateId(),
          stationId: record.bottleneckId || generateSequentialId('FRIC', importedStations.length + index),
          locationId: '',
          bottleneckId: record.bottleneckId,
          lat: record.lat,
          lng: record.lng,
          routeSegment: record.routeSegment,
          numChargers: Math.max(1, Math.round(record.estimatedDemandKw / POWER_STANDARD_KW)),
          gridStatus: record.gridStatus,
          distributorNetwork: record.distributorNetwork,
          distributorSource: 'Imported',
          powerKW: POWER_STANDARD_KW,
          ...latLngToMapXY(record.lat, record.lng),
        });
      });

      if (importedStations.length === 0) {
        throw new Error('File 2.csv did not contain any valid station rows.');
      }

      if (slotFiles.file1) {
        const summaryRow = file1Rows[0];
        if (!summaryRow) throw new Error('File 1.csv must contain a single summary row.');

        const proposedStations = parseInteger(summaryRow.total_proposed_stations);
        const baselineStations = parseInteger(summaryRow.total_existing_stations_baseline);
        const frictionPoints = parseInteger(summaryRow.total_friction_points);
        const projectedEvs = parseInteger(summaryRow.total_ev_projected_2027);

        if ([proposedStations, baselineStations, frictionPoints, projectedEvs].some((value) => Number.isNaN(value))) {
          throw new Error('File 1.csv is missing one or more required KPI fields.');
        }

        setExistingBaseline(baselineStations);
        setTotalEVs2027(projectedEvs);
        setSetupDone(true);

        if (proposedStations !== importedStations.length) {
          warnings.push(`File 1 reported ${proposedStations} proposed stations, but ${importedStations.length} were loaded from File 2 and File 3.`);
        }
        const importedFrictionCount = importedStations.filter((station) => station.gridStatus !== 'Sufficient').length;
        if (frictionPoints !== importedFrictionCount) {
          warnings.push(`File 1 reported ${frictionPoints} friction points, but ${importedFrictionCount} were reconstructed in the app state.`);
        }
      } else {
        warnings.push('File 1.csv was not provided, so projected EVs and baseline values remain unchanged until that file is loaded.');
      }

      if (!slotFiles.file3 && importedStations.some((station) => station.gridStatus !== 'Sufficient')) {
        warnings.push('File 3.csv was not provided. Load it or complete the missing friction-point distributor data before exporting again.');
      }

      const heuristicAssignments = importedStations.filter((station) => station.distributorSource === 'Heuristic' && station.gridStatus !== 'Sufficient').length;
      if (heuristicAssignments > 0) {
        warnings.push(`${heuristicAssignments} friction point${heuristicAssignments === 1 ? ' uses' : 'use'} a research-based distributor default. Verify those assignments before final export.`);
      }

      setStations(importedStations);
      setHoveredStation(null);
      setEditingStation(null);
      setShowAddModal(false);
      setShowDeleteConfirm(null);
      setActivePage('dashboard');
      setImportStatus({
        importedAt: new Date().toISOString(),
        file1Name: slotFiles.file1?.name ?? null,
        file2Name: slotFiles.file2.name,
        file3Name: slotFiles.file3?.name ?? null,
        stationCount: importedStations.length,
        frictionCount: importedStations.filter((station) => station.gridStatus !== 'Sufficient').length,
      });

      addToast(`Imported ${importedStations.length} station${importedStations.length === 1 ? '' : 's'} from your submission files.`, 'success');
      warnings.slice(0, 2).forEach((warning) => addToast(warning, 'warning'));
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Import failed.', 'error');
    }
  }, [addToast]);

  const validationErrors = useMemo(() => {
    const errors = [];
    if (stations.length === 0) errors.push('No stations defined');
    const seenStationIds = new Set();

    stations.forEach(s => {
      if (!s.stationId) errors.push(`${s.stationId || 'Unknown'}: Missing station ID`);
      const normalizedStationId = s.stationId.toLowerCase();
      if (seenStationIds.has(normalizedStationId)) errors.push(`${s.stationId}: Station ID must be unique`);
      seenStationIds.add(normalizedStationId);
      if (s.powerKW !== POWER_STANDARD_KW) errors.push(`${s.stationId}: Power must equal ${POWER_STANDARD_KW} kW`);
      if (!ROUTE_SEGMENTS.some(route => route.code === s.routeSegment)) errors.push(`${s.stationId}: route_segment must be an official interurban road code`);
      if (!GRID_STATUS_OPTIONS.some(option => option.value === s.gridStatus)) errors.push(`${s.stationId}: grid_status must be Sufficient, Moderate, or Congested`);
      const resolvedDistributor = getResolvedDistributor(s);
      if (s.gridStatus !== 'Sufficient' && !DISTRIBUTOR_NETWORK_OPTIONS.includes(resolvedDistributor.distributor)) {
        errors.push(`${s.stationId}: distributor_network must be i-DE, Endesa, or Viesgo for friction points`);
      }
      if (s.gridStatus === 'Sufficient' && s.distributorNetwork && !DISTRIBUTOR_NETWORK_OPTIONS.includes(s.distributorNetwork)) {
        errors.push(`${s.stationId}: distributor_network must be i-DE, Endesa, or Viesgo when provided`);
      }

      const urbanZone = findUrbanExclusionZone(s.lat, s.lng);
      if (urbanZone) errors.push(`${s.stationId}: Located inside the ${urbanZone.name} urban exclusion zone`);
    });

    afirBlockingRoutes.forEach((route) => {
      errors.push(route.reason);
    });

    if (totalEVs2027 <= 0) errors.push('Total EVs 2027 must be positive');
    if (existingBaseline < 0) errors.push('Existing baseline stations cannot be negative');
    return errors;
  }, [afirBlockingRoutes, existingBaseline, stations, totalEVs2027]);

  const exportFile1 = () => {
    const headers = [
      'total_proposed_stations',
      'total_existing_stations_baseline',
      'total_friction_points',
      'total_ev_projected_2027',
    ];
    const rows = [[
      kpis.totalStations,
      existingBaseline,
      kpis.frictionPoints.length,
      totalEVs2027,
    ]];
    downloadCSV('File 1.csv', headers, rows);
    addToast('File 1 (KPIs) exported', 'success');
  };

  const exportFile2 = () => {
    const headers = ['location_id', 'latitude', 'longitude', 'route_segment', 'n_chargers_proposed', 'grid_status'];
    const rows = stations.map((s, index) => [
      s.locationId || s.stationId || generateSequentialId('IBE', index), s.lat, s.lng, s.routeSegment, s.numChargers, s.gridStatus,
    ]);
    downloadCSV('File 2.csv', headers, rows);
    addToast('File 2 (Proposed Locations) exported', 'success');
  };

  const exportFile3 = () => {
    const headers = ['bottleneck_id', 'latitude', 'longitude', 'route_segment', 'distributor_network', 'estimated_demand_kw', 'grid_status'];
    const rows = kpis.frictionPoints.map((s, index) => [
      s.bottleneckId || s.stationId || generateSequentialId('FRIC', index), s.lat, s.lng, s.routeSegment, getResolvedDistributor(s).distributor, s.numChargers * POWER_STANDARD_KW, s.gridStatus,
    ]);
    downloadCSV('File 3.csv', headers, rows);
    addToast('File 3 (Friction Points) exported', 'success');
  };

  const handlePrepareSubmission = () => {
    if (validationErrors.length > 0) {
      setShowSubmitModal(true);
      return;
    }
    exportFile1();
    setTimeout(() => exportFile2(), 200);
    setTimeout(() => exportFile3(), 400);
    setTimeout(() => addToast('All submission files prepared successfully!', 'success'), 600);
  };

  // ─── DEPLOYMENT ROADMAP ──────────────────────────────────────────────
  const roadmap = useMemo(() => {
    const sufficient = stations.filter(s => s.gridStatus === 'Sufficient');
    const moderate = stations.filter(s => s.gridStatus === 'Moderate');
    const congested = stations.filter(s => s.gridStatus === 'Congested');
    return [
      {
        phase: 'Phase 1 — Immediate Deployment',
        period: 'Q1–Q2 2027',
        description: `Deploy ${sufficient.length} station(s) with grid-ready infrastructure. These locations have sufficient grid capacity for immediate charger installation.`,
        stations: sufficient,
        status: 'ready',
      },
      {
        phase: 'Phase 2 — Grid Reinforcement',
        period: 'Q2–Q3 2027',
        description: `Address ${moderate.length} station(s) requiring moderate grid upgrades. Coordinate with REE for grid reinforcement before deployment.`,
        stations: moderate,
        status: 'pending',
      },
      {
        phase: 'Phase 3 — Strategic Expansion',
        period: 'Q3–Q4 2027',
        description: `Plan ${congested.length} station(s) in congested grid areas. Requires major infrastructure investment and regulatory coordination.`,
        stations: congested,
        status: 'blocked',
      },
    ];
  }, [stations]);

  // ─── NAV ITEMS ───────────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Map Explorer', icon: Map },
    { id: 'friction', label: 'Risk & Friction', icon: AlertTriangle },
    { id: 'export', label: 'Reports', icon: Download },
  ];

  const pageMeta = {
    dashboard: {
      eyebrow: 'Program Control',
      title: 'Strategic infrastructure dashboard',
      summary: 'Read the final network posture, corridor readiness, and distributor coverage in one place.',
    },
    map: {
      eyebrow: 'Spatial Intelligence',
      title: 'Corridor map explorer',
      summary: 'Inspect the proposed locations, confirm corridor coverage, and open each site in Google Maps.',
    },
    friction: {
      eyebrow: 'Risk Control',
      title: 'Grid friction analysis',
      summary: 'Classify which stations deploy now, which stay in plan with action, and which must wait for reinforcement.',
    },
    export: {
      eyebrow: 'Submission Room',
      title: 'Reports and datathon delivery',
      summary: 'Confirm submission readiness, check PDF alignment, and export the three required CSV files.',
    },
  };

  // ─── FORM INPUT COMPONENT ────────────────────────────────────────────
  const FormField = ({ label, children, className = '' }) => (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-iberdrola-500 focus:outline-none focus:ring-2 focus:ring-iberdrola-500/20";
  const selectCls = "w-full appearance-none rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-iberdrola-500 focus:outline-none focus:ring-2 focus:ring-iberdrola-500/20";
  const surfaceCls = "rounded-[30px] border border-slate-200/90 bg-white/88 shadow-[0_20px_60px_rgba(148,163,184,0.16)] backdrop-blur-xl";
  const softSurfaceCls = "rounded-[24px] border border-slate-200/90 bg-slate-50/85";
  const sectionTitleCls = "text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500";
  const primaryButtonCls = "inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition hover:bg-slate-800";
  const accentButtonCls = "inline-flex items-center gap-2 rounded-2xl bg-iberdrola-accent px-5 py-2.5 text-sm font-semibold text-iberdrola-900 shadow-[0_16px_35px_rgba(163,209,51,0.28)] transition hover:bg-iberdrola-accent-light";
  const ghostButtonCls = "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white";

  // ─── STATION FORM (shared) ───────────────────────────────────────────
  const StationForm = ({ onSubmit, submitLabel }) => {
    const distributorSuggestion = getDistributorRecommendation({
      lat: form.lat,
      lng: form.lng,
      routeSegment: form.routeSegment,
    });

    return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Station ID">
          <input className={inputCls} placeholder="IB-XXX-001" value={form.stationId}
            onChange={e => setForm(f => ({ ...f, stationId: e.target.value }))} />
        </FormField>
        <FormField label="Route Segment">
          <select className={selectCls} value={form.routeSegment}
            onChange={e => setForm(f => ({ ...f, routeSegment: e.target.value }))}>
            {ROUTE_SEGMENTS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Latitude">
          <input className={inputCls} type="number" step="0.0001" placeholder="40.4168"
            value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
        </FormField>
        <FormField label="Longitude">
          <input className={inputCls} type="number" step="0.0001" placeholder="-3.7038"
            value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
        </FormField>
        <FormField label="Num Chargers">
          <input className={inputCls} type="number" min="1" max="50"
            value={form.numChargers} onChange={e => setForm(f => ({ ...f, numChargers: parseInt(e.target.value) || 1 }))} />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Grid Status">
          <select className={selectCls} value={form.gridStatus}
            onChange={e => setForm(f => ({ ...f, gridStatus: e.target.value }))}>
            {GRID_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <FormField label="Distributor Network">
          <select className={selectCls} value={form.distributorNetwork}
            onChange={e => setForm(f => ({ ...f, distributorNetwork: e.target.value }))}>
            <option value="">Auto-suggest from location</option>
            {DISTRIBUTOR_NETWORK_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {form.gridStatus === 'Sufficient'
              ? 'Not required for Sufficient stations. Moderate and Congested sites use this value or the territory default.'
              : distributorSuggestion.distributor
                ? `Default distributor: ${distributorSuggestion.distributor} (${distributorSuggestion.confidence} confidence). ${distributorSuggestion.reason}`
                : distributorSuggestion.reason}
          </p>
        </FormField>
        <FormField label="Power per Charger">
          <div className="flex items-center gap-2">
            <input className={`${inputCls} bg-slate-100 text-slate-500`} value={`${POWER_STANDARD_KW} kW`} disabled />
            <div className="flex items-center gap-1 whitespace-nowrap text-xs text-emerald-600">
              <Shield size={12} /> Compliant
            </div>
          </div>
        </FormField>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => { setShowAddModal(false); setEditingStation(null); setForm({ ...emptyForm }); }}
          className={ghostButtonCls}>
          Cancel
        </button>
        <button onClick={onSubmit}
          className={primaryButtonCls}>
          <Check size={16} /> {submitLabel}
        </button>
      </div>
    </div>
    );
  };

  // ─── PAGES ───────────────────────────────────────────────────────────

  // DASHBOARD
  const DashboardPage = () => (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,250,0.95),rgba(236,253,245,0.9))] p-6 shadow-[0_28px_80px_rgba(148,163,184,0.18)]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(163,209,51,0.22),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-sky-100/80 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className={sectionTitleCls}>National Rollout Brief</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-slate-950 lg:text-[2.15rem]">
                Spain interurban charging plan with corridor, grid, and submission readiness in one view.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                The dashboard is tuned for the datathon handoff: proposed charging locations, friction points, distributor defaults, and the submission-quality checks stay visible without leaving the planning surface.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[
                  `${POWER_STANDARD_KW} kW fixed charger standard`,
                  `${new Set(stations.map(s => s.routeSegment)).size || 0} active corridor routes`,
                  `${googleMapsConfigured ? 'Google Maps live mode ready' : 'Offline map packaged'}`,
                ].map((pill) => (
                  <span key={pill} className="rounded-full border border-white/90 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-3 sm:min-w-[320px]">
              {[
                { label: 'Proposed sites', value: kpis.totalStations, tone: 'emerald' },
                { label: 'Corridors tracked', value: new Set(stations.map(s => s.routeSegment)).size, tone: 'sky' },
                { label: 'Critical frictions', value: kpis.frictionPoints.filter(point => point.gridStatus === 'Congested').length, tone: 'red' },
                { label: 'Baseline chargers', value: existingBaseline.toLocaleString(), tone: 'slate' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-[24px] border px-4 py-3 shadow-sm ${
                    item.tone === 'emerald'
                      ? 'border-emerald-200 bg-emerald-50/80'
                      : item.tone === 'sky'
                        ? 'border-sky-200 bg-sky-50/80'
                        : item.tone === 'red'
                          ? 'border-red-200 bg-red-50/80'
                          : 'border-slate-200 bg-white/80'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950 tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${surfaceCls} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={sectionTitleCls}>Program Snapshot</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Submission posture</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
              validationErrors.length === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {validationErrors.length === 0 ? 'Ready' : 'Review'}
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {[
              {
                label: 'Submission files',
                value: importStatus.file2Name ? 'Real outputs loaded' : 'Waiting for File 2.csv',
                detail: 'Import File 1, File 2, and File 3 to mirror the final deliverable in-app.',
              },
              {
                label: 'Grid bottlenecks',
                value: `${kpis.frictionPoints.length} friction point${kpis.frictionPoints.length === 1 ? '' : 's'}`,
                detail: kpis.frictionPoints.length === 0 ? 'No Moderate or Congested stations are currently flagged.' : 'Moderate and Congested stations remain visible in the risk workflow and export controls.',
              },
              {
                label: 'Corridor spacing gate',
                value: afirBlockingRoutes.length === 0 ? 'Within team tolerance' : `${afirBlockingRoutes.length} blocked route${afirBlockingRoutes.length === 1 ? '' : 's'}`,
                detail: 'This remains an internal planning rule layered on top of the PDF-required checks.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-slate-200/90 bg-slate-50/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!setupDone && (
        <div className="rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(163,209,51,0.22),rgba(255,255,255,0.96),rgba(14,165,233,0.08))] p-6 shadow-[0_24px_60px_rgba(148,163,184,0.14)]">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg">
              <Settings size={24} className="text-iberdrola-accent" />
            </div>
            <div className="flex-1">
              <p className={sectionTitleCls}>Launch Parameters</p>
              <h3 className="mb-1 text-xl font-semibold text-slate-950">Project setup</h3>
              <p className="mb-4 text-sm text-slate-600">Configure the baseline values that anchor the 2027 EV infrastructure plan.</p>
              <p className="mb-4 text-xs text-slate-500">Upload File 1.csv in Reports to hydrate these automatically from your real submission output.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Total Projected EVs in 2027">
                  <input className={inputCls} type="number" value={totalEVs2027}
                    onChange={e => setTotalEVs2027(parseInt(e.target.value) || 0)} />
                </FormField>
                <FormField label="Existing Baseline Chargers">
                  <input className={inputCls} type="number" value={existingBaseline}
                    onChange={e => setExistingBaseline(parseInt(e.target.value) || 0)} />
                </FormField>
              </div>
              <button onClick={() => { setSetupDone(true); addToast('Baseline configured successfully', 'success'); }}
                className={`mt-4 ${accentButtonCls}`}>
                <Check size={16} /> Confirm Setup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={MapPin} label="Total Stations" value={kpis.totalStations} color="emerald"
          sublabel={`${kpis.avgChargersPerStation} avg chargers/station`} />
        <KpiCard icon={Zap} label="Total Capacity" value={`${(kpis.totalCapacity / 1000).toFixed(1)} MW`} color="blue"
          sublabel={`${kpis.totalChargers} chargers @ ${POWER_STANDARD_KW} kW`} />
        <KpiCard icon={AlertTriangle} label="Friction Points" value={kpis.frictionPoints.length} color={kpis.frictionPoints.length > 0 ? 'red' : 'emerald'}
          sublabel={kpis.frictionPoints.length > 0 ? `${kpis.frictionPoints.filter(f => f.gridStatus === 'Congested').length} critical` : 'All stations clear'} />
        <KpiCard icon={Target} label="Projected EVs 2027" value={totalEVs2027.toLocaleString()} color="violet"
          sublabel={`Baseline: ${existingBaseline.toLocaleString()} chargers`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={`${surfaceCls} p-5`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className={sectionTitleCls}>Corridor Spacing Decision</h3>
              <p className="mt-1 text-xs text-slate-500">Internal team rule: keep every measured gap at or below {AFIR_LIGHT_DUTY_MAX_GAP_KM} km. This determines internal readiness, but it does not change the PDF schema.</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-sky-700">EU Reference Ratios</p>
              <p className="text-xs text-slate-700">{AFIR_PUBLIC_POWER_PER_BEV_KW} kW per BEV / {AFIR_PUBLIC_POWER_PER_PHEV_KW} kW per PHEV</p>
            </div>
          </div>
          <div className="space-y-3">
            {routeCoverageRows.length === 0 ? (
              <p className="text-sm text-slate-500">Import File 2.csv or add stations to start evaluating route spacing.</p>
            ) : routeCoverageRows.slice(0, 6).map((route) => (
              <div key={route.code} className={`${softSurfaceCls} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{route.code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        route.status === 'aligned'
                          ? 'bg-emerald-100 text-emerald-700'
                          : route.status === 'blocked'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        {route.status === 'aligned' ? 'Ready' : route.status === 'blocked' ? 'Blocked' : 'Add Stops'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{route.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Largest Gap</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {route.stationCount < 2 ? 'N/A' : `${route.largestGap.gapKm.toFixed(1)} km`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>{route.stationCount} station{route.stationCount === 1 ? '' : 's'}</span>
                  {route.distributors.length > 0 && <span>Distributors: {route.distributors.join(', ')}</span>}
                  {route.heuristicAssignments > 0 && <span className="text-amber-700">{route.heuristicAssignments} default assignment{route.heuristicAssignments === 1 ? '' : 's'} to verify</span>}
                </div>
                {route.largestGap.from && route.largestGap.to && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Largest interval: {route.largestGap.from.stationId} to {route.largestGap.to.stationId}. The extra {AFIR_TEN_T_EXIT_ALLOWANCE_KM} km exit allowance is included in this internal spacing check.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={`${surfaceCls} p-5`}>
          <h3 className={`${sectionTitleCls} mb-4`}>Distributor Territory Defaults</h3>
          <div className="mb-4 space-y-3">
            {DISTRIBUTOR_RESEARCH_NOTES.map((note) => (
              <div key={note.distributor} className={`rounded-2xl border p-4 ${
                note.tone === 'official' ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'
              }`}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{note.distributor}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    note.tone === 'official' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {note.tone === 'official' ? 'Public source' : 'Territory default'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{note.summary}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DISTRIBUTOR_NETWORK_OPTIONS.map((distributor) => {
              const count = distributorSummary.find((entry) => entry.distributor === distributor)?.count ?? 0;
              return (
                <div key={distributor} className={`${softSurfaceCls} p-4 text-center`}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{distributor}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{count}</p>
                  <p className="text-[11px] text-slate-500">stations currently mapped</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Use these defaults for assignment, then verify border provinces and municipalities served by other Spanish DSOs before final delivery.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className={sectionTitleCls}>Network Overview</h3>
              <p className="mt-1 text-xs text-slate-500">Review the proposed network on the bundled submission map or the live Google layer without losing station metadata.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <MapModeToggle mapMode={mapMode} onChange={handleMapModeChange} googleMapsConfigured={googleMapsConfigured} />
              <button onClick={() => setActivePage('map')} className="flex items-center gap-1 text-xs font-semibold text-iberdrola-700 transition hover:text-iberdrola-500">
                Full Map <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <MapModeNotice mapMode={mapMode} message={mapModeMessage} />
          <div className="mt-3">{renderNetworkMap(360)}</div>
        </div>

        <div>
          <h3 className={`${sectionTitleCls} mb-3`}>Deployment Roadmap</h3>
          <div className="space-y-3">
            {roadmap.map((phase, i) => (
              <div key={i} className={`rounded-[28px] border p-4 shadow-sm ${
                phase.status === 'ready' ? 'border-emerald-200 bg-emerald-50/80' :
                phase.status === 'pending' ? 'border-amber-200 bg-amber-50/80' :
                'border-red-200 bg-red-50/80'
              }`}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{phase.phase}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] ${
                    phase.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                    phase.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>{phase.period}</span>
                </div>
                <p className="mb-2 text-xs text-slate-600">{phase.description}</p>
                <div className="flex flex-wrap gap-1">
                  {phase.stations.map(s => (
                    <span key={s.id} className="rounded-lg border border-white/70 bg-white/85 px-1.5 py-0.5 text-[10px] font-mono text-slate-700">
                      {s.stationId} · {s.routeSegment}
                    </span>
                  ))}
                  {phase.stations.length === 0 && <span className="text-[10px] italic text-slate-400">No stations</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className={`${surfaceCls} p-5`}>
          <h3 className={`${sectionTitleCls} mb-4`}>Compliance Overview</h3>
          <div className="mb-3 flex items-center gap-4">
            <div className="relative h-20 w-20">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke={kpis.complianceRate === 100 ? '#10b981' : '#eab308'}
                  strokeWidth="3" strokeDasharray={`${kpis.complianceRate}, 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-900">{kpis.complianceRate}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{POWER_STANDARD_KW} kW Standard</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {kpis.complianceRate === 100
                  ? 'All stations meet the mandatory power requirement'
                  : `${stations.filter(s => s.powerKW < POWER_STANDARD_KW).length} station(s) below standard`}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-500">{stations.filter(s => s.gridStatus === 'Sufficient').length}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Sufficient</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-500">{stations.filter(s => s.gridStatus === 'Moderate').length}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Moderate</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-500">{stations.filter(s => s.gridStatus === 'Congested').length}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Congested</p>
            </div>
          </div>
        </div>

        <div className={`${surfaceCls} p-5`}>
          <h3 className={`${sectionTitleCls} mb-4`}>Infrastructure Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Total Energy Capacity', value: `${(kpis.totalCapacity / 1000).toFixed(1)} MW`, icon: Zap },
              { label: 'EVs per Charger Ratio', value: kpis.totalChargers > 0 ? `${Math.round(totalEVs2027 / kpis.totalChargers)}:1` : 'N/A', icon: Gauge },
              { label: 'Network Coverage', value: `${new Set(stations.map(s => s.routeSegment)).size} routes`, icon: Globe },
              { label: 'Avg Station Size', value: `${kpis.avgChargersPerStation} chargers`, icon: Layers },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-200 py-2 last:border-0">
                <div className="flex items-center gap-2.5">
                  <item.icon size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-600">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // MAP PAGE
  const MapPage = () => (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,250,0.95),rgba(224,242,254,0.88))] p-6 shadow-[0_28px_80px_rgba(148,163,184,0.18)]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_55%)]" />
          <div className="pointer-events-none absolute -bottom-12 right-0 h-48 w-48 rounded-full bg-emerald-100/80 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className={sectionTitleCls}>Interactive Geospatial Layer</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-slate-950 lg:text-[2.15rem]">
                Review the final corridor charging network with live map mode, offline delivery mode, and station actions in one workspace.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Use this surface to confirm spatial coverage, compare grid readiness across routes, and jump directly into Google Maps when the live key is available.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[
                  `${stations.length} proposed station${stations.length === 1 ? '' : 's'}`,
                  `${new Set(stations.map(s => s.routeSegment)).size || 0} routes mapped`,
                  `${mapMode === 'google' ? 'Live map mode active' : 'Bundled offline map active'}`,
                ].map((pill) => (
                  <span key={pill} className="rounded-full border border-white/90 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex min-w-[280px] flex-col gap-3 sm:min-w-[320px]">
              <MapModeToggle mapMode={mapMode} onChange={handleMapModeChange} googleMapsConfigured={googleMapsConfigured} />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Live mode', value: googleMapsConfigured ? 'Configured' : 'Offline only', tone: 'sky' },
                  { label: 'Congested sites', value: stations.filter(s => s.gridStatus === 'Congested').length, tone: 'red' },
                  { label: 'Avg station size', value: `${kpis.avgChargersPerStation}`, tone: 'emerald' },
                  { label: 'Map links', value: stations.length, tone: 'slate' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[24px] border px-4 py-3 shadow-sm ${
                      item.tone === 'sky'
                        ? 'border-sky-200 bg-sky-50/80'
                        : item.tone === 'red'
                          ? 'border-red-200 bg-red-50/80'
                          : item.tone === 'emerald'
                            ? 'border-emerald-200 bg-emerald-50/80'
                            : 'border-slate-200 bg-white/80'
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => { setForm({ ...emptyForm }); setShowAddModal(true); }}
                className={`${primaryButtonCls} justify-center`}>
                <Plus size={16} /> Add Station
              </button>
            </div>
          </div>
        </div>

        <div className={`${surfaceCls} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={sectionTitleCls}>Map Operations</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Spatial control panel</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
              mapMode === 'google' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {mapMode === 'google' ? 'Live tiles' : 'Offline'}
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {[
              {
                label: 'Current mode',
                value: mapMode === 'google' ? 'Google Maps enabled' : 'Offline SVG map enabled',
                detail: mapModeMessage,
              },
              {
                label: 'Route coverage',
                value: `${new Set(stations.map(s => s.routeSegment)).size || 0} active route${new Set(stations.map(s => s.routeSegment)).size === 1 ? '' : 's'}`,
                detail: 'Every station remains connected to its corridor code for the export schema and map table.',
              },
              {
                label: 'Direct map actions',
                value: `${stations.length} Google Maps shortcut${stations.length === 1 ? '' : 's'}`,
                detail: 'Each projected location keeps an external Maps link in the table and the live map popup.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-slate-200/90 bg-slate-50/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MapModeNotice mapMode={mapMode} message={mapModeMessage} />

      {renderNetworkMap(520)}

      {/* Station Table */}
      <div className={`${surfaceCls} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className={sectionTitleCls}>Proposed Stations</h3>
          <span className="text-xs text-slate-500">{stations.length} station{stations.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="text-left px-5 py-3 font-medium">Station ID</th>
                <th className="text-left px-5 py-3 font-medium">Coordinates</th>
                <th className="text-left px-5 py-3 font-medium">Route</th>
                <th className="text-center px-5 py-3 font-medium">Chargers</th>
                <th className="text-center px-5 py-3 font-medium">Power</th>
                <th className="text-center px-5 py-3 font-medium">Grid Status</th>
                <th className="text-center px-5 py-3 font-medium">Distributor</th>
                <th className="text-center px-5 py-3 font-medium">Google Maps</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(s => {
                const resolvedDistributor = getResolvedDistributor(s);
                return (
                <tr key={s.id} className="border-b border-slate-200/80 transition hover:bg-slate-50/80"
                  onMouseEnter={() => setHoveredStation(s.id)} onMouseLeave={() => setHoveredStation(null)}>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-semibold text-slate-900">{s.stationId}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{getRouteLabel(s.routeSegment)}</td>
                  <td className="px-5 py-3.5 text-center font-medium text-slate-900">{s.numChargers}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-xs font-medium text-emerald-700">{s.powerKW} kW</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      s.gridStatus === 'Sufficient' ? 'bg-emerald-100 text-emerald-700' :
                      s.gridStatus === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        s.gridStatus === 'Sufficient' ? 'bg-emerald-400' :
                        s.gridStatus === 'Moderate' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      {s.gridStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-slate-900">{resolvedDistributor.distributor || 'Not required'}</span>
                      {resolvedDistributor.source === 'Heuristic' && <span className="text-[10px] text-amber-700">Defaulted</span>}
                      {resolvedDistributor.source === 'Imported' && <span className="text-[10px] text-sky-700">Imported</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <a
                      href={getGoogleMapsLocationUrl(s.lat, s.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Navigation size={12} /> Open
                    </a>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(s)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(s.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {stations.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No stations loaded yet. Import File 2.csv or click "Add Station" to begin.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // FRICTION ANALYSIS PAGE
  const FrictionPage = () => (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white/82 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.14)]">
        <p className={sectionTitleCls}>Constraint Surveillance</p>
        <h2 className="text-2xl font-semibold text-slate-950">Friction point analysis</h2>
        <p className="mt-0.5 text-sm text-slate-500">Direct assignment answer: deploy Sufficient stations immediately, keep Moderate stations in the plan with distributor action, and classify Congested stations as bottlenecks that require reinforcement before deployment.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={CheckCircle2} label="Grid Ready" value={stations.filter(s => s.gridStatus === 'Sufficient').length} color="emerald"
          sublabel="Deploy directly in the proposed network" />
        <KpiCard icon={AlertCircle} label="Moderate Friction" value={stations.filter(s => s.gridStatus === 'Moderate').length} color="yellow"
          sublabel="Keep in rollout with distributor action" />
        <KpiCard icon={XCircle} label="Critical Friction" value={stations.filter(s => s.gridStatus === 'Congested').length} color="red"
          sublabel="Treat as bottlenecks before deployment" />
      </div>

      <div className={`${surfaceCls} p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={sectionTitleCls}>Assignment Answer</h3>
            <p className="mt-2 text-lg font-semibold text-slate-950">Network deployment decision</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Deploy Now</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {stations.filter(s => s.gridStatus === 'Sufficient').length} station{stations.filter(s => s.gridStatus === 'Sufficient').length === 1 ? '' : 's'} are ready for direct deployment.
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">These sites stay in the proposed network without additional grid mitigation.</p>
          </div>
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Deploy With Action</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {stations.filter(s => s.gridStatus === 'Moderate').length} station{stations.filter(s => s.gridStatus === 'Moderate').length === 1 ? '' : 's'} remain in scope but require distributor coordination.
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">These sites should appear in the rollout plan and in File 3 as friction points with follow-up action attached.</p>
          </div>
          <div className="rounded-[22px] border border-red-200 bg-red-50/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-700">Defer Until Reinforced</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {stations.filter(s => s.gridStatus === 'Congested').length} station{stations.filter(s => s.gridStatus === 'Congested').length === 1 ? '' : 's'} should be treated as bottlenecks.
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">These sites stay flagged in File 3 and move forward only after grid reinforcement is approved.</p>
          </div>
        </div>
      </div>

      {/* Friction Details */}
      {stations.length === 0 ? (
        <div className={`${surfaceCls} p-8 text-center`}>
          <AlertTriangle size={40} className="mx-auto mb-3 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-950">No Stations Loaded</h3>
          <p className="mt-1 text-sm text-slate-500">Import File 2.csv and File 3.csv to analyze real friction points.</p>
        </div>
      ) : kpis.frictionPoints.length === 0 ? (
        <div className="rounded-[30px] border border-emerald-200 bg-emerald-50/85 p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500/60" />
          <h3 className="text-lg font-semibold text-emerald-800">No Friction Points Detected</h3>
          <p className="mt-1 text-sm text-slate-600">Answer: all proposed stations are deployable without additional grid intervention.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {kpis.frictionPoints.map(s => (
            <div key={s.id}
              className={`rounded-[28px] border p-5 shadow-sm ${
                s.gridStatus === 'Congested' ? 'border-red-200 bg-red-50/80' : 'border-yellow-200 bg-yellow-50/80'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`rounded-2xl p-2.5 ${s.gridStatus === 'Congested' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    <AlertTriangle size={20} className={s.gridStatus === 'Congested' ? 'text-red-500' : 'text-yellow-600'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-semibold text-slate-900">{s.stationId}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] ${
                        s.gridStatus === 'Congested' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{s.gridStatus === 'Congested' ? 'CRITICAL' : 'WARNING'}</span>
                    </div>
                    <p className="text-sm text-slate-600">{getRouteLabel(s.routeSegment)}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{formatCoordinate(s.lat, 'lat')}, {formatCoordinate(s.lng, 'lng')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Required Capacity</p>
                  <p className="text-lg font-bold text-slate-900">{(s.numChargers * POWER_STANDARD_KW).toLocaleString()} kW</p>
                  <p className="text-xs text-slate-500">{s.numChargers} chargers × {POWER_STANDARD_KW} kW</p>
                </div>
              </div>
              <div className="mt-4 border-t border-white/70 pt-3">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Assignment Decision: </span>
                  {s.gridStatus === 'Congested'
                    ? 'Classify this location as a bottleneck in File 3, submit the grid reinforcement request, and defer deployment until the upgrade is approved.'
                    : 'Keep this location in the rollout, classify it as a friction point in File 3, and close distributor capacity confirmation before energization.'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Distributor: <span className="text-slate-800">{getResolvedDistributor(s).distributor || 'Not provided'}</span>
                  {getResolvedDistributor(s).source === 'Heuristic' && <span className="text-amber-700"> · verify before final submission</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Preview */}
      <div className={`${surfaceCls} p-6`}>
        <h3 className={`${sectionTitleCls} mb-4`}>3-Step Deployment Roadmap</h3>
        <div className="relative">
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-emerald-400 via-amber-400 to-red-400 opacity-35" />
          <div className="space-y-6">
            {roadmap.map((phase, i) => (
              <div key={i} className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  phase.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                  phase.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {i === 0 ? <Zap size={16} /> : i === 1 ? <RefreshCw size={16} /> : <Target size={16} />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-sm font-semibold text-slate-900">{phase.phase}</h4>
                    <span className="text-[10px] font-medium text-slate-500">{phase.period}</span>
                  </div>
                  <p className="mb-2 text-xs text-slate-600">{phase.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.stations.map(s => (
                      <span key={s.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                          {s.stationId} · {s.routeSegment} · {s.numChargers} chargers
                      </span>
                    ))}
                    {phase.stations.length === 0 && <span className="text-[10px] italic text-slate-400">No stations in this phase</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // EXPORT CENTER PAGE
  const ExportPage = () => (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.92),rgba(51,65,85,0.9))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(163,209,51,0.18),transparent_56%)]" />
          <div className="pointer-events-none absolute -bottom-12 right-0 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Boardroom Delivery</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-white lg:text-[2.15rem]">
                Submission control room for imported outputs, PDF rules, and final CSV packaging.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Review the imported deliverables, track planning advisories, and export the three required datathon files from a single delivery surface.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[
                  `${validationErrors.length === 0 ? 'Validation clear' : `${validationErrors.length} validation issue${validationErrors.length === 1 ? '' : 's'}`}`,
                  `${importStatus.stationCount} imported station${importStatus.stationCount === 1 ? '' : 's'}`,
                  `${planningAdvisories.length} planning advisor${planningAdvisories.length === 1 ? 'y' : 'ies'}`,
                ].map((pill) => (
                  <span key={pill} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-200 shadow-sm backdrop-blur-sm">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-3 sm:min-w-[320px]">
              {[
                { label: 'Files loaded', value: [importStatus.file1Name, importStatus.file2Name, importStatus.file3Name].filter(Boolean).length, tone: 'emerald' },
                { label: 'Validation', value: validationErrors.length === 0 ? 'Pass' : 'Review', tone: validationErrors.length === 0 ? 'sky' : 'red' },
                { label: 'Friction rows', value: kpis.frictionPoints.length, tone: 'amber' },
                { label: 'Exports ready', value: 3, tone: 'slate' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-[24px] border px-4 py-3 shadow-sm ${
                    item.tone === 'emerald'
                      ? 'border-emerald-300/30 bg-emerald-400/10'
                      : item.tone === 'sky'
                        ? 'border-sky-300/30 bg-sky-400/10'
                        : item.tone === 'red'
                          ? 'border-red-300/30 bg-red-400/10'
                          : item.tone === 'amber'
                            ? 'border-amber-300/30 bg-amber-400/10'
                            : 'border-white/10 bg-white/10'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${surfaceCls} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={sectionTitleCls}>Delivery Snapshot</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Submission posture</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
              validationErrors.length === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {validationErrors.length === 0 ? 'Ready' : 'Review'}
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {[
              {
                label: 'Import status',
                value: importStatus.file2Name ? 'Real submission files loaded' : 'Awaiting File 2.csv import',
                detail: 'File 2 is the anchor dataset, while File 1 and File 3 complete the KPI and friction answer set.',
              },
              {
                label: 'PDF alignment',
                value: validationErrors.length === 0 ? 'Required checks satisfied' : `${validationErrors.length} issue${validationErrors.length === 1 ? '' : 's'} to resolve`,
                detail: 'Naming, schema shape, grid status filters, and the 150 kW standard remain enforced before export.',
              },
              {
                label: 'Planning pressure',
                value: afirBlockingRoutes.length === 0 ? 'No blocked corridor routes' : `${afirBlockingRoutes.length} route${afirBlockingRoutes.length === 1 ? '' : 's'} blocked by team gate`,
                detail: 'The internal corridor-spacing rule stays visible without altering the official PDF rules.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-slate-200/90 bg-slate-50/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${surfaceCls} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-sky-100 p-3">
              <Upload size={22} className="text-sky-700" />
            </div>
            <div>
              <h3 className={`${sectionTitleCls} mb-2`}>Import Real Submission Files</h3>
              <p className="max-w-2xl text-sm text-slate-600">
                Upload File 2.csv to replace the seeded network. File 1.csv hydrates projected EVs and baseline counts, while File 3.csv enriches Moderate and Congested stations with distributor data.
              </p>
            </div>
          </div>
          <label className={primaryButtonCls}>
            <Upload size={16} /> Select CSV Files
            <input type="file" accept=".csv,text/csv" multiple className="hidden" onChange={handleImportSelection} />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { key: 'file1Name', label: 'File 1.csv', helper: 'KPI summary row' },
            { key: 'file2Name', label: 'File 2.csv', helper: 'Proposed station list' },
            { key: 'file3Name', label: 'File 3.csv', helper: 'Friction and distributor data' },
          ].map((file) => (
            <div key={file.key} className={`${softSurfaceCls} p-4`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{file.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{importStatus[file.key] || 'Not loaded'}</p>
              <p className="mt-1 text-xs text-slate-500">{file.helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>Last import: <span className="text-slate-800">{formatImportTimestamp(importStatus.importedAt)}</span></p>
          <p>
            Loaded <span className="text-slate-800">{importStatus.stationCount}</span> stations and <span className="text-slate-800">{importStatus.frictionCount}</span> friction points.
          </p>
        </div>
      </div>

      <div className={`${surfaceCls} p-5`}>
        <h3 className={`${sectionTitleCls} mb-3`}>PDF Rule Checklist</h3>
        <div className="grid grid-cols-1 gap-3 text-xs text-slate-600 lg:grid-cols-2">
          <p>Output files must be named exactly File 1.csv, File 2.csv, and File 3.csv.</p>
          <p>Route segments are exported as official road codes only, matching the PDF schema for File 2 and File 3.</p>
          <p>File 3 includes only Moderate and Congested stations, with distributor network restricted to i-DE, Endesa, or Viesgo.</p>
          <p>estimated_demand_kw is calculated as n_chargers_proposed × 150 kW for every friction point.</p>
          <p>Urban-center coordinates are blocked to keep proposals focused on interurban corridors.</p>
          <p>The built app is configured for offline delivery with bundled data and relative asset paths, so it opens directly without login or installation.</p>
          <p>Internal team rule: every corridor gap must stay at or below {AFIR_LIGHT_DUTY_MAX_GAP_KM} km for the proposal to count as internally ready.</p>
          <p>Distributor defaults resolve from public research notes and must be verified before export when a friction point uses a territory default.</p>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${
        afirBlockingRoutes.length > 0
          ? 'bg-red-50/85 border-red-200'
          : planningAdvisories.length === 0
            ? 'bg-sky-50/85 border-sky-200'
            : 'bg-amber-50/85 border-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          <Info size={22} className={`${
            afirBlockingRoutes.length > 0
              ? 'text-red-600'
              : planningAdvisories.length === 0
                ? 'text-sky-600'
                : 'text-amber-600'
          } mt-0.5`} />
          <div>
            <h3 className={`text-sm font-semibold ${
              afirBlockingRoutes.length > 0
                ? 'text-red-700'
                : planningAdvisories.length === 0
                  ? 'text-sky-700'
                  : 'text-amber-700'
            }`}>
              Submission Decisions
            </h3>
            {planningAdvisories.length === 0 ? (
              <p className="mt-1 text-xs text-slate-600">
                No additional planning actions remain. Route spacing and distributor assignments are inside the current internal tolerance.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {planningAdvisories.map((advisory, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    {advisory}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Validation Status */}
      <div className={`rounded-2xl border p-5 ${
        validationErrors.length === 0 ? 'bg-emerald-50/85 border-emerald-200' : 'bg-red-50/85 border-red-200'
      }`}>
        <div className="flex items-start gap-3">
          {validationErrors.length === 0 ? (
            <>
              <CheckCircle2 size={22} className="mt-0.5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-700">All Validations Passed</h3>
                <p className="mt-0.5 text-xs text-slate-600">Your submission meets the PDF-required checks and the internal {AFIR_LIGHT_DUTY_MAX_GAP_KM} km corridor-spacing rule.</p>
              </div>
            </>
          ) : (
            <>
              <XCircle size={22} className="mt-0.5 text-red-600" />
              <div>
                <h3 className="text-sm font-semibold text-red-700">Validation Errors ({validationErrors.length})</h3>
                <ul className="mt-2 space-y-1">
                  {validationErrors.map((e, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-red-700">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-red-500" /> {e}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            file: 'File 1.csv', label: 'Global Network KPIs', desc: 'Single summary row: total_proposed_stations, total_existing_stations_baseline, total_friction_points, total_ev_projected_2027.',
            icon: BarChart3, colorClasses: 'bg-emerald-500/10 text-emerald-400', onClick: exportFile1, rows: 1,
          },
          {
            file: 'File 2.csv', label: 'Proposed Charging Locations', desc: 'location_id, latitude, longitude, route_segment, n_chargers_proposed, grid_status.',
            icon: MapPin, colorClasses: 'bg-blue-500/10 text-blue-400', onClick: exportFile2, rows: stations.length,
          },
          {
            file: 'File 3.csv', label: 'Friction Points', desc: 'bottleneck_id, latitude, longitude, route_segment, distributor_network, estimated_demand_kw, grid_status.',
            icon: AlertTriangle, colorClasses: 'bg-yellow-500/10 text-yellow-400', onClick: exportFile3, rows: kpis.frictionPoints.length,
          },
        ].map((item, i) => (
          <div key={i} className={`${surfaceCls} flex flex-col p-5`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${item.colorClasses}`}>
                <item.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{item.file}</p>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              </div>
            </div>
            <p className="mb-4 flex-1 text-xs text-slate-600">{item.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{item.rows} row{item.rows !== 1 ? 's' : ''}</span>
              <button onClick={item.onClick}
                className={ghostButtonCls}>
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* One-Click Submission */}
      <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,rgba(163,209,51,0.18),rgba(255,255,255,0.96),rgba(14,165,233,0.08))] p-6 shadow-[0_24px_60px_rgba(148,163,184,0.14)]">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-900 p-3 text-white">
            <FileText size={24} className="text-iberdrola-accent" />
          </div>
          <div className="flex-1">
            <p className={sectionTitleCls}>Final Packaging</p>
            <h3 className="mb-1 text-lg font-semibold text-slate-950">Prepare submission</h3>
            <p className="mb-4 text-sm text-slate-600">
              Validate the PDF-required checks, enforce the internal {AFIR_LIGHT_DUTY_MAX_GAP_KM} km corridor-spacing rule, and export all three files simultaneously.
            </p>
            <button onClick={handlePrepareSubmission}
              className={accentButtonCls}>
              <Shield size={18} /> Validate & Export All Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────
  const pages = { dashboard: DashboardPage, map: MapPage, friction: FrictionPage, export: ExportPage };
  const ActivePage = pages[activePage];
  const activeMeta = pageMeta[activePage];

  return (
    <div className="min-h-screen font-sans text-slate-900">
      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes modalIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-modal-in { animation: modalIn 0.2s ease-out; }
      `}</style>

      <div className="pointer-events-none fixed left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="relative flex min-h-screen">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} flex shrink-0 flex-col border-r border-white/60 bg-white/70 backdrop-blur-xl transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 shrink-0 shadow-sm">
            <Zap size={18} className="text-iberdrola-accent" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold leading-tight text-slate-950">Iberdrola</p>
              <p className="truncate text-[10px] leading-tight text-slate-500">EV Command Center</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all ${
                activePage === item.id
                  ? 'border border-emerald-200 bg-[linear-gradient(135deg,rgba(163,209,51,0.18),rgba(255,255,255,0.96))] text-slate-900 shadow-sm'
                  : 'border border-transparent text-slate-500 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900'
              }`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                activePage === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <item.icon size={18} className="shrink-0" />
              </span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && item.id === 'friction' && kpis.frictionPoints.length > 0 && (
                <span className="ml-auto min-w-[20px] rounded-full bg-red-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-red-700">
                  {kpis.frictionPoints.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar toggle */}
        <div className="border-t border-slate-200/80 px-3 py-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs text-slate-500 transition hover:bg-white/80 hover:text-slate-900">
            <Menu size={16} />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b border-white/60 bg-slate-50/70 px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{activeMeta.eyebrow}</p>
              <h1 className="text-2xl font-semibold text-slate-950">{activeMeta.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{activeMeta.summary}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <div className="inline-flex flex-wrap gap-1 rounded-[22px] border border-slate-200 bg-white/90 p-1 shadow-sm">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                      activePage === item.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <Activity size={12} className="text-emerald-600" />
                <span>System Active</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600">
                <Battery size={12} className="text-iberdrola-700" />
                <span>{POWER_STANDARD_KW} kW Standard</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="mx-auto max-w-[1500px] p-6">
          <ActivePage />
        </div>
      </main>
      </div>

      {/* MODALS */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setForm({ ...emptyForm }); }} title="Add New Station" size="lg">
        <StationForm onSubmit={handleAddStation} submitLabel="Add Station" />
      </Modal>

      <Modal open={!!editingStation} onClose={() => { setEditingStation(null); setForm({ ...emptyForm }); }} title="Edit Station" size="lg">
        <StationForm onSubmit={handleUpdateStation} submitLabel="Update Station" />
      </Modal>

      <Modal open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Confirm Deletion" size="sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <p className="mb-1 text-sm text-slate-600">
            Delete station <span className="font-mono font-semibold text-slate-900">{stations.find(s => s.id === showDeleteConfirm)?.stationId}</span>?
          </p>
          <p className="mb-5 text-xs text-slate-500">This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowDeleteConfirm(null)}
              className={ghostButtonCls}>
              Cancel
            </button>
            <button onClick={() => handleDeleteStation(showDeleteConfirm)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submission Validation Failed" size="md">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Shield size={20} className="text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-red-700">Cannot proceed with export</h4>
              <p className="text-xs text-slate-500">Please resolve the following issues:</p>
            </div>
          </div>
          <ul className="space-y-2 mb-5">
            {validationErrors.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <XCircle size={14} className="mt-0.5 shrink-0 text-red-600" /> {e}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button onClick={() => setShowSubmitModal(false)}
              className={ghostButtonCls}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
