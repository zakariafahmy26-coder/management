import JSZip from 'jszip';
import { ZipArchiveEntry, ZipUploadResult, Vehicle, Driver, TripRoute, MaintenanceRecord, FuelRecord, VehicleDocument } from '../types';

export interface ParsedZipData {
  fileName: string;
  fileSize: number;
  totalFiles: number;
  uncompressedSize: number;
  entries: ZipArchiveEntry[];
  detectedType: 'fleet_backup' | 'documents_archive' | 'source_code' | 'mixed_archive';
  zipInstance: JSZip;
}

export interface ExtractedFleetData {
  vehicles?: Vehicle[];
  drivers?: Driver[];
  trips?: TripRoute[];
  maintenance?: MaintenanceRecord[];
  fuelRecords?: FuelRecord[];
  documents?: VehicleDocument[];
  rawSource?: string;
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileCategory(ext: string): 'image' | 'document' | 'data' | 'code' | 'other' {
  const lower = ext.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(lower)) return 'image';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(lower)) return 'document';
  if (['json', 'xlsx', 'xls', 'csv', 'sqlite', 'db', 'xml'].includes(lower)) return 'data';
  if (['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'py', 'sh', 'sql', 'yaml', 'yml'].includes(lower)) return 'code';
  return 'other';
}

/**
 * Inspect and parse a ZIP file in the browser using JSZip
 */
export async function parseZipFile(file: File): Promise<ParsedZipData> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const entries: ZipArchiveEntry[] = [];
  let uncompressedSize = 0;

  let codeCount = 0;
  let dataCount = 0;
  let docCount = 0;
  let imageCount = 0;

  const filePromises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    // Ignore macOS system files
    if (relativePath.includes('__MACOSX') || relativePath.endsWith('.DS_Store')) {
      return;
    }

    const isDir = zipEntry.dir;
    const name = relativePath.split('/').filter(Boolean).pop() || relativePath;
    const ext = isDir ? '' : name.split('.').pop()?.toLowerCase() || '';
    const category = isDir ? 'other' : getFileCategory(ext);

    if (!isDir) {
      if (category === 'code') codeCount++;
      if (category === 'data') dataCount++;
      if (category === 'document') docCount++;
      if (category === 'image') imageCount++;
    }

    const entry: ZipArchiveEntry = {
      path: relativePath,
      name,
      size: 0,
      isDirectory: isDir,
      date: zipEntry.date ? zipEntry.date.toISOString() : undefined,
      extension: ext,
      category,
    };

    entries.push(entry);
  });

  // Determine detected type
  let detectedType: 'fleet_backup' | 'documents_archive' | 'source_code' | 'mixed_archive' = 'mixed_archive';
  const hasFleetKeywords = entries.some((e) =>
    e.name.toLowerCase().includes('fleet') ||
    e.name.toLowerCase().includes('vehicle') ||
    e.name.toLowerCase().includes('driver') ||
    e.name.toLowerCase().includes('trip')
  );

  if (hasFleetKeywords || (dataCount > 0 && dataCount >= docCount && dataCount >= codeCount)) {
    detectedType = 'fleet_backup';
  } else if (docCount > 0 || imageCount > 0) {
    detectedType = 'documents_archive';
  } else if (codeCount > 3) {
    detectedType = 'source_code';
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    totalFiles: entries.filter((e) => !e.isDirectory).length,
    uncompressedSize,
    entries,
    detectedType,
    zipInstance: zip,
  };
}

/**
 * Extract an image or document from ZIP as a Data URL for instant in-browser preview
 */
export async function extractZipFileDataUrl(zip: JSZip, relativePath: string): Promise<string> {
  const file = zip.file(relativePath);
  if (!file) throw new Error(`الملف ${relativePath} غير موجود بالأرشيف`);

  const ext = relativePath.split('.').pop()?.toLowerCase() || '';
  let mime = 'application/octet-stream';
  if (['png'].includes(ext)) mime = 'image/png';
  if (['jpg', 'jpeg'].includes(ext)) mime = 'image/jpeg';
  if (['webp'].includes(ext)) mime = 'image/webp';
  if (['svg'].includes(ext)) mime = 'image/svg+xml';
  if (['pdf'].includes(ext)) mime = 'application/pdf';

  const base64 = await file.async('base64');
  return `data:${mime};base64,${base64}`;
}

