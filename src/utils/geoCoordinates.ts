import { TripRoute } from '../types';

export interface LocationGeo {
  name: string;
  region: string;
  coords: [number, number]; // [lat, lng]
  isHub?: boolean;
}

// Known coordinates for key industrial, urban, and distribution spots
export const KNOWN_LOCATIONS: Record<string, [number, number]> = {
  // المصنع والمنطقة الصناعية
  'مصنع برج العرب': [30.9142, 29.6738],
  'مجمع مصانع برج العرب': [30.9142, 29.6738],
  'برج العرب': [30.9142, 29.6738],
  'مدينة برج العرب الجديدة': [30.8750, 29.5850],
  'المنطقة الصناعية الأولى': [30.9120, 29.6800],
  'المنطقة الصناعية الثالثة': [30.9080, 29.6600],
  'المنطقة الصناعية الرابعة': [30.9200, 29.6500],
  'برج العرب القديمة': [30.9320, 29.5380],

  // الإسكندرية
  'العامرية': [31.0250, 29.8000],
  'مجمع مخازن العامرية': [31.0280, 29.7950],
  'عبد القادر': [31.0550, 29.8250],
  'مرغم': [31.0800, 29.8350],
  'الدخيلة': [31.1350, 29.8150],
  'ميناء الدخيلة': [31.1380, 29.8180],
  'ميناء الإسكندرية': [31.1920, 29.8730],
  'وادي القمر': [31.1460, 29.8420],
  'المكس': [31.1550, 29.8520],
  'كرموز': [31.1820, 29.9010],
  'وكالة كرموز': [31.1810, 29.9030],
  'محرم بك': [31.1950, 29.9160],
  'العطارين': [31.1970, 29.9060],
  'المنشية': [31.2010, 29.8970],
  'سوق جملة المنشية': [31.2005, 29.8960],
  'بحري': [31.2130, 29.8820],
  'محطة الرمل': [31.2000, 29.9000],
  'الشاطبي': [31.2100, 29.9150],
  'سموحة': [31.2150, 29.9550],
  'فرع سموحة التجاري': [31.2160, 29.9540],
  'سيدي جابر': [31.2220, 29.9410],
  'رشدي': [31.2300, 29.9480],
  'كفر عبده': [31.2250, 29.9520],
  'لوران': [31.2450, 29.9720],
  'جليم': [31.2400, 29.9650],
  'سيدي بشر': [31.2650, 29.9920],
  'ميامي': [31.2720, 30.0050],
  'العصافرة': [31.2750, 30.0100],
  'المندرة': [31.2800, 30.0120],
  'المنتزه': [31.2880, 30.0180],
  'سوبر ماركت المنتزه': [31.2870, 30.0190],
  'المعمورة': [31.2950, 30.0300],
  'أبو قير': [31.3150, 30.0620],
  'العوايد': [31.2420, 30.0020],
  'السيوف': [31.2500, 29.9980],
  'العجمي': [31.1120, 29.7750],
  'البيطاش': [31.1200, 29.7850],
  'الهانوفيل': [31.1080, 29.7620],
  'أبو تلات': [31.0650, 29.7120],
  'سيدي كرير': [31.0350, 29.6150],
  'هايبر ماركت كرير': [31.0340, 29.6170],

  // الساحل الشمالي
  'الحمام': [30.8420, 29.3950],
  'موزع الحمام': [30.8410, 29.3940],
  'العلمين': [30.8350, 28.9550],
  'مدينة العلمين الجديدة': [30.8320, 28.9500],
  'فنادق العلمين الجديدة': [30.8340, 28.9520],
  'مارينا': [30.8250, 29.0100],
  'مارينا 4': [30.8260, 29.0080],
  'مارينا سنتر': [30.8240, 29.0120],
  'سيدي عبد الرحمن': [30.9650, 28.7200],
  'فنادق سيدي عبد الرحمن': [30.9660, 28.7180],
  'مراسي': [30.9700, 28.7100],
  'منتجعات مراسي': [30.9710, 28.7090],
  'الضبعة': [31.0350, 28.4350],
  'فوكة': [31.0850, 28.1250],
  'رأس الحكمة': [31.1150, 27.8500],
  'مرسى مطروح': [31.3540, 27.2370],
  'مطروح': [31.3540, 27.2370],

  // البحيرة
  'كفر الدوار': [31.1350, 30.1300],
  'مخزن كفر الدوار': [31.1340, 30.1280],
  'دمنهور': [31.0400, 30.4700],
  'سوق جملة دمنهور': [31.0380, 30.4720],
  'أبو المطامير': [30.9100, 30.1750],
  'فرع أبو المطامير': [30.9090, 30.1740],
  'حوش عيسى': [30.9000, 30.2900],
  'إيتاي البارود': [30.8900, 30.6650],
  'شبراخيت': [31.0300, 30.7200],
  'الدلنجات': [30.8300, 30.5400],
  'مستودع الدلنجات': [30.8290, 30.5390],
  'كوم حمادة': [30.7550, 30.6950],
  'وكالة كوم حمادة': [30.7540, 30.6940],
  'وادي النطرون': [30.4050, 30.3300],
  'مزارع وادي النطرون': [30.4020, 30.3280],
  'رشيد': [31.4000, 30.4200],
  'إدكو': [31.3050, 30.3000],
  'المحمودية': [31.1850, 30.5250],
  'الرحمانية': [31.1050, 30.6350],
};

