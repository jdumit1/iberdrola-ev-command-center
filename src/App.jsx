import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleMap as GoogleMapCanvas, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import Papa from 'papaparse';
import {
  LayoutDashboard, Map, AlertTriangle, Download, Plus, Trash2, Edit3, Check, X,
  Zap, MapPin, Activity, TrendingUp, ChevronRight, Settings, FileText, Shield,
  Battery, Navigation, BarChart3, Bell, Search, Menu, ChevronDown, Eye, RefreshCw,
  Info, CheckCircle2, XCircle, AlertCircle, Cpu, Globe, Layers, Target, Gauge, Upload
} from 'lucide-react';

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
    summary: 'Iberdrola references i-DE distribution activity in 10 autonomous communities; corridor defaults remain heuristic and should be manually reviewed near borders.',
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
    reason: 'Fallback assignment. Confirm manually with distributor coverage maps for this exact municipality.',
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
      source: 'Optional',
      confidence: 'optional',
      reason: 'Distributor data is only mandatory for Moderate and Congested friction points.',
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

// ─── TOAST SYSTEM ────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
    {toasts.map(t => (
      <div key={t.id}
        className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl animate-slide-in
          ${t.type === 'success' ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-100' :
            t.type === 'error' ? 'bg-red-950/90 border-red-700/50 text-red-100' :
            t.type === 'warning' ? 'bg-amber-950/90 border-amber-700/50 text-amber-100' :
            'bg-gray-900/90 border-gray-700/50 text-gray-100'}`}
      >
        {t.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" /> :
         t.type === 'error' ? <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" /> :
         t.type === 'warning' ? <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" /> :
         <Info size={18} className="text-blue-400 mt-0.5 shrink-0" />}
        <p className="text-sm font-medium flex-1">{t.message}</p>
        <button onClick={() => onDismiss(t.id)} className="text-white/40 hover:text-white/80 transition">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
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

// ─── MODAL COMPONENT ─────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative ${sizes[size]} w-full bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl animate-modal-in`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ─── KPI CARD ────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sublabel, color = 'emerald', trend }) => {
  const colorMap = {
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    yellow: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorMap[color]} backdrop-blur-xl p-5 transition-all duration-300 hover:scale-[1.02] group`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-white/5 group-hover:bg-white/10 transition`}>
          <Icon size={22} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3 text-xs">
          <TrendingUp size={12} />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

// ─── SPAIN MAP (SVG) ─────────────────────────────────────────────────────
const SpainMap = ({ stations, hoveredStation, setHoveredStation, minHeight = 350 }) => {
  const stationsByRegion = useMemo(() => {
    const map = {};
    stations.forEach(s => {
      const region = SPAIN_REGIONS.find(r => {
        const dx = s.mapX - r.cx;
        const dy = s.mapY - r.cy;
        return Math.sqrt(dx * dx + dy * dy) < r.r + 15;
      });
      if (region) {
        if (!map[region.id]) map[region.id] = [];
        map[region.id].push(s);
      }
    });
    return map;
  }, [stations]);

  const getRegionColor = (regionId) => {
    const regionStations = stationsByRegion[regionId] || [];
    if (regionStations.length === 0) return { fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.08)' };
    const hasCongested = regionStations.some(s => s.gridStatus === 'Congested');
    const hasModerate = regionStations.some(s => s.gridStatus === 'Moderate');
    if (hasCongested) return { fill: 'rgba(239,68,68,0.15)', stroke: 'rgba(239,68,68,0.4)' };
    if (hasModerate) return { fill: 'rgba(234,179,8,0.15)', stroke: 'rgba(234,179,8,0.4)' };
    return { fill: 'rgba(16,185,129,0.15)', stroke: 'rgba(16,185,129,0.4)' };
  };

  return (
    <div className="relative w-full bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sufficient
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Moderate
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Congested
        </span>
      </div>
      <svg viewBox="0 0 480 400" className="w-full h-auto" style={{ minHeight }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="stationGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A3D133" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#A3D133" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Simplified Spain outline */}
        <path
          d="M60,55 L110,40 L170,45 L230,50 L280,48 L340,55 L390,70 L410,95 L420,140 L430,190 L420,205 L380,240 L350,265 L330,290 L300,310 L260,340 L220,355 L180,350 L140,325 L110,300 L85,265 L65,230 L55,190 L50,150 L45,110 Z"
          fill="rgba(0,86,63,0.08)" stroke="rgba(0,86,63,0.3)" strokeWidth="1.5"
        />

        {/* Region circles */}
        {SPAIN_REGIONS.map(r => {
          const colors = getRegionColor(r.id);
          return (
            <g key={r.id}>
              <circle cx={r.cx} cy={r.cy} r={r.r} fill={colors.fill} stroke={colors.stroke} strokeWidth="1" opacity="0.7" />
              <text x={r.cx} y={r.cy + 1} textAnchor="middle" dominantBaseline="middle"
                className="text-[7px] fill-gray-500 font-medium pointer-events-none select-none">
                {r.id}
              </text>
            </g>
          );
        })}

        {/* Station markers */}
        {stations.map(s => {
          const isHovered = hoveredStation === s.id;
          const color = getGridColorHex(s.gridStatus);
          return (
            <g key={s.id}
              onMouseEnter={() => setHoveredStation(s.id)}
              onMouseLeave={() => setHoveredStation(null)}
              className="cursor-pointer"
            >
              {isHovered && <circle cx={s.mapX} cy={s.mapY} r="14" fill={color} opacity="0.15" />}
              <circle cx={s.mapX} cy={s.mapY} r={isHovered ? 7 : 5}
                fill={color} stroke="white" strokeWidth={isHovered ? 2 : 1} opacity={isHovered ? 1 : 0.85}
                filter={isHovered ? 'url(#glow)' : undefined}
                style={{ transition: 'all 0.2s ease' }}
              />
              {isHovered && (
                <g>
                  <rect x={s.mapX + 12} y={s.mapY - 38} width="140" height="64" rx="6"
                    fill="rgba(17,24,39,0.95)" stroke={color} strokeWidth="1" />
                  <text x={s.mapX + 18} y={s.mapY - 22} className="text-[9px] fill-white font-semibold">
                    {s.stationId || `ST-${s.id.slice(0,4).toUpperCase()}`}
                  </text>
                  <text x={s.mapX + 18} y={s.mapY - 10} className="text-[8px] fill-gray-400">
                    {getRouteLabel(s.routeSegment).slice(0, 25) || 'No route assigned'}
                  </text>
                  <text x={s.mapX + 18} y={s.mapY + 2} className="text-[8px] fill-gray-400">
                    {s.numChargers} chargers · {s.numChargers * POWER_STANDARD_KW} kW
                  </text>
                  <text x={s.mapX + 18} y={s.mapY + 13} className="text-[8px] fill-gray-400">
                    Grid: {s.gridStatus}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {stations.length === 0 && (
          <text x="240" y="200" textAnchor="middle" className="text-[12px] fill-gray-600 font-medium">
            Import File 2.csv or add stations to see them on the map
          </text>
        )}
      </svg>
    </div>
  );
};

const MapModeToggle = ({ mapMode, onChange, googleMapsConfigured }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-xl border border-gray-800/60 bg-gray-900/70 p-1">
      <button
        onClick={() => onChange('offline')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
          mapMode === 'offline' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        Offline Map
      </button>
      <button
        onClick={() => onChange('google')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
          mapMode === 'google' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        Google Maps
      </button>
    </div>
    {!googleMapsConfigured && (
      <span className="rounded-full border border-amber-800/40 bg-amber-950/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-300">
        API key required
      </span>
    )}
  </div>
);

const MapModeNotice = ({ mapMode, message }) => (
  <div className={`rounded-xl border px-3.5 py-2.5 text-xs ${
    mapMode === 'google'
      ? 'border-amber-800/30 bg-amber-950/20 text-amber-200'
      : 'border-blue-800/30 bg-blue-950/20 text-blue-200'
  }`}>
    {message}
  </div>
);

const GoogleStationMap = ({ stations, hoveredStation, setHoveredStation, height = 520, onLoadFailure }) => {
  const mapRef = useRef(null);
  const failureReportedRef = useRef(false);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'iberdrola-google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const fitMapToStations = useCallback((mapInstance) => {
    if (!window.google?.maps || !mapInstance) return;
    if (stations.length === 0) {
      mapInstance.setCenter(DEFAULT_MAP_CENTER);
      mapInstance.setZoom(5.8);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    stations.forEach(({ lat, lng }) => bounds.extend({ lat, lng }));
    mapInstance.fitBounds(bounds, 120);

    if (stations.length === 1) {
      mapInstance.setZoom(7.5);
    }
  }, [stations]);

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

  const activeStation = stations.find(station => station.id === hoveredStation) ?? null;

  if (loadError) {
    return null;
  }

  if (!isLoaded) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50"
        style={{ minHeight: height }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(163,209,51,0.08),transparent_55%)]" />
        <div className="relative flex h-full min-h-[inherit] items-center justify-center px-6 text-center">
          <div>
            <p className="text-sm font-semibold text-white">Loading Google Maps</p>
            <p className="mt-1 text-xs text-gray-400">Fetching live map tiles and rendering station markers.</p>
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
    <div className="relative w-full overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50">
      <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-gray-800/70 bg-gray-950/85 px-3 py-2 shadow-xl">
        {GRID_STATUS_OPTIONS.map(option => (
          <span key={option.value} className="flex items-center gap-1.5 text-xs text-gray-300">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getGridColorHex(option.value) }} />
            {option.label}
          </span>
        ))}
      </div>
      <div className="absolute right-4 top-4 z-10 rounded-xl border border-amber-800/40 bg-amber-950/70 px-3 py-2 text-[11px] font-medium text-amber-200 shadow-xl">
        Google Maps requires internet access at runtime
      </div>
      {stations.length === 0 && (
        <div className="absolute inset-x-4 bottom-4 z-10 rounded-xl border border-gray-800/70 bg-gray-950/85 px-4 py-3 text-center text-xs text-gray-300 shadow-xl">
          Import File 2.csv or add stations manually to populate the live map.
        </div>
      )}
      <GoogleMapCanvas
        mapContainerStyle={{ width: '100%', height: `${height}px` }}
        center={DEFAULT_MAP_CENTER}
        zoom={5.8}
        options={GOOGLE_MAP_OPTIONS}
        onClick={() => setHoveredStation(null)}
        onLoad={handleMapLoad}
        onUnmount={() => { mapRef.current = null; }}
      >
        {stations.map(station => {
          const isActive = hoveredStation === station.id;
          return (
            <MarkerF
              key={station.id}
              position={{ lat: station.lat, lng: station.lng }}
              onClick={() => setHoveredStation(station.id)}
              onMouseOver={() => setHoveredStation(station.id)}
              onMouseOut={() => setHoveredStation(current => (current === station.id ? null : current))}
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
            <div className="min-w-[220px] pr-1 text-gray-900">
              <p className="text-sm font-semibold">{activeStation.stationId}</p>
              <p className="mt-1 text-xs text-gray-600">{getRouteLabel(activeStation.routeSegment)}</p>
              <div className="mt-3 space-y-1 text-xs text-gray-700">
                <p>{activeStation.numChargers} chargers</p>
                <p>{activeStation.numChargers * POWER_STANDARD_KW} kW required capacity</p>
                <p>Grid status: {activeStation.gridStatus}</p>
                <p>
                  {formatCoordinate(activeStation.lat, 'lat')} / {formatCoordinate(activeStation.lng, 'lng')}
                </p>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMapCanvas>
    </div>
  );
};

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
      ? 'Google Maps is active for live spatial review. Keep the offline map available for direct delivery and judging.'
      : 'Google Maps is optional. Add VITE_GOOGLE_MAPS_API_KEY to enable it; the bundled offline map remains the safe default.'
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
        advisories.push(`${route.code}: largest straight-line gap is ${route.largestGap.gapKm.toFixed(1)} km. The app's optional team spacing gate blocks export until it is reduced to ${AFIR_LIGHT_DUTY_MAX_GAP_KM} km or less.`);
      });

    if (heuristicDistributorCount > 0) {
      advisories.push(`${heuristicDistributorCount} friction point${heuristicDistributorCount === 1 ? ' is' : 's are'} using research-based distributor defaults. Confirm them before final submission.`);
    }

    return advisories;
  }, [heuristicDistributorCount, routeCoverageRows]);

  // ─── HANDLERS ────────────────────────────────────────────────────────
  const handleMapModeChange = useCallback((nextMode) => {
    if (nextMode === 'google' && !googleMapsConfigured) {
      addToast('Add VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.', 'warning');
      setMapModeMessage('Google Maps is unavailable until VITE_GOOGLE_MAPS_API_KEY is configured. The offline map is still fully bundled.');
      return;
    }

    setMapMode(nextMode);
    setMapModeMessage(
      nextMode === 'google'
        ? 'Google Maps uses live tiles and requires internet access at runtime. Use the offline map for portable submission builds.'
        : 'Offline mode uses the bundled SVG map, so the interface still opens directly without external services.'
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
        />
      )
      : <SpainMap stations={stations} hoveredStation={hoveredStation} setHoveredStation={setHoveredStation} minHeight={height} />
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
        warnings.push('File 1.csv was not provided, so projected EVs and baseline values were left unchanged.');
      }

      if (!slotFiles.file3 && importedStations.some((station) => station.gridStatus !== 'Sufficient')) {
        warnings.push('File 3.csv was not provided. Friction points may need distributor data before exporting again.');
      }

      const heuristicAssignments = importedStations.filter((station) => station.distributorSource === 'Heuristic' && station.gridStatus !== 'Sufficient').length;
      if (heuristicAssignments > 0) {
        warnings.push(`${heuristicAssignments} friction point${heuristicAssignments === 1 ? ' is' : 's are'} using research-based distributor defaults. Review them before final export.`);
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
    { id: 'map', label: 'Network Map', icon: Map },
    { id: 'friction', label: 'Friction Analysis', icon: AlertTriangle },
    { id: 'export', label: 'Export Center', icon: Download },
  ];

  // ─── FORM INPUT COMPONENT ────────────────────────────────────────────
  const FormField = ({ label, children, className = '' }) => (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-iberdrola-500 focus:ring-1 focus:ring-iberdrola-500/30 transition";
  const selectCls = "w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-iberdrola-500 focus:ring-1 focus:ring-iberdrola-500/30 transition appearance-none";

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
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            {form.gridStatus === 'Sufficient'
              ? 'Optional for grid-ready stations. Moderate and Congested sites will use this value or the territory heuristic.'
              : distributorSuggestion.distributor
                ? `Suggested default: ${distributorSuggestion.distributor} (${distributorSuggestion.confidence} confidence). ${distributorSuggestion.reason}`
                : distributorSuggestion.reason}
          </p>
        </FormField>
        <FormField label="Power per Charger">
          <div className="flex items-center gap-2">
            <input className={`${inputCls} bg-gray-800/40`} value={`${POWER_STANDARD_KW} kW`} disabled />
            <div className="flex items-center gap-1 text-emerald-400 text-xs whitespace-nowrap">
              <Shield size={12} /> Compliant
            </div>
          </div>
        </FormField>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => { setShowAddModal(false); setEditingStation(null); setForm({ ...emptyForm }); }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition">
          Cancel
        </button>
        <button onClick={onSubmit}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-iberdrola-700 hover:bg-iberdrola-600 text-white transition flex items-center gap-2">
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
      {/* Project Setup */}
      {!setupDone && (
        <div className="bg-gradient-to-r from-iberdrola-900/40 to-gray-900/60 border border-iberdrola-700/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-iberdrola-700/30">
              <Settings size={24} className="text-iberdrola-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Project Setup</h3>
              <p className="text-sm text-gray-400 mb-4">Configure baseline parameters for the 2027 EV infrastructure plan.</p>
              <p className="text-xs text-gray-500 mb-4">Upload File 1.csv in the Import & Export Center to populate these automatically from your real submission output.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold bg-iberdrola-accent text-iberdrola-900 hover:bg-iberdrola-accent-light transition flex items-center gap-2">
                <Check size={16} /> Confirm Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={MapPin} label="Total Stations" value={kpis.totalStations} color="emerald"
          sublabel={`${kpis.avgChargersPerStation} avg chargers/station`} />
        <KpiCard icon={Zap} label="Total Capacity" value={`${(kpis.totalCapacity / 1000).toFixed(1)} MW`} color="blue"
          sublabel={`${kpis.totalChargers} chargers @ ${POWER_STANDARD_KW} kW`} />
        <KpiCard icon={AlertTriangle} label="Friction Points" value={kpis.frictionPoints.length} color={kpis.frictionPoints.length > 0 ? 'red' : 'emerald'}
          sublabel={kpis.frictionPoints.length > 0 ? `${kpis.frictionPoints.filter(f => f.gridStatus === 'Congested').length} critical` : 'All stations clear'} />
        <KpiCard icon={Target} label="Projected EVs 2027" value={totalEVs2027.toLocaleString()} color="violet"
          sublabel={`Baseline: ${existingBaseline.toLocaleString()} chargers`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Corridor Spacing Check (Team Assumption)</h3>
              <p className="mt-1 text-xs text-gray-500">This optional planning gate uses a {AFIR_LIGHT_DUTY_MAX_GAP_KM} km spacing reference from EU guidance. It is a team quality rule, not a PDF disqualification rule.</p>
            </div>
            <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-blue-300">EU Reference Ratios</p>
              <p className="text-xs text-gray-300">{AFIR_PUBLIC_POWER_PER_BEV_KW} kW per BEV / {AFIR_PUBLIC_POWER_PER_PHEV_KW} kW per PHEV</p>
            </div>
          </div>
          <div className="space-y-3">
            {routeCoverageRows.length === 0 ? (
              <p className="text-sm text-gray-500">Import File 2.csv or add stations to start evaluating route spacing.</p>
            ) : routeCoverageRows.slice(0, 6).map((route) => (
              <div key={route.code} className="rounded-xl border border-gray-800/50 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{route.code}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        route.status === 'aligned'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : route.status === 'blocked'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-700/40 text-gray-300'
                      }`}>
                        {route.status === 'aligned' ? 'Aligned' : route.status === 'blocked' ? 'Blocked' : 'Need More Stops'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{route.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Largest Gap</p>
                    <p className="text-sm font-semibold text-white">
                      {route.stationCount < 2 ? 'N/A' : `${route.largestGap.gapKm.toFixed(1)} km`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                  <span>{route.stationCount} station{route.stationCount === 1 ? '' : 's'}</span>
                  {route.distributors.length > 0 && <span>Distributors: {route.distributors.join(', ')}</span>}
                  {route.heuristicAssignments > 0 && <span className="text-amber-300">{route.heuristicAssignments} heuristic default{route.heuristicAssignments === 1 ? '' : 's'}</span>}
                </div>
                {route.largestGap.from && route.largestGap.to && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    Largest interval: {route.largestGap.from.stationId} to {route.largestGap.to.stationId}. The extra {AFIR_TEN_T_EXIT_ALLOWANCE_KM} km exit allowance is included in this internal spacing check.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Distributor Territory Defaults</h3>
          <div className="space-y-3 mb-4">
            {DISTRIBUTOR_RESEARCH_NOTES.map((note) => (
              <div key={note.distributor} className={`rounded-xl border p-4 ${
                note.tone === 'official' ? 'border-emerald-800/30 bg-emerald-950/10' : 'border-amber-800/30 bg-amber-950/10'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{note.distributor}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    note.tone === 'official' ? 'text-emerald-300' : 'text-amber-300'
                  }`}>
                    {note.tone === 'official' ? 'Public source' : 'Heuristic fallback'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-gray-400">{note.summary}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DISTRIBUTOR_NETWORK_OPTIONS.map((distributor) => {
              const count = distributorSummary.find((entry) => entry.distributor === distributor)?.count ?? 0;
              return (
                <div key={distributor} className="rounded-xl border border-gray-800/60 bg-black/10 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">{distributor}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{count}</p>
                  <p className="text-[11px] text-gray-500">stations currently mapped</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            Distributor defaults are advisory. Border provinces and areas served by other Spanish DSOs should still be reviewed manually before final delivery.
          </p>
        </div>
      </div>

      {/* Quick Map & Report */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Network Overview</h3>
              <p className="mt-1 text-xs text-gray-500">Switch between the bundled submission map and Google Maps without losing station metadata.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <MapModeToggle mapMode={mapMode} onChange={handleMapModeChange} googleMapsConfigured={googleMapsConfigured} />
              <button onClick={() => setActivePage('map')} className="text-xs text-iberdrola-accent hover:text-iberdrola-accent-light transition flex items-center gap-1">
                Full Map <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <MapModeNotice mapMode={mapMode} message={mapModeMessage} />
          <div className="mt-3">{renderNetworkMap(360)}</div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Deployment Roadmap</h3>
          <div className="space-y-3">
            {roadmap.map((phase, i) => (
              <div key={i} className={`rounded-2xl border p-4 ${
                phase.status === 'ready' ? 'bg-emerald-950/20 border-emerald-800/30' :
                phase.status === 'pending' ? 'bg-amber-950/20 border-amber-800/30' :
                'bg-red-950/20 border-red-800/30'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{phase.phase}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    phase.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                    phase.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{phase.period}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{phase.description}</p>
                <div className="flex flex-wrap gap-1">
                  {phase.stations.map(s => (
                    <span key={s.id} className="text-[10px] bg-white/5 rounded-md px-1.5 py-0.5 text-gray-300 font-mono">
                      {s.stationId} · {s.routeSegment}
                    </span>
                  ))}
                  {phase.stations.length === 0 && <span className="text-[10px] text-gray-600 italic">No stations</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Compliance Overview</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke={kpis.complianceRate === 100 ? '#10b981' : '#eab308'}
                  strokeWidth="3" strokeDasharray={`${kpis.complianceRate}, 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{kpis.complianceRate}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-white font-medium">{POWER_STANDARD_KW} kW Standard</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {kpis.complianceRate === 100
                  ? 'All stations meet the mandatory power requirement'
                  : `${stations.filter(s => s.powerKW < POWER_STANDARD_KW).length} station(s) below standard`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-800/50">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{stations.filter(s => s.gridStatus === 'Sufficient').length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Sufficient</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-400">{stations.filter(s => s.gridStatus === 'Moderate').length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Moderate</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-400">{stations.filter(s => s.gridStatus === 'Congested').length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Congested</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Infrastructure Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Total Energy Capacity', value: `${(kpis.totalCapacity / 1000).toFixed(1)} MW`, icon: Zap },
              { label: 'EVs per Charger Ratio', value: kpis.totalChargers > 0 ? `${Math.round(totalEVs2027 / kpis.totalChargers)}:1` : 'N/A', icon: Gauge },
              { label: 'Network Coverage', value: `${new Set(stations.map(s => s.routeSegment)).size} routes`, icon: Globe },
              { label: 'Avg Station Size', value: `${kpis.avgChargersPerStation} chargers`, icon: Layers },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/30 last:border-0">
                <div className="flex items-center gap-2.5">
                  <item.icon size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-300">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-white tabular-nums">{item.value}</span>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Network Map</h2>
          <p className="text-sm text-gray-400 mt-0.5">Interactive geospatial view of all charging stations across Spain</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <MapModeToggle mapMode={mapMode} onChange={handleMapModeChange} googleMapsConfigured={googleMapsConfigured} />
          <button onClick={() => { setForm({ ...emptyForm }); setShowAddModal(true); }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-iberdrola-700 hover:bg-iberdrola-600 text-white transition flex items-center gap-2">
            <Plus size={16} /> Add Station
          </button>
        </div>
      </div>

      <MapModeNotice mapMode={mapMode} message={mapModeMessage} />

      {renderNetworkMap(520)}

      {/* Station Table */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Proposed Stations</h3>
          <span className="text-xs text-gray-500">{stations.length} station{stations.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                <th className="text-left px-5 py-3 font-medium">Station ID</th>
                <th className="text-left px-5 py-3 font-medium">Coordinates</th>
                <th className="text-left px-5 py-3 font-medium">Route</th>
                <th className="text-center px-5 py-3 font-medium">Chargers</th>
                <th className="text-center px-5 py-3 font-medium">Power</th>
                <th className="text-center px-5 py-3 font-medium">Grid Status</th>
                <th className="text-center px-5 py-3 font-medium">Distributor</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(s => {
                const resolvedDistributor = getResolvedDistributor(s);
                return (
                <tr key={s.id} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition"
                  onMouseEnter={() => setHoveredStation(s.id)} onMouseLeave={() => setHoveredStation(null)}>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-semibold text-white">{s.stationId}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-300 text-xs">{getRouteLabel(s.routeSegment)}</td>
                  <td className="px-5 py-3.5 text-center text-white font-medium">{s.numChargers}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-xs font-medium text-emerald-400">{s.powerKW} kW</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      s.gridStatus === 'Sufficient' ? 'bg-emerald-500/15 text-emerald-400' :
                      s.gridStatus === 'Moderate' ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-red-500/15 text-red-400'
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
                      <span className="text-xs font-medium text-white">{resolvedDistributor.distributor || 'Optional'}</span>
                      {resolvedDistributor.source === 'Heuristic' && <span className="text-[10px] text-amber-300">Heuristic</span>}
                      {resolvedDistributor.source === 'Imported' && <span className="text-[10px] text-blue-300">Imported</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(s.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {stations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-600">
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
      <div>
        <h2 className="text-xl font-bold text-white">Friction Point Analysis</h2>
        <p className="text-sm text-gray-400 mt-0.5">Automated detection of grid capacity constraints across proposed network</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={CheckCircle2} label="Grid Ready" value={stations.filter(s => s.gridStatus === 'Sufficient').length} color="emerald"
          sublabel="Ready for immediate deployment" />
        <KpiCard icon={AlertCircle} label="Moderate Friction" value={stations.filter(s => s.gridStatus === 'Moderate').length} color="yellow"
          sublabel="Requires grid assessment" />
        <KpiCard icon={XCircle} label="Critical Friction" value={stations.filter(s => s.gridStatus === 'Congested').length} color="red"
          sublabel="Major upgrade required" />
      </div>

      {/* Friction Details */}
      {stations.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8 text-center">
          <AlertTriangle size={40} className="mx-auto mb-3 text-gray-600" />
          <h3 className="text-lg font-semibold text-white">No Stations Loaded</h3>
          <p className="text-sm text-gray-400 mt-1">Import File 2.csv and File 3.csv to analyze real friction points.</p>
        </div>
      ) : kpis.frictionPoints.length === 0 ? (
        <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-2xl p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500/50" />
          <h3 className="text-lg font-semibold text-emerald-300">No Friction Points Detected</h3>
          <p className="text-sm text-gray-400 mt-1">All stations have sufficient grid capacity for deployment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {kpis.frictionPoints.map(s => (
            <div key={s.id}
              className={`rounded-2xl border p-5 ${
                s.gridStatus === 'Congested' ? 'bg-red-950/15 border-red-800/30' : 'bg-yellow-950/15 border-yellow-800/30'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${s.gridStatus === 'Congested' ? 'bg-red-500/15' : 'bg-yellow-500/15'}`}>
                    <AlertTriangle size={20} className={s.gridStatus === 'Congested' ? 'text-red-400' : 'text-yellow-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-semibold text-white">{s.stationId}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        s.gridStatus === 'Congested' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{s.gridStatus === 'Congested' ? 'CRITICAL' : 'WARNING'}</span>
                    </div>
                    <p className="text-sm text-gray-400">{getRouteLabel(s.routeSegment)}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{formatCoordinate(s.lat, 'lat')}, {formatCoordinate(s.lng, 'lng')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Required Capacity</p>
                  <p className="text-lg font-bold text-white">{(s.numChargers * POWER_STANDARD_KW).toLocaleString()} kW</p>
                  <p className="text-xs text-gray-500">{s.numChargers} chargers × {POWER_STANDARD_KW} kW</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-xs text-gray-400">
                  <span className="font-semibold text-gray-300">Recommended Action: </span>
                  {s.gridStatus === 'Congested'
                    ? 'Submit grid upgrade request to REE. Estimated lead time: 6–12 months. Consider interim mobile charging units or load-managed deployment.'
                    : 'Conduct detailed grid capacity study. Coordinate with local distribution company for reinforcement timeline. May proceed with reduced initial charger count.'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Distributor: <span className="text-gray-300">{getResolvedDistributor(s).distributor || 'Not provided'}</span>
                  {getResolvedDistributor(s).source === 'Heuristic' && <span className="text-amber-300"> · heuristic default</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Preview */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">3-Step Deployment Roadmap</h3>
        <div className="relative">
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-emerald-500 via-amber-500 to-red-500 opacity-30" />
          <div className="space-y-6">
            {roadmap.map((phase, i) => (
              <div key={i} className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  phase.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                  phase.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {i === 0 ? <Zap size={16} /> : i === 1 ? <RefreshCw size={16} /> : <Target size={16} />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-sm font-semibold text-white">{phase.phase}</h4>
                    <span className="text-[10px] font-medium text-gray-500">{phase.period}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{phase.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.stations.map(s => (
                      <span key={s.id} className="text-[10px] bg-white/5 border border-white/5 rounded-lg px-2 py-0.5 text-gray-300 font-mono">
                          {s.stationId} · {s.routeSegment} · {s.numChargers} chargers
                      </span>
                    ))}
                    {phase.stations.length === 0 && <span className="text-[10px] text-gray-600 italic">No stations in this phase</span>}
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
      <div>
        <h2 className="text-xl font-bold text-white">Import & Export Center</h2>
        <p className="text-sm text-gray-400 mt-0.5">Load your real datathon outputs, inspect them in the UI, and regenerate submission-ready CSV files</p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-500/10 p-3">
              <Upload size={22} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Import Real Submission Files</h3>
              <p className="text-sm text-gray-400 max-w-2xl">
                Upload File 2.csv to replace the seeded network. File 1.csv hydrates projected EVs and baseline counts, while File 3.csv enriches Moderate and Congested stations with distributor data.
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-iberdrola-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-iberdrola-600">
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
            <div key={file.key} className="rounded-xl border border-gray-800/60 bg-black/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{file.label}</p>
              <p className="mt-1 text-sm font-medium text-white">{importStatus[file.key] || 'Not loaded'}</p>
              <p className="mt-1 text-xs text-gray-500">{file.helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>Last import: <span className="text-gray-300">{formatImportTimestamp(importStatus.importedAt)}</span></p>
          <p>
            Loaded <span className="text-gray-300">{importStatus.stationCount}</span> stations and <span className="text-gray-300">{importStatus.frictionCount}</span> friction points.
          </p>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">PDF Rule Checklist</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs text-gray-400">
          <p>Output files must be named exactly File 1.csv, File 2.csv, and File 3.csv.</p>
          <p>Route segments are exported as official road codes only, matching the PDF schema for File 2 and File 3.</p>
          <p>File 3 includes only Moderate and Congested stations, with distributor network restricted to i-DE, Endesa, or Viesgo.</p>
          <p>estimated_demand_kw is calculated as n_chargers_proposed × 150 kW for every friction point.</p>
          <p>Urban-center coordinates are blocked to keep proposals focused on interurban corridors.</p>
          <p>The built app is configured for offline delivery with bundled data and relative asset paths, so it opens directly without login or installation.</p>
          <p>Team assumption: a {AFIR_LIGHT_DUTY_MAX_GAP_KM} km corridor-spacing gate is enabled as an internal quality control rule.</p>
          <p>Distributor defaults now resolve from public research notes and remain manually reviewable before export.</p>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${
        afirBlockingRoutes.length > 0
          ? 'bg-red-950/20 border-red-800/30'
          : planningAdvisories.length === 0
            ? 'bg-blue-950/20 border-blue-800/30'
            : 'bg-amber-950/20 border-amber-800/30'
      }`}>
        <div className="flex items-start gap-3">
          <Info size={22} className={`${
            afirBlockingRoutes.length > 0
              ? 'text-red-300'
              : planningAdvisories.length === 0
                ? 'text-blue-300'
                : 'text-amber-300'
          } mt-0.5`} />
          <div>
            <h3 className={`text-sm font-semibold ${
              afirBlockingRoutes.length > 0
                ? 'text-red-200'
                : planningAdvisories.length === 0
                  ? 'text-blue-200'
                  : 'text-amber-200'
            }`}>
              Team Planning Advisory
            </h3>
            {planningAdvisories.length === 0 ? (
              <p className="mt-1 text-xs text-gray-400">
                No active research-driven advisories. Route spacing and distributor defaults are currently inside the app's planning tolerance.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {planningAdvisories.map((advisory, index) => (
                  <li key={index} className="text-xs text-amber-100/90 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-300 mt-1.5 shrink-0" />
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
        validationErrors.length === 0 ? 'bg-emerald-950/20 border-emerald-800/30' : 'bg-red-950/20 border-red-800/30'
      }`}>
        <div className="flex items-start gap-3">
          {validationErrors.length === 0 ? (
            <>
              <CheckCircle2 size={22} className="text-emerald-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-300">All Validations Passed</h3>
                <p className="text-xs text-gray-400 mt-0.5">Your submission meets PDF-required checks (schema, naming, statuses, and {POWER_STANDARD_KW} kW standard) plus the optional team spacing gate.</p>
              </div>
            </>
          ) : (
            <>
              <XCircle size={22} className="text-red-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-300">Validation Errors ({validationErrors.length})</h3>
                <ul className="mt-2 space-y-1">
                  {validationErrors.map((e, i) => (
                    <li key={i} className="text-xs text-red-300/80 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" /> {e}
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
          <div key={i} className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${item.colorClasses}`}>
                <item.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.file}</p>
                <p className="text-sm font-semibold text-white">{item.label}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4 flex-1">{item.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{item.rows} row{item.rows !== 1 ? 's' : ''}</span>
              <button onClick={item.onClick}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition flex items-center gap-1.5">
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* One-Click Submission */}
      <div className="bg-gradient-to-r from-iberdrola-900/40 to-gray-900/60 border border-iberdrola-700/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-iberdrola-accent/20">
            <FileText size={24} className="text-iberdrola-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Prepare Submission</h3>
            <p className="text-sm text-gray-400 mb-4">
              Validates all PDF-required checks, applies the optional {AFIR_LIGHT_DUTY_MAX_GAP_KM} km team spacing gate, and exports all three files simultaneously.
            </p>
            <button onClick={handlePrepareSubmission}
              className="px-6 py-3 rounded-xl text-sm font-bold bg-iberdrola-accent text-iberdrola-900 hover:bg-iberdrola-accent-light transition flex items-center gap-2 shadow-lg shadow-iberdrola-accent/20">
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

  return (
    <div className="min-h-screen bg-gray-950 font-sans flex">
      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes modalIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-modal-in { animation: modalIn 0.2s ease-out; }
      `}</style>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900/80 border-r border-gray-800/50 flex flex-col transition-all duration-300 shrink-0`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iberdrola-700 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-iberdrola-accent" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white leading-tight truncate">Iberdrola</p>
              <p className="text-[10px] text-gray-500 leading-tight truncate">EV Command Center</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activePage === item.id
                  ? 'bg-iberdrola-700/30 text-iberdrola-accent border border-iberdrola-700/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}>
              <item.icon size={18} className="shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && item.id === 'friction' && kpis.frictionPoints.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-red-500/20 text-red-400 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {kpis.frictionPoints.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar toggle */}
        <div className="px-3 py-4 border-t border-gray-800/50">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition">
            <Menu size={16} />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-white">
              {navItems.find(n => n.id === activePage)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-900/50 rounded-lg px-3 py-1.5 border border-gray-800/50">
              <Activity size={12} className="text-emerald-500" />
              <span>System Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-900/50 rounded-lg px-3 py-1.5 border border-gray-800/50">
              <Battery size={12} className="text-iberdrola-accent" />
              <span>{POWER_STANDARD_KW} kW Standard</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 max-w-7xl mx-auto">
          <ActivePage />
        </div>
      </main>

      {/* MODALS */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setForm({ ...emptyForm }); }} title="Add New Station" size="lg">
        <StationForm onSubmit={handleAddStation} submitLabel="Add Station" />
      </Modal>

      <Modal open={!!editingStation} onClose={() => { setEditingStation(null); setForm({ ...emptyForm }); }} title="Edit Station" size="lg">
        <StationForm onSubmit={handleUpdateStation} submitLabel="Update Station" />
      </Modal>

      <Modal open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Confirm Deletion" size="sm">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={22} className="text-red-400" />
          </div>
          <p className="text-sm text-gray-300 mb-1">
            Delete station <span className="font-mono font-semibold text-white">{stations.find(s => s.id === showDeleteConfirm)?.stationId}</span>?
          </p>
          <p className="text-xs text-gray-500 mb-5">This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition">
              Cancel
            </button>
            <button onClick={() => handleDeleteStation(showDeleteConfirm)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1.5">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submission Validation Failed" size="md">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <Shield size={20} className="text-red-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-red-300">Cannot proceed with export</h4>
              <p className="text-xs text-gray-400">Please resolve the following issues:</p>
            </div>
          </div>
          <ul className="space-y-2 mb-5">
            {validationErrors.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-300/80">
                <XCircle size={14} className="mt-0.5 shrink-0 text-red-400" /> {e}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 transition">
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
