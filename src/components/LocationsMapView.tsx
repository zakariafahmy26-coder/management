import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Layers,
  Search,
  Crosshair,
  Factory,
  Warehouse,
  Anchor,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Info,
} from 'lucide-react';
import { LocationPlace } from '../types';

interface LocationsMapViewProps {
  locations: LocationPlace[];
  selectedLocationId?: string;
  onSelectLocation?: (loc: LocationPlace) => void;
  onEditLocation?: (loc: LocationPlace) => void;
  className?: string;
  height?: string;
}

// Category visual mapping
const CATEGORY_STYLES: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    label: string;
    iconSvg: string;
  }
> = {
  مصنع: {
    bg: '#7c3aed', // Purple
    border: '#ffffff',
    text: '#ffffff',
    label: 'مصنع وإنتاج',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>`,
  },
  'مستودع ومخزن': {
    bg: '#0284c7', // Sky blue
    border: '#ffffff',
    text: '#ffffff',
    label: 'مستودع ومخزن',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/></svg>`,
  },
  'ميناء بحري': {
    bg: '#0d9488', // Teal
    border: '#ffffff',
    text: '#ffffff',
    label: 'ميناء بحري',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`,
  },
  'فرع وتوزيع': {
    bg: '#2563eb', // Royal Blue
    border: '#ffffff',
    text: '#ffffff',
    label: 'فرع وتوزيع',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  },
  'عميل رئيسي': {
    bg: '#e11d48', // Rose Red
    border: '#ffffff',
    text: '#ffffff',
    label: 'عميل رئيسي',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`,
  },
};

const DEFAULT_CATEGORY_STYLE = {
  bg: '#475569',
  border: '#ffffff',
  text: '#ffffff',
  label: 'موقع تشغيلي',
  iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

// Region centers for smooth panning
const REGION_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  ALL: { center: [30.98, 29.65], zoom: 9 },
  الإسكندرية: { center: [31.18, 29.89], zoom: 11 },
  'الساحل الشمالي': { center: [30.92, 28.80], zoom: 9 },
  البحيرة: { center: [30.85, 30.35], zoom: 10 },
};