// Popular factory destinations list for quick selection
export const POPULAR_LOCATIONS: { name: string; region: string }[] = [
  { name: 'مصنع برج العرب', region: 'برج العرب' },
  { name: 'مجمع مخازن العامرية', region: 'الإسكندرية' },
  { name: 'ميناء الدخيلة (رصيف الحاويات)', region: 'الإسكندرية' },
  { name: 'ميناء الإسكندرية البحري', region: 'الإسكندرية' },
  { name: 'وكالة كرموز', region: 'الإسكندرية' },
  { name: 'فرع سموحة التجاري', region: 'الإسكندرية' },
  { name: 'سوبر ماركت المنتزه', region: 'الإسكندرية' },
  { name: 'العجمي والهانوفيل', region: 'الإسكندرية' },
  { name: 'سيدي كرير والساحل', region: 'الساحل الشمالي' },
  { name: 'موزع الحمام', region: 'الساحل الشمالي' },
  { name: 'فنادق العلمين ومارينا', region: 'الساحل الشمالي' },
  { name: 'سيدي عبد الرحمن ومراسي', region: 'الساحل الشمالي' },
  { name: 'رأس الحكمة ومرسى مطروح', region: 'الساحل الشمالي' },
  { name: 'مخزن كفر الدوار', region: 'البحيرة' },
  { name: 'سوق جملة دمنهور', region: 'البحيرة' },
  { name: 'فرع أبو المطامير', region: 'البحيرة' },
  { name: 'حوش عيسى والدلنجات', region: 'البحيرة' },
  { name: 'مزارع وادي النطرون', region: 'البحيرة' },
];

/**
 * Searches and finds coordinates for a given location name.
 * Uses exact match, then sub-string inclusion, and regional fallback if needed.
 */
export function findLocationCoords(locationName: string, defaultRegion?: string): [number, number] {
  if (!locationName) {
    return [30.9142, 29.6738]; // Default Borg El Arab Factory
  }

  const cleanName = locationName.trim();

  // 1. Direct match
  if (KNOWN_LOCATIONS[cleanName]) {
    return KNOWN_LOCATIONS[cleanName];
  }

  // 2. Keyword check in keys
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return coords;
    }
  }

  // 3. Normalized check
  const normalized = cleanName
    .replace(/^مصنع\s+/, '')
    .replace(/^مخزن\s+/, '')
    .replace(/^سوق\s+/, '')
    .replace(/^فرع\s+/, '')
    .replace(/^وكالة\s+/, '')
    .replace(/^هايبر\s+/, '')
    .replace(/^فنادق\s+/, '')
    .replace(/^مدينة\s+/, '');

  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return coords;
    }
  }

  // 4. Region-based fallback
  if (defaultRegion?.includes('الساحل') || cleanName.includes('ساحل') || cleanName.includes('مطروح')) {
    return [30.8350, 28.9550]; // Alamein
  }
  if (defaultRegion?.includes('البحيرة') || cleanName.includes('بحيرة') || cleanName.includes('دمنهور')) {
    return [31.0400, 30.4700]; // Damanhour
  }
  if (defaultRegion?.includes('الإسكندرية') || cleanName.includes('إسكندرية')) {
    return [31.2000, 29.9150]; // Alex Center
  }

  // Default factory location
  return [30.9142, 29.6738];
}

