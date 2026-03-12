import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Map, AlertTriangle, Download, Plus, Trash2, Edit3, Check, X,
  Zap, MapPin, Activity, TrendingUp, ChevronRight, Settings, FileText, Shield,
  Battery, Navigation, BarChart3, Bell, Search, Menu, ChevronDown, Eye, RefreshCw,
  Info, CheckCircle2, XCircle, AlertCircle, Cpu, Globe, Layers, Target, Gauge
} from 'lucide-react';

// ─── CONSTANTS ───────────────────────────────────────────────────────────
const POWER_STANDARD_KW = 150;
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
  'A-1 (Madrid-Burgos)', 'A-2 (Madrid-Barcelona)', 'A-3 (Madrid-Valencia)',
  'A-4 (Madrid-Cádiz)', 'A-5 (Madrid-Badajoz)', 'A-6 (Madrid-A Coruña)',
  'A-7 (Mediterranean Corridor)', 'AP-7 (Costa del Sol)', 'A-66 (Ruta de la Plata)',
  'AP-68 (Bilbao-Zaragoza)', 'N-340 (Cadiz-Barcelona)', 'A-8 (Cantabrian Corridor)',
];

const GRID_STATUS_OPTIONS = [
  { value: 'Sufficient', color: 'emerald', label: 'Sufficient' },
  { value: 'Moderate', color: 'amber', label: 'Moderate' },
  { value: 'Congested', color: 'red', label: 'Congested' },
];

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).slice(2, 10);

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
const SpainMap = ({ stations, hoveredStation, setHoveredStation }) => {
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
    if (hasModerate) return { fill: 'rgba(245,158,11,0.15)', stroke: 'rgba(245,158,11,0.4)' };
    return { fill: 'rgba(16,185,129,0.15)', stroke: 'rgba(16,185,129,0.4)' };
  };

  const gridColor = (status) =>
    status === 'Sufficient' ? '#10b981' : status === 'Moderate' ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-full bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sufficient
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Congested
        </span>
      </div>
      <svg viewBox="0 0 480 400" className="w-full h-auto" style={{ minHeight: 350 }}>
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
          const color = gridColor(s.gridStatus);
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
                  <rect x={s.mapX + 12} y={s.mapY - 38} width="135" height="52" rx="6"
                    fill="rgba(17,24,39,0.95)" stroke={color} strokeWidth="1" />
                  <text x={s.mapX + 18} y={s.mapY - 22} className="text-[9px] fill-white font-semibold">
                    {s.stationId || `ST-${s.id.slice(0,4).toUpperCase()}`}
                  </text>
                  <text x={s.mapX + 18} y={s.mapY - 10} className="text-[8px] fill-gray-400">
                    {s.routeSegment?.slice(0, 25) || 'No route assigned'}
                  </text>
                  <text x={s.mapX + 18} y={s.mapY + 2} className="text-[8px] fill-gray-400">
                    {s.numChargers} chargers · {s.numChargers * POWER_STANDARD_KW} kW
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {stations.length === 0 && (
          <text x="240" y="200" textAnchor="middle" className="text-[12px] fill-gray-600 font-medium">
            Add stations to see them on the map
          </text>
        )}
      </svg>
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
  const [totalEVs2027, setTotalEVs2027] = useState(5000000);
  const [existingBaseline, setExistingBaseline] = useState(12500);
  const [setupDone, setSetupDone] = useState(false);

  // Stations
  const [stations, setStations] = useState([
    { id: generateId(), stationId: 'IB-MAD-001', lat: 40.4168, lng: -3.7038, routeSegment: 'A-2 (Madrid-Barcelona)', numChargers: 8, gridStatus: 'Sufficient', powerKW: 150, mapX: 215, mapY: 190 },
    { id: generateId(), stationId: 'IB-BCN-001', lat: 41.3851, lng: 2.1734, routeSegment: 'A-2 (Madrid-Barcelona)', numChargers: 12, gridStatus: 'Sufficient', powerKW: 150, mapX: 375, mapY: 105 },
    { id: generateId(), stationId: 'IB-VAL-001', lat: 39.4699, lng: -0.3763, routeSegment: 'A-3 (Madrid-Valencia)', numChargers: 6, gridStatus: 'Moderate', powerKW: 150, mapX: 330, mapY: 220 },
    { id: generateId(), stationId: 'IB-SEV-001', lat: 37.3891, lng: -5.9845, routeSegment: 'A-4 (Madrid-Cádiz)', numChargers: 10, gridStatus: 'Congested', powerKW: 150, mapX: 155, mapY: 320 },
    { id: generateId(), stationId: 'IB-BIL-001', lat: 43.2627, lng: -2.9253, routeSegment: 'A-8 (Cantabrian Corridor)', numChargers: 5, gridStatus: 'Sufficient', powerKW: 150, mapX: 210, mapY: 68 },
  ]);

  // Map hover
  const [hoveredStation, setHoveredStation] = useState(null);

  // Editing
  const [editingStation, setEditingStation] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form state
  const emptyForm = { stationId: '', lat: '', lng: '', routeSegment: ROUTE_SEGMENTS[0], numChargers: 4, gridStatus: 'Sufficient', powerKW: POWER_STANDARD_KW };
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

  // ─── MAP POSITION CALCULATOR ─────────────────────────────────────────
  const latLngToMapXY = (lat, lng) => {
    const minLat = 36, maxLat = 44, minLng = -10, maxLng = 5;
    const x = ((lng - minLng) / (maxLng - minLng)) * 420 + 30;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 340 + 40;
    return { mapX: Math.round(x), mapY: Math.round(y) };
  };

  // ─── HANDLERS ────────────────────────────────────────────────────────
  const handleAddStation = () => {
    if (!form.stationId.trim()) { addToast('Station ID is required', 'error'); return; }
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (isNaN(lat) || lat < 27 || lat > 44) { addToast('Latitude must be between 27° and 44°', 'error'); return; }
    if (isNaN(lng) || lng < -19 || lng > 5) { addToast('Longitude must be between -19° and 5°', 'error'); return; }
    if (form.numChargers < 1) { addToast('Must have at least 1 charger', 'error'); return; }

    const { mapX, mapY } = latLngToMapXY(lat, lng);
    const newStation = {
      id: generateId(), stationId: form.stationId.trim(), lat, lng,
      routeSegment: form.routeSegment, numChargers: parseInt(form.numChargers),
      gridStatus: form.gridStatus, powerKW: POWER_STANDARD_KW, mapX, mapY,
    };
    setStations(prev => [...prev, newStation]);
    setForm({ ...emptyForm });
    setShowAddModal(false);
    addToast(`Station ${newStation.stationId} added successfully`, 'success');
  };

  const handleUpdateStation = () => {
    if (!editingStation) return;
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (isNaN(lat) || isNaN(lng)) { addToast('Invalid coordinates', 'error'); return; }
    const { mapX, mapY } = latLngToMapXY(lat, lng);
    setStations(prev => prev.map(s => s.id === editingStation.id ? {
      ...s, stationId: form.stationId.trim(), lat, lng, routeSegment: form.routeSegment,
      numChargers: parseInt(form.numChargers), gridStatus: form.gridStatus, powerKW: POWER_STANDARD_KW, mapX, mapY,
    } : s));
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
      gridStatus: station.gridStatus, powerKW: station.powerKW,
    });
  };

  // ─── VALIDATION & EXPORT ─────────────────────────────────────────────
  const validationErrors = useMemo(() => {
    const errors = [];
    if (stations.length === 0) errors.push('No stations defined');
    stations.forEach(s => {
      if (s.powerKW < POWER_STANDARD_KW) errors.push(`${s.stationId}: Below ${POWER_STANDARD_KW} kW standard`);
      if (!s.routeSegment) errors.push(`${s.stationId}: Missing route segment`);
      if (!s.stationId) errors.push(`${s.stationId || 'Unknown'}: Missing station ID`);
    });
    if (totalEVs2027 <= 0) errors.push('Total EVs 2027 must be positive');
    return errors;
  }, [stations, totalEVs2027]);

  const exportFile1 = () => {
    const headers = ['KPI', 'Value', 'Unit', 'Timestamp'];
    const ts = new Date().toISOString();
    const rows = [
      ['Total Stations', kpis.totalStations, 'count', ts],
      ['Total Chargers', kpis.totalChargers, 'count', ts],
      ['Total Capacity', kpis.totalCapacity, 'kW', ts],
      ['Total Projected EVs 2027', totalEVs2027, 'vehicles', ts],
      ['Existing Baseline Chargers', existingBaseline, 'count', ts],
      ['Friction Points', kpis.frictionPoints.length, 'count', ts],
      ['Compliance Rate', kpis.complianceRate, '%', ts],
      ['Power Standard', POWER_STANDARD_KW, 'kW', ts],
    ];
    downloadCSV('File1_KPIs.csv', headers, rows);
    addToast('File 1 (KPIs) exported', 'success');
  };

  const exportFile2 = () => {
    const headers = ['Station_ID', 'Latitude', 'Longitude', 'Route_Segment', 'Num_Chargers', 'Power_kW', 'Grid_Status', 'Total_Capacity_kW'];
    const rows = stations.map(s => [
      s.stationId, s.lat, s.lng, s.routeSegment, s.numChargers, s.powerKW, s.gridStatus, s.numChargers * s.powerKW,
    ]);
    downloadCSV('File2_Proposed_Locations.csv', headers, rows);
    addToast('File 2 (Proposed Locations) exported', 'success');
  };

  const exportFile3 = () => {
    const headers = ['Station_ID', 'Latitude', 'Longitude', 'Route_Segment', 'Grid_Status', 'Friction_Level', 'Recommended_Action', 'Priority'];
    const rows = kpis.frictionPoints.map(s => [
      s.stationId, s.lat, s.lng, s.routeSegment, s.gridStatus,
      s.gridStatus === 'Congested' ? 'Critical' : 'Warning',
      s.gridStatus === 'Congested' ? 'Grid upgrade required before deployment' : 'Monitor and assess grid reinforcement options',
      s.gridStatus === 'Congested' ? 'High' : 'Medium',
    ]);
    downloadCSV('File3_Friction_Points.csv', headers, rows);
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
  const StationForm = ({ onSubmit, submitLabel }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Station ID">
          <input className={inputCls} placeholder="IB-XXX-001" value={form.stationId}
            onChange={e => setForm(f => ({ ...f, stationId: e.target.value }))} />
        </FormField>
        <FormField label="Route Segment">
          <select className={selectCls} value={form.routeSegment}
            onChange={e => setForm(f => ({ ...f, routeSegment: e.target.value }))}>
            {ROUTE_SEGMENTS.map(r => <option key={r} value={r}>{r}</option>)}
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
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Grid Status">
          <select className={selectCls} value={form.gridStatus}
            onChange={e => setForm(f => ({ ...f, gridStatus: e.target.value }))}>
            {GRID_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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

      {/* Quick Map & Report */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Network Overview</h3>
            <button onClick={() => setActivePage('map')} className="text-xs text-iberdrola-accent hover:text-iberdrola-accent-light transition flex items-center gap-1">
              Full Map <ChevronRight size={14} />
            </button>
          </div>
          <SpainMap stations={stations} hoveredStation={hoveredStation} setHoveredStation={setHoveredStation} />
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
                      {s.stationId}
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
                  fill="none" stroke={kpis.complianceRate === 100 ? '#10b981' : '#f59e0b'}
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
              <p className="text-lg font-bold text-amber-400">{stations.filter(s => s.gridStatus === 'Moderate').length}</p>
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
        <button onClick={() => { setForm({ ...emptyForm }); setShowAddModal(true); }}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-iberdrola-700 hover:bg-iberdrola-600 text-white transition flex items-center gap-2">
          <Plus size={16} /> Add Station
        </button>
      </div>

      <SpainMap stations={stations} hoveredStation={hoveredStation} setHoveredStation={setHoveredStation} />

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
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(s => (
                <tr key={s.id} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition"
                  onMouseEnter={() => setHoveredStation(s.id)} onMouseLeave={() => setHoveredStation(null)}>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-semibold text-white">{s.stationId}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-300 text-xs">{s.routeSegment}</td>
                  <td className="px-5 py-3.5 text-center text-white font-medium">{s.numChargers}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-xs font-medium text-emerald-400">{s.powerKW} kW</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      s.gridStatus === 'Sufficient' ? 'bg-emerald-500/15 text-emerald-400' :
                      s.gridStatus === 'Moderate' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        s.gridStatus === 'Sufficient' ? 'bg-emerald-400' :
                        s.gridStatus === 'Moderate' ? 'bg-amber-400' : 'bg-red-400'
                      }`} />
                      {s.gridStatus}
                    </span>
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
              ))}
              {stations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-600">
                    <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No stations yet. Click "Add Station" to begin.</p>
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
        <KpiCard icon={AlertCircle} label="Moderate Friction" value={stations.filter(s => s.gridStatus === 'Moderate').length} color="amber"
          sublabel="Requires grid assessment" />
        <KpiCard icon={XCircle} label="Critical Friction" value={stations.filter(s => s.gridStatus === 'Congested').length} color="red"
          sublabel="Major upgrade required" />
      </div>

      {/* Friction Details */}
      {kpis.frictionPoints.length === 0 ? (
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
                s.gridStatus === 'Congested' ? 'bg-red-950/15 border-red-800/30' : 'bg-amber-950/15 border-amber-800/30'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${s.gridStatus === 'Congested' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                    <AlertTriangle size={20} className={s.gridStatus === 'Congested' ? 'text-red-400' : 'text-amber-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-semibold text-white">{s.stationId}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        s.gridStatus === 'Congested' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>{s.gridStatus === 'Congested' ? 'CRITICAL' : 'WARNING'}</span>
                    </div>
                    <p className="text-sm text-gray-400">{s.routeSegment}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{s.lat.toFixed(4)}°N, {s.lng.toFixed(4)}°W</p>
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
                        {s.stationId} — {s.numChargers} chargers
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
        <h2 className="text-xl font-bold text-white">Export Center</h2>
        <p className="text-sm text-gray-400 mt-0.5">Generate submission-ready CSV files following Iberdrola challenge schema</p>
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
                <p className="text-xs text-gray-400 mt-0.5">Your submission meets all requirements including the {POWER_STANDARD_KW} kW mandatory standard.</p>
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
            file: 'File 1', label: 'KPIs Report', desc: 'Key performance indicators including total stations, capacity, friction points, and compliance data.',
            icon: BarChart3, color: 'emerald', onClick: exportFile1, rows: 8,
          },
          {
            file: 'File 2', label: 'Proposed Locations', desc: 'Complete station registry with coordinates, route segments, charger counts, and grid status.',
            icon: MapPin, color: 'blue', onClick: exportFile2, rows: stations.length,
          },
          {
            file: 'File 3', label: 'Friction Points', desc: 'Detailed friction analysis with severity levels, recommended actions, and deployment priorities.',
            icon: AlertTriangle, color: 'amber', onClick: exportFile3, rows: kpis.frictionPoints.length,
          },
        ].map((item, i) => (
          <div key={i} className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl bg-${item.color}-500/10`}>
                <item.icon size={20} className={`text-${item.color}-400`} />
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
              Validates all stations for {POWER_STANDARD_KW} kW compliance and exports all three files simultaneously.
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