/**
 * Extract a text or JSON file from ZIP
 */
export async function extractZipFileText(zip: JSZip, relativePath: string): Promise<string> {
  const file = zip.file(relativePath);
  if (!file) throw new Error(`الملف ${relativePath} غير موجود بالأرشيف`);
  return await file.async('text');
}

/**
 * Extract a file as a downloadable Blob
 */
export async function extractZipFileBlob(zip: JSZip, relativePath: string): Promise<Blob> {
  const file = zip.file(relativePath);
  if (!file) throw new Error(`الملف ${relativePath} غير موجود بالأرشيف`);
  return await file.async('blob');
}

/**
 * Attempt to parse fleet data backup if present in the ZIP
 */
export async function extractFleetBackupFromZip(zip: JSZip): Promise<ExtractedFleetData | null> {
  const result: ExtractedFleetData = {};
  let foundAny = false;

  // Check for combined fleet_backup.json
  const backupEntry = Object.keys(zip.files).find((p) => p.endsWith('fleet_backup.json') || p.endsWith('backup.json'));
  if (backupEntry) {
    try {
      const text = await zip.file(backupEntry)!.async('text');
      const parsed = JSON.parse(text);
      if (parsed.vehicles) { result.vehicles = parsed.vehicles; foundAny = true; }
      if (parsed.drivers) { result.drivers = parsed.drivers; foundAny = true; }
      if (parsed.trips) { result.trips = parsed.trips; foundAny = true; }
      if (parsed.maintenance) { result.maintenance = parsed.maintenance; foundAny = true; }
      if (parsed.fuelRecords) { result.fuelRecords = parsed.fuelRecords; foundAny = true; }
      if (parsed.documents || parsed.vehicleDocuments) {
        result.documents = parsed.documents || parsed.vehicleDocuments;
        foundAny = true;
      }
      result.rawSource = backupEntry;
    } catch (e) {
      console.warn('Failed parsing backup.json:', e);
    }
  }

  // Check for individual entity json files
  const vehicleFile = Object.keys(zip.files).find((p) => p.endsWith('vehicles.json'));
  if (vehicleFile && !result.vehicles) {
    try {
      const text = await zip.file(vehicleFile)!.async('text');
      const data = JSON.parse(text);
      if (Array.isArray(data)) { result.vehicles = data; foundAny = true; }
    } catch (e) {}
  }

  const driverFile = Object.keys(zip.files).find((p) => p.endsWith('drivers.json'));
  if (driverFile && !result.drivers) {
    try {
      const text = await zip.file(driverFile)!.async('text');
      const data = JSON.parse(text);
      if (Array.isArray(data)) { result.drivers = data; foundAny = true; }
    } catch (e) {}
  }

  const tripFile = Object.keys(zip.files).find((p) => p.endsWith('trips.json'));
  if (tripFile && !result.trips) {
    try {
      const text = await zip.file(tripFile)!.async('text');
      const data = JSON.parse(text);
      if (Array.isArray(data)) { result.trips = data; foundAny = true; }
    } catch (e) {}
  }

  const maintFile = Object.keys(zip.files).find((p) => p.endsWith('maintenance.json'));
  if (maintFile && !result.maintenance) {
    try {
      const text = await zip.file(maintFile)!.async('text');
      const data = JSON.parse(text);
      if (Array.isArray(data)) { result.maintenance = data; foundAny = true; }
    } catch (e) {}
  }

  return foundAny ? result : null;
}

/**
 * Upload a ZIP file to the server endpoint /api/upload-zip
 */
export async function uploadZipFileToServer(
  file: File,
  uploadType: 'source_code' | 'backup' | 'documents' | 'general' = 'general'
): Promise<ZipUploadResult> {
  const arrayBuffer = await file.arrayBuffer();

  const response = await fetch('/api/upload-zip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/zip',
      'x-file-name': encodeURIComponent(file.name),
      'x-upload-type': uploadType,
    },
    body: arrayBuffer,
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json?.error?.message || 'فشل رفع وحفظ ملف الـ ZIP على الخادم');
  }

  return json.data;
}

/**
 * Fetch list of previously uploaded zip files on the server
 */
export async function fetchServerZipArchives(): Promise<any[]> {
  try {
    const res = await fetch('/api/uploaded-zips');
    const json = await res.json();
    return json?.data?.archives || [];
  } catch (e) {
    return [];
  }
}