export interface ResolvedTripRoute {
  startName: string;
  startCoords: [number, number];
  destinationName: string;
  destinationCoords: [number, number];
  stops: { name: string; coords: [number, number] }[];
  routePath: [number, number][]; // all points including intermediate interpolated waypoints
  distanceEstimatedKm: number;
}

/**
 * Extracts and resolves start, destination, stops, and smooth path for any TripRoute
 */
export function resolveTripCoordinates(trip: TripRoute): ResolvedTripRoute {
  // 1. Resolve Start Point
  let startName = trip.startLocation?.trim() || '';
  let destinationName = trip.destination?.trim() || '';
  const stopsNames: string[] = [];

  // Parse from routeName if not explicitly set
  // e.g. "مصنع برج العرب -> العامرية -> كرموز -> سموحة -> المنتزه"
  if (!startName || !destinationName) {
    const routeParts = (trip.routeName || '')
      .split(/->|→|—|-/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (routeParts.length >= 2) {
      if (!startName) startName = routeParts[0];
      if (!destinationName) destinationName = routeParts[routeParts.length - 1];

      // Any middle parts are stops
      for (let i = 1; i < routeParts.length - 1; i++) {
        stopsNames.push(routeParts[i]);
      }
    } else if (routeParts.length === 1) {
      if (!startName) startName = 'مصنع برج العرب';
      if (!destinationName) destinationName = routeParts[0];
    }
  }

  if (!startName) startName = 'مصنع برج العرب';
  if (!destinationName) destinationName = trip.destinationStops?.[0] || 'الإسكندرية';

  // Merge extra destination stops if provided
  if (trip.destinationStops && trip.destinationStops.length > 0) {
    trip.destinationStops.forEach((stop) => {
      const clean = stop.trim();
      if (
        clean &&
        clean !== startName &&
        clean !== destinationName &&
        !stopsNames.includes(clean)
      ) {
        stopsNames.push(clean);
      }
    });
  }

  const startCoords: [number, number] = trip.startCoords || findLocationCoords(startName, trip.region);
  const destinationCoords: [number, number] = trip.endCoords || findLocationCoords(destinationName, trip.region);

  const stops = stopsNames.slice(0, 5).map((name) => ({
    name,
    coords: findLocationCoords(name, trip.region),
  }));

  // Build the complete path sequence
  const waypoints: [number, number][] = [startCoords, ...stops.map((s) => s.coords), destinationCoords];

  // Interpolate route segments with realistic road curvature
  const routePath: [number, number][] = generateCurvedRoute(waypoints);

  return {
    startName,
    startCoords,
    destinationName,
    destinationCoords,
    stops,
    routePath,
    distanceEstimatedKm: trip.distanceKm || calculateTotalDistance(waypoints),
  };
}

/**
 * Creates realistic curved highway polylines between waypoints
 */
function generateCurvedRoute(points: [number, number][]): [number, number][] {
  if (points.length <= 1) return points;

  const result: [number, number][] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    result.push(p1);

    // If points are fairly far, insert 2-3 gentle intermediate curve points
    const latDiff = p2[0] - p1[0];
    const lngDiff = p2[1] - p1[1];
    const distApprox = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    if (distApprox > 0.05) {
      // Deterministic offset to simulate road curvature
      const steps = Math.min(5, Math.max(2, Math.floor(distApprox * 25)));
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        // Linear interpolation
        let lat = p1[0] + latDiff * t;
        let lng = p1[1] + lngDiff * t;

        // Subtle sine curve deviation simulating actual road bends
        const curve = Math.sin(t * Math.PI) * 0.008;
        lat += curve * (i % 2 === 0 ? 1 : -1);
        lng += curve * (i % 2 === 0 ? -0.7 : 0.7);

        result.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
      }
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Calculates straight line distance in km
 */
function calculateTotalDistance(coords: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineKm(coords[i], coords[i + 1]);
  }
  return Math.round(total * 1.25); // Road winding multiplier
}

function haversineKm(c1: [number, number], c2: [number, number]): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const dLng = ((c2[1] - c1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1[0] * Math.PI) / 180) *
      Math.cos((c2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