export const LocationsMapView: React.FC<LocationsMapViewProps> = ({
  locations,
  selectedLocationId,
  onSelectLocation,
  onEditLocation,
  className = '',
  height = '620px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Filter and view controls
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeLocId, setActiveLocId] = useState<string | null>(selectedLocationId || null);

  // Filter locations based on region, category, search, and coordinates validity
  const validLocations = useMemo(() => {
    return locations.map((loc) => {
      let lat = loc.latitude;
      let lng = loc.longitude;
      if ((!lat || !lng) && loc.coordinates && loc.coordinates.length === 2) {
        lat = loc.coordinates[0];
        lng = loc.coordinates[1];
      }
      return {
        ...loc,
        resolvedLat: lat,
        resolvedLng: lng,
        hasCoords: typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng),
      };
    });
  }, [locations]);

  const filteredLocations = useMemo(() => {
    return validLocations.filter((loc) => {
      if (!loc.hasCoords) return false;
      if (selectedRegion !== 'ALL' && loc.region !== selectedRegion) return false;
      if (selectedCategory !== 'ALL' && loc.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = loc.name.toLowerCase().includes(q);
        const matchesCode = loc.code.toLowerCase().includes(q);
        const matchesAddress = loc.address?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesAddress) return false;
      }
      return true;
    });
  }, [validLocations, selectedRegion, selectedCategory, searchQuery]);

  // Initialize map instance once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.98, 29.65],
      zoom: 9,
      zoomControl: false,
      attributionControl: true,
    });

    // High quality OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Zoom control in top-right (standard for RTL)
    L.control.zoom({ position: 'topleft' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update markers whenever filteredLocations or activeLocId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markersMapRef.current.clear();

    const bounds = L.latLngBounds([]);

    filteredLocations.forEach((loc) => {
      const lat = loc.resolvedLat!;
      const lng = loc.resolvedLng!;
      const latLng: [number, number] = [lat, lng];
      bounds.extend(latLng);

      const style = CATEGORY_STYLES[loc.category] || DEFAULT_CATEGORY_STYLE;
      const isSelected = activeLocId === loc.id;

      // Custom Leaflet DivIcon with beautiful SVG pin and label
      const markerIcon = L.divIcon({
        className: 'leaflet-location-custom-pin',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transform: translate(-50%, -100%);
            transition: transform 0.2s ease, filter 0.2s ease;
            filter: ${isSelected ? 'drop-shadow(0 0 8px ' + style.bg + ')' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))'};
          ">
            <!-- Top label pill -->
            <div style="
              background: ${isSelected ? '#0f172a' : 'rgba(15, 23, 42, 0.92)'};
              color: ${isSelected ? '#38bdf8' : '#ffffff'};
              border: 1.5px solid ${isSelected ? '#38bdf8' : style.bg};
              font-family: system-ui, -apple-system, sans-serif;
              font-weight: 700;
              font-size: 11px;
              padding: 2px 8px;
              border-radius: 9999px;
              white-space: nowrap;
              margin-bottom: 3px;
              letter-spacing: -0.2px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
              ${escapeHtml(loc.name)}
            </div>

            <!-- Pin Head with Category Icon -->
            <div style="
              width: 32px;
              height: 32px;
              background: ${style.bg};
              border: 2.5px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 8px rgba(0,0,0,0.3);
              ${isSelected ? 'transform: scale(1.2); outline: 3px solid #38bdf8;' : ''}
            ">
              ${style.iconSvg}
            </div>

            <!-- Pointer Triangle -->
            <div style="
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 6px solid ${style.bg};
              margin-top: -1px;
            "></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker(latLng, { icon: markerIcon, title: loc.name }).addTo(layerGroup);
      markersMapRef.current.set(loc.id, marker);

      // Popup Content
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const popupHtml = `
        <div style="
          font-family: system-ui, -apple-system, sans-serif;
          direction: rtl;
          text-align: right;
          min-width: 240px;
          padding: 2px;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            <span style="
              background: ${style.bg}18;
              color: ${style.bg};
              font-weight: 800;
              font-size: 11px;
              padding: 2px 8px;
              border-radius: 6px;
              border: 1px solid ${style.bg}30;
            ">
              ${escapeHtml(loc.category)}
            </span>
            <span style="
              background: #f1f5f9;
              color: #475569;
              font-family: monospace;
              font-weight: 700;
              font-size: 11px;
              padding: 2px 6px;
              border-radius: 4px;
            ">
              ${escapeHtml(loc.code)}
            </span>
          </div>

          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
            ${escapeHtml(loc.name)}
          </div>

          <div style="font-size: 12px; color: #475569; margin-bottom: 4px; display: flex; align-items: flex-start; gap: 4px;">
            <span style="color: #64748b; font-weight: 600;">المنطقة:</span>
            <span style="font-weight: 700; color: #1e293b;">${escapeHtml(loc.region)}</span>
          </div>

          ${
            loc.address
              ? `
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.4;">
              📍 ${escapeHtml(loc.address)}
            </div>
          `
              : ''
          }

          ${
            loc.notes
              ? `
            <div style="font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 6px; border-radius: 6px; color: #334155; margin-bottom: 8px; line-height: 1.3;">
              ℹ️ ${escapeHtml(loc.notes)}
            </div>
          `
              : ''
          }

          <div style="background: #f8fafc; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-family: monospace; color: #64748b; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span>الإحداثيات:</span>
            <span style="direction: ltr; font-weight: bold; color: #0f172a;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
          </div>

          <div style="display: flex; gap: 6px; margin-top: 4px;">
            <a
              href="${googleMapsUrl}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                flex: 1;
                text-align: center;
                background: #0284c7;
                color: white;
                text-decoration: none;
                font-size: 11px;
                font-weight: 700;
                padding: 6px 10px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
              "
            >
              فتح في خرائط Google
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        className: 'custom-leaflet-popup',
      });

      marker.on('click', () => {
        setActiveLocId(loc.id);
        if (onSelectLocation) {
          onSelectLocation(loc);
        }
      });
    });

    // Auto-fit bounds if markers exist and no manual single-location selected
    if (filteredLocations.length > 0 && bounds.isValid() && !activeLocId) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [filteredLocations, activeLocId, onSelectLocation]);

  // Fly to location when activeLocId changes or when clicked from sidebar
  const handleFlyToLocation = (loc: LocationPlace) => {
    setActiveLocId(loc.id);
    const map = mapInstanceRef.current;
    if (!map) return;

    let lat = loc.latitude;
    let lng = loc.longitude;
    if ((!lat || !lng) && loc.coordinates && loc.coordinates.length === 2) {
      lat = loc.coordinates[0];
      lng = loc.coordinates[1];
    }

    if (typeof lat === 'number' && typeof lng === 'number') {
      map.flyTo([lat, lng], 14, {
        duration: 1.2,
      });

      const marker = markersMapRef.current.get(loc.id);
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 1250);
      }
    }

    if (onSelectLocation) {
      onSelectLocation(loc);
    }
  };

  // Zoom to full region
  const handleSelectRegion = (regKey: string) => {
    setSelectedRegion(regKey);
    const map = mapInstanceRef.current;
    if (!map) return;

    const target = REGION_CENTERS[regKey] || REGION_CENTERS.ALL;
    map.flyTo(target.center, target.zoom, { duration: 1 });
    setActiveLocId(null);
  };

  // Reset view to fit all filtered markers
  const handleResetBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);
    filteredLocations.forEach((l) => {
      if (l.resolvedLat && l.resolvedLng) {
        bounds.extend([l.resolvedLat, l.resolvedLng]);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.flyTo([30.98, 29.65], 9);
    }
  };

  return (
    <div
      className={`relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm ${className}`}
      style={{ minHeight: height }}
    >
      {/* Top Filter & Control Toolbar */}
      <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 z-10 backdrop-blur-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => handleSelectRegion('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedRegion === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              جميع المناطق ({validLocations.filter((l) => l.hasCoords).length})
            </button>
            <button
              onClick={() => handleSelectRegion('الإسكندرية')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedRegion === 'الإسكندرية'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              الإسكندرية
            </button>
            <button
              onClick={() => handleSelectRegion('الساحل الشمالي')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedRegion === 'الساحل الشمالي'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              الساحل الشمالي
            </button>
            <button
              onClick={() => handleSelectRegion('البحيرة')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedRegion === 'البحيرة'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              البحيرة
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs focus:outline-hidden"
          >
            <option value="ALL">جميع التصنيفات</option>
            <option value="مصنع">مصنع (Factory)</option>
            <option value="مستودع ومخزن">مستودع ومخزن (Warehouse)</option>
            <option value="ميناء بحري">ميناء بحري (Sea Port)</option>
            <option value="فرع وتوزيع">فرع وتوزيع (Branch)</option>
            <option value="عميل رئيسي">عميل رئيسي (Key Client)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            <input
              type="text"
              placeholder="ابحث في الخريطة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 shadow-2xs focus:outline-hidden"
            />
          </div>

          {/* Reset view button */}
          <button
            onClick={handleResetBounds}
            title="إعادة ضبط نطاق الخريطة"
            className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
          >
            <Crosshair className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">نطاق الكل</span>
          </button>

          {/* Toggle sidebar button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'إخفاء قائمة المواقع' : 'إظهار قائمة المواقع'}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">
              {isSidebarOpen ? 'إخفاء القائمة' : `المواقع (${filteredLocations.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Main Map Body + Collapsible Sidebar */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="flex-1 w-full h-full z-0 min-h-[480px]" />

        {/* Collapsible Location Selection Sidebar */}
        {isSidebarOpen && (
          <div className="w-80 max-w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 shadow-xl overflow-hidden transition-all duration-300">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  المواقع الجغرافية المسجلة
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {filteredLocations.length} موقع
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {filteredLocations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  لا توجد مواقع تطابق معايير التصفية والبحث الحالية.
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const style = CATEGORY_STYLES[loc.category] || DEFAULT_CATEGORY_STYLE;
                  const isSelected = activeLocId === loc.id;

                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleFlyToLocation(loc)}
                      className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/60 shadow-xs ring-1 ring-blue-500/30'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: style.bg }}
                          />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {loc.name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                          {loc.code}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md"
                          style={{
                            backgroundColor: `${style.bg}15`,
                            color: style.bg,
                          }}
                        >
                          {loc.category}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {loc.region}
                        </span>
                      </div>

                      {loc.address && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 truncate">
                          {loc.address}
                        </p>
                      )}

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono">
                          {loc.resolvedLat?.toFixed(3)}, {loc.resolvedLng?.toFixed(3)}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                          <span>انتقال للخريطة</span>
                          <ChevronLeft className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend Bar */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 dark:text-slate-200">دليل الدبابيس:</span>
          {Object.entries(CATEGORY_STYLES).map(([cat, style]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shadow-2xs"
                style={{ backgroundColor: style.bg }}
              />
              <span className="text-[11px]">{cat}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <span>Leaflet + OpenStreetMap Interactive Fleet Engine</span>
        </div>
      </div>
    </div>
  );
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
