import {
  Compass,
  CornerDownLeft,
  ExternalLink,
  Fuel,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Truck,
  User,
  X,
} from 'lucide-react';
import L from 'leaflet';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Driver, TripRoute, Vehicle } from '../types';
import { resolveTripCoordinates } from '../utils/geoCoordinates';

interface TripMapViewProps {
  trip: TripRoute | null;
  vehicle?: Vehicle;
  driver?: Driver;
  onClose?: () => void;
  isExpandedDefault?: boolean;
}

export const TripMapView: React.FC<TripMapViewProps> = ({
  trip,
  vehicle,
  driver,
  onClose,
  isExpandedDefault = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(isExpandedDefault);

  const resolved = useMemo(() => {
    if (!trip) return null;
    return resolveTripCoordinates(trip);
  }, [trip]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = resolved
        ? resolved.startCoords
        : [31.05, 29.85];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 10,
        zoomControl: false,
        attributionControl: true,
      });

      // Add standard OSM tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Add custom zoom control top-left
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Dedicated layer group for dynamically drawn markers & paths
      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers & route when trip / resolved changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !resolved || !trip) return;

    // Clear previous trip layers
    layerGroup.clearLayers();

    // 1. Start Marker Custom Icon
    const startIcon = L.divIcon({
      className: 'custom-map-pin start-pin',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
          <div style="background: #059669; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; background: #34d399; border-radius: 50%; animation: ping 1.5s infinite;"></span>
            <span>البداية: ${escapeHtml(resolved.startName)}</span>
          </div>
          <div style="width: 2px; height: 10px; background: #059669;"></div>
          <div style="width: 10px; height: 10px; background: #059669; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    const startMarker = L.marker(resolved.startCoords, { icon: startIcon }).addTo(layerGroup);
    startMarker.bindPopup(`
      <div style="font-family: system-ui, -apple-system, sans-serif; text-align: right; direction: rtl; min-width: 160px;">
        <div style="font-weight: 800; color: #065f46; font-size: 13px; margin-bottom: 4px;">نقطة الانطلاق (البداية)</div>
        <div style="font-size: 12px; color: #1f2937; font-weight: 600;">${escapeHtml(resolved.startName)}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">قراءة العداد: ${trip.startOdometer.toLocaleString()} كم</div>
      </div>
    `);

    // 2. Intermediate Stops Markers
    resolved.stops.forEach((stop, idx) => {
      const stopIcon = L.divIcon({
        className: 'custom-map-pin stop-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
            <div style="background: #2563eb; color: white; padding: 3px 7px; border-radius: 9999px; font-weight: 600; font-size: 10px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 2px solid white;">
              محطة #${idx + 1}: ${escapeHtml(stop.name)}
            </div>
            <div style="width: 2px; height: 8px; background: #2563eb;"></div>
            <div style="width: 8px; height: 8px; background: #2563eb; border: 2px solid white; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const stopMarker = L.marker(stop.coords, { icon: stopIcon }).addTo(layerGroup);
      stopMarker.bindPopup(`
        <div style="font-family: system-ui, -apple-system, sans-serif; text-align: right; direction: rtl; min-width: 140px;">
          <div style="font-weight: bold; color: #1e40af; font-size: 12px;">محطة توقف #${idx + 1}</div>
          <div style="font-size: 11px; color: #374151;">${escapeHtml(stop.name)}</div>
        </div>
      `);
    });

    // 3. Destination Marker Custom Icon
    const destIcon = L.divIcon({
      className: 'custom-map-pin dest-pin',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
          <div style="background: #e11d48; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white;">
            🏁 النهاية: ${escapeHtml(resolved.destinationName)}
          </div>
          <div style="width: 2px; height: 10px; background: #e11d48;"></div>
          <div style="width: 10px; height: 10px; background: #e11d48; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    const destMarker = L.marker(resolved.destinationCoords, { icon: destIcon }).addTo(layerGroup);
    destMarker.bindPopup(`
      <div style="font-family: system-ui, -apple-system, sans-serif; text-align: right; direction: rtl; min-width: 160px;">
        <div style="font-weight: 800; color: #9f1239; font-size: 13px; margin-bottom: 4px;">نقطة الوصول (النهاية)</div>
        <div style="font-size: 12px; color: #1f2937; font-weight: 600;">${escapeHtml(resolved.destinationName)}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">قراءة العداد: ${trip.endOdometer.toLocaleString()} كم</div>
        <div style="font-size: 11px; color: #047857; font-weight: bold; margin-top: 2px;">المسافة: ${trip.distanceKm} كم</div>
      </div>
    `);

    // 4. Background Glow/Casing Polyline
    L.polyline(resolved.routePath, {
      color: '#ffffff',
      weight: 8,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layerGroup);

    // 5. Main Route Polyline
    const routePolyline = L.polyline(resolved.routePath, {
      color: trip.status === 'جارية حالياً' ? '#0284c7' : '#059669',
      weight: 5,
      opacity: 0.95,
      dashArray: trip.status === 'جارية حالياً' ? '8, 8' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layerGroup);

    routePolyline.bindPopup(`
      <div style="font-family: system-ui, -apple-system, sans-serif; text-align: right; direction: rtl;">
        <div style="font-weight: bold; color: #0f172a; font-size: 12px;">${escapeHtml(trip.tripCode)}</div>
        <div style="font-size: 11px; color: #475569;">المسافة: <strong>${trip.distanceKm} كم</strong></div>
        <div style="font-size: 11px; color: #475569;">الوقود: <strong>${trip.fuelLiters} لتر</strong> (${trip.fuelTotalCost} ج.م)</div>
      </div>
    `);

    // Fit map view smoothly to contain all points
    const bounds = L.latLngBounds(resolved.routePath);
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 13,
      animate: true,
      duration: 0.8,
    });

    // Invalidate size to guarantee sharp Leaflet render inside flex containers
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [resolved, trip]);

  // Handle container resize when fullscreen changes
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current || !resolved) return;
    const bounds = L.latLngBounds(resolved.routePath);
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  };

  if (!trip || !resolved) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
        <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-400" />
        <p className="font-semibold text-sm">حدد أي رحلة من الجدول لعرض مسارها على الخريطة</p>
        <p className="text-xs text-slate-400 mt-1">
          يمكنك النقر على أي صف في الجدول لمعاينة خط السير ونقطتي البداية والنهاية
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col shadow-2xl' : 'w-full'
      }`}
    >
      {/* Top Header Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{trip.tripCode}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  trip.status === 'مكتملة'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : trip.status === 'جارية حالياً'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {trip.status}
              </span>
              <span className="text-xs text-slate-400">({trip.region})</span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 truncate max-w-xl">
              <span className="font-semibold text-emerald-400">{resolved.startName}</span>
              <span className="text-slate-500">→</span>
              {resolved.stops.length > 0 && (
                <>
                  <span className="text-blue-300 text-[11px] truncate">
                    ({resolved.stops.length} محطات توقف)
                  </span>
                  <span className="text-slate-500">→</span>
                </>
              )}
              <span className="font-semibold text-rose-400">{resolved.destinationName}</span>
            </div>
          </div>
        </div>

        {/* Map Control Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecenter}
            title="إعادة ضبط زاوية الرؤية على المسار"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">توسيط الخريطة</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="إغلاق خريطة المسار"
              className="p-1.5 bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas and Stats Row */}
      <div className={`relative ${isFullscreen ? 'flex-1' : 'h-[360px] sm:h-[420px]'}`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Route Info Overlay */}
        <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:max-w-md bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200/90 shadow-lg z-10 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pb-2.5 mb-2.5 border-b border-slate-100">
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-500 block">المسافة</span>
              <strong className="text-slate-900 text-sm font-black">{trip.distanceKm}</strong>
              <span className="text-[10px] text-slate-400 mr-0.5">كم</span>
            </div>
            <div className="p-1.5 bg-blue-50/60 rounded-lg">
              <span className="text-[10px] text-blue-700 block">الوقود</span>
              <strong className="text-blue-900 text-sm font-black">{trip.fuelLiters}</strong>
              <span className="text-[10px] text-blue-600 mr-0.5">لتر</span>
            </div>
            <div className="p-1.5 bg-emerald-50/60 rounded-lg">
              <span className="text-[10px] text-emerald-700 block">التكلفة</span>
              <strong className="text-emerald-900 text-sm font-black">{trip.tripCostTotal}</strong>
              <span className="text-[10px] text-emerald-600 mr-0.5">ج.م</span>
            </div>
            <div className="p-1.5 bg-purple-50/60 rounded-lg">
              <span className="text-[10px] text-purple-700 block">التاريخ</span>
              <strong className="text-purple-950 text-xs font-bold block truncate">{trip.date}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-800">
                {vehicle?.plateNumber || trip.vehicleId}
              </span>
              {vehicle?.model && <span className="text-slate-400 truncate max-w-[100px]">({vehicle.model})</span>}
            </div>

            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-800">{driver?.name || trip.driverId}</span>
            </div>

            {trip.cargoType && (
              <div className="w-full text-slate-500 text-[10px] pt-1 truncate border-t border-slate-100">
                الحمولة: {trip.cargoType}
              </div>
            )}
          </div>
        </div>

        {/* Legend Overlay */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-2 rounded-lg border border-slate-200/80 shadow-xs z-10 text-[11px] font-medium hidden sm:flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-slate-700">نقطة البداية (الانطلاق)</span>
          </div>
          {resolved.stops.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-700">محطات توقف ({resolved.stops.length})</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span className="text-slate-700">نقطة النهاية (الوصول)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
