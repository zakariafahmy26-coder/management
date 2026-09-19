import * as XLSX from 'xlsx';
import {
  Driver,
  FuelRecord,
  LocationPlace,
  MaintenanceRecord,
  MonthlyReportSummary,
  Region,
  TripRoute,
  Vehicle,
} from '../types';
import { calculateFleetAlerts } from '../utils/alertEngine';

export interface GoogleSheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

// Utility: Auto-calculate optimal column widths for SheetJS
function calculateColumnWidths(aoa: any[][]): { wch: number }[] {
  if (!aoa || aoa.length === 0) return [];
  const maxCols = Math.max(...aoa.map((row) => row.length));
  const widths: number[] = [];

  for (let c = 0; c < maxCols; c++) {
    let maxLen = 10;
    for (let r = 0; r < aoa.length; r++) {
      const val = aoa[r]?.[c];
      if (val !== undefined && val !== null) {
        const str = String(val);
        // Estimate character display width (Arabic characters are wide)
        let displayLen = 0;
        for (let i = 0; i < str.length; i++) {
          const code = str.charCodeAt(i);
          displayLen += code > 127 ? 1.4 : 1;
        }
        if (displayLen > maxLen) maxLen = displayLen;
      }
    }
    // Cap at reasonable width
    const optimalWidth = Math.min(Math.max(Math.ceil(maxLen) + 3, 14), 55);
    widths.push(optimalWidth);
  }

  return widths.map((w) => ({ wch: w }));
}

// Configure RTL on SheetJS worksheet and workbook
function applyRtlToWorksheet(ws: XLSX.WorkSheet) {
  ws['!views'] = [{ rightToLeft: true }];
}

export async function createAndPopulateGoogleSheet(
  accessToken: string,
  trips: TripRoute[],
  vehicles: Vehicle[],
  drivers: Driver[],
  maintenanceList: MaintenanceRecord[],
  report: MonthlyReportSummary,
  fuelRecords: FuelRecord[] = [],
  locations: LocationPlace[] = []
): Promise<GoogleSheetsExportResult> {
  const driverMap = new Map(drivers.map((d) => [d.id, d.name]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, `${v.plateNumber} (${v.model})`]));
  const alerts = calculateFleetAlerts(vehicles, drivers);
  const alertMap = new Map(alerts.map((a) => [a.vehicleId, `${a.title} - ${a.metric}`]));

  const nowStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  // 1. Create spreadsheet with all 7 interconnected tabs
  const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `مصنع الأمل - إدارة خطوط السير والأسطول اللوجستي (${nowStr})`,
        locale: 'ar_EG',
      },
      sheets: [
        { properties: { sheetId: 0, title: 'التقرير التنفيذي والمصروفات', rightToLeft: true } },
        { properties: { sheetId: 1, title: 'خطوط السير والرحلات', rightToLeft: true } },
        { properties: { sheetId: 2, title: 'أسطول السيارات', rightToLeft: true } },
        { properties: { sheetId: 3, title: 'سجل السائقين', rightToLeft: true } },
        { properties: { sheetId: 4, title: 'سجل استهلاك الوقود', rightToLeft: true } },
        { properties: { sheetId: 5, title: 'الصيانة وتغيير الزيت', rightToLeft: true } },
        { properties: { sheetId: 6, title: 'المواقع ومخازن المصنع', rightToLeft: true } },
      ],
    }),
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    throw new Error(`فشل إنشاء شيت Google Sheets: ${createResp.status} - ${errText}`);
  }

  const sheetData = await createResp.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare Data for Each Sheet

  // Sheet 1: Trips
  const tripsHeader = [
    'كود الرحلة',
    'التاريخ',
    'المنطقة الجغرافية',
    'اسم خط السير',
    'نقطة الانطلاق',
    'المقصد النهائي',
    'السيارة واللوحة',
    'السائق المسؤول',
    'عداد البداية (كم)',
    'عداد النهاية (كم)',
    'المسافة المقطوعة (كم)',
    'لترات الوقود',
    'سعر اللتر (ج.م)',
    'إجمالي الوقود (ج.م)',
    'الكارتات والبوابات (ج.م)',
    'إكراميات ومصاريف (ج.م)',
    'إجمالي تكلفة الرحلة (ج.م)',
    'حالة الرحلة',
    'طبيعة الحمولة',
    'الملاحظات',
  ];

  let totalTripDistance = 0;
  let totalTripFuelLiters = 0;
  let totalTripFuelCost = 0;
  let totalTripTolls = 0;
  let totalTripOtherExp = 0;
  let totalTripGrandCost = 0;

  const tripsRows = trips.map((t) => {
    totalTripDistance += t.distanceKm || 0;
    totalTripFuelLiters += t.fuelLiters || 0;
    totalTripFuelCost += t.fuelTotalCost || 0;
    totalTripTolls += t.tollTaxes || 0;
    totalTripOtherExp += t.otherExpenses || 0;
    totalTripGrandCost += t.tripCostTotal || 0;

    return [
      t.tripCode,
      t.date,
      t.region,
      t.routeName,
      t.startLocation || 'مصنع برج العرب',
      t.destination || (t.destinationStops?.join(' - ') || 'نقطة التوزيع'),
      vehicleMap.get(t.vehicleId) || t.vehicleId,
      driverMap.get(t.driverId) || t.driverId,
      t.startOdometer,
      t.endOdometer,
      t.distanceKm,
      t.fuelLiters,
      t.fuelPricePerLiter,
      t.fuelTotalCost,
      t.tollTaxes || 0,
      t.otherExpenses || 0,
      t.tripCostTotal,
      t.status,
      t.cargoType || 'بضائع مصنعة',
      t.notes || '',
    ];
  });

  const tripsSummaryRow = [
    'الإجمالي العام لأسطول المصنع',
    `عدد الرحلات: ${trips.length}`,
    '---',
    '---',
    '---',
    '---',
    '---',
    '---',
    '---',
    '---',
    totalTripDistance,
    totalTripFuelLiters,
    '---',
    totalTripFuelCost,
    totalTripTolls,
    totalTripOtherExp,
    totalTripGrandCost,
    '---',
    '---',
    `متوسط التكلفة/كم: ${totalTripDistance > 0 ? (totalTripGrandCost / totalTripDistance).toFixed(2) : '0'} ج.م`,
  ];

  // Sheet 2: Vehicles
  const vehiclesHeader = [
    'كود السيارة',
    'رقم اللوحة',
    'الطراز والنوع',
    'سنة الصنع',
    'نوع الوقود',
    'سعة الخزان (لتر)',
    'معدل الاستهلاك (لتر/100كم)',
    'قراءة العداد الحالية (كم)',
    'السائق المخصص',
    'الحالة التشغيلية',
    'تاريخ انتهاء رخصة التسيير',
    'عداد الصيانة القادم (كم)',
    'حالة الصيانة والتنبيهات',
    'الملاحظات',
  ];

  const vehiclesRows = vehicles.map((v) => [
    v.code,
    v.plateNumber,
    v.model,
    v.year,
    v.fuelType,
    v.tankCapacity,
    v.avgConsumptionPer100Km,
    v.currentOdometer,
    v.assignedDriverId ? driverMap.get(v.assignedDriverId) || v.assignedDriverId : 'غير مخصص',
    v.status,
    v.licenseExpiryDate,
    v.nextOilChangeKm,
    alertMap.get(v.id) || 'سليمة وجاهزة للعمل',
    v.notes || '',
  ]);

  // Sheet 3: Drivers
  const driversHeader = [
    'كود السائق',
    'الاسم بالكامل',
    'رقم الهاتف',
    'الرقم القومي',
    'درجة الرخصة',
    'تاريخ انتهاء الرخصة',
    'حالة السائق',
    'السيارة المخصصة',
    'التقييم المهني (من 5)',
    'الملاحظات',
  ];

  const driversRows = drivers.map((d) => [
    d.code,
    d.name,
    d.phone,
    d.nationalId,
    d.licenseDegree,
    d.licenseExpiryDate,
    d.status,
    d.assignedVehicleId ? vehicleMap.get(d.assignedVehicleId) || d.assignedVehicleId : 'متاح لجميع السيارات',
    d.rating,
    d.notes || '',
  ]);

  // Sheet 4: Fuel Records
  const fuelHeader = [
    'كود السجل',
    'التاريخ',
    'السيارة واللوحة',
    'السائق المسؤول',
    'محطة التموين',
    'الكمية المعبأة (لتر)',
    'سعر اللتر (ج.م)',
    'التكلفة الإجمالية (ج.م)',
    'قراءة العداد عند التموين (كم)',
    'الملاحظات',
  ];

  let totalFuelQty = 0;
  let totalFuelExpense = 0;

  const fuelRows = fuelRecords.map((f, idx) => {
    totalFuelQty += f.quantity || 0;
    totalFuelExpense += f.totalCost || 0;
    return [
      `F-${String(idx + 1).padStart(4, '0')}`,
      f.date,
      vehicleMap.get(f.vehicleId) || f.vehicleId,
      f.driverId ? driverMap.get(f.driverId) || f.driverId : 'سائق الرحلة',
      f.station,
      f.quantity,
      f.price,
      f.totalCost,
      f.odometer || '---',
      f.notes || '',
    ];
  });

  const fuelSummaryRow = [
    'الإجمالي العام للوقود',
    `سجلات: ${fuelRecords.length}`,
    '---',
    '---',
    '---',
    totalFuelQty,
    '---',
    totalFuelExpense,
    '---',
    `متوسط سعر اللتر: ${totalFuelQty > 0 ? (totalFuelExpense / totalFuelQty).toFixed(2) : '0'} ج.م`,
  ];

  // Sheet 5: Maintenance
  const maintHeader = [
    'كود الصيانة',
    'السيارة واللوحة',
    'نوع الصيانة',
    'التاريخ',
    'عداد الصيانة (كم)',
    'العداد القادم المستهدف (كم)',
    'التكلفة الإجمالية (ج.م)',
    'ورشة الصيانة / التوكيل',
    'رقم الفاتورة',
    'الحالة',
    'الملاحظات والتفاصيل',
  ];

  let totalMaintCost = 0;
  const maintRows = maintenanceList.map((m) => {
    totalMaintCost += m.cost || 0;
    return [
      m.recordCode,
      vehicleMap.get(m.vehicleId) || m.vehicleId,
      m.maintenanceType,
      m.date,
      m.odometerAtService,
      m.nextDueOdometer,
      m.cost,
      m.workshopName,
      m.invoiceNumber || '---',
      m.status,
      m.notes || '',
    ];
  });

  const maintSummaryRow = [
    'إجمالي مصروفات الصيانة',
    `عدد العمليات: ${maintenanceList.length}`,
    '---',
    '---',
    '---',
    '---',
    totalMaintCost,
    '---',
    '---',
    '---',
    '---',
  ];

  // Sheet 6: Locations
  const locationsHeader = [
    'كود المكان',
    'اسم الموقع / المستودع',
    'القطاع الجغرافي',
    'التصنيف اللوجستي',
    'العنوان والملاحظات',
    'الحالة',
  ];

  const locationsRows = locations.map((loc) => [
    loc.code,
    loc.name,
    loc.region,
    loc.category,
    loc.address || loc.notes || '---',
    loc.status || 'نشط',
  ]);

  // Sheet 0: Executive Summary
  const reportHeader = ['المؤشر التشغيلي / البند المالي', 'القيمة المحاسبية', 'وحدة القياس', 'ملاحظات الأداء'];
  const reportSummaryRows = [
    ['الفترة المحاسبية للتقرير', report.monthYear === 'all' ? 'كافة الفترات التراكمية' : report.monthYear, 'فترة زمنية', 'معتمد من نظام إدارة الأسطول'],
    ['إجمالي عدد الرحلات المنفذة', report.totalTrips, 'رحلة', 'تشمل رحلات التوزيع والشحن الداخلي'],
    ['إجمالي الكيلومترات المقطوعة لأسطول المصنع', report.totalDistanceKm.toLocaleString(), 'كيلومتر', 'محسوبة بدقة من عدادات الشاحنات'],
    ['إجمالي كمية الوقود المستهلكة', report.totalFuelLiters.toLocaleString(), 'لتر', 'سولار / بنزين 92 / بنزين 95'],
    ['إجمالي تكلفة استهلاك الوقود', report.totalFuelCost.toLocaleString(), 'جنيه مصري', 'شامل تموينات الخطوط والمحطات المعتمدة'],
    ['إجمالي تكلفة الصيانات وتغيير الزيوت', report.totalMaintenanceCost.toLocaleString(), 'جنيه مصري', 'صيانات دورية وفلاتر وإطارات وتوكيلات'],
    ['إجمالي كارتات الطرق والبوابات والخدمات', report.totalTollAndOtherCost.toLocaleString(), 'جنيه مصري', 'بوابات طريق الساحل والإسكندرية والبحيرة'],
    ['إجمالي المصروفات التشغيلية الشاملة', report.grandTotalCost.toLocaleString(), 'جنيه مصري', 'التكلفة الإجمالية المجمعة لأسطول المصنع'],
    ['متوسط التكلفة التشغيلية لكل 1 كم', report.avgCostPerKm.toFixed(2), 'جنيه/كم', 'مؤشر الكفاءة الاقتصادية لحركة الأسطول'],
    ['تاريخ ووقت استخراج التقرير', `${nowStr} - ${timeStr}`, 'توقيت مصر', 'تمت المزامنة آلياً عبر Google Sheets API'],
    ['', '', '', ''],
    ['--- التوزيع الجغرافي للمصروفات والرحلات ---', '', '', ''],
    ['المنطقة الجغرافية', 'عدد الرحلات', 'المسافة الإجمالية (كم)', 'إجمالي التكلفة التشغيلية (ج.م)'],
    ...report.regionBreakdown.map((r) => [
      r.region,
      r.tripCount,
      `${r.totalDistanceKm.toLocaleString()} كم`,
      `${r.totalCost.toLocaleString()} ج.م (متوسط ${r.avgCostPerKm.toFixed(2)} ج/كم)`,
    ]),
    ['', '', '', ''],
    ['--- تحليل تشغيل وتكاليف شاحنات وسيارات الأسطول ---', '', '', ''],
    ['السيارة واللوحة', 'المسافة المقطوعة (كم)', 'تكلفة الوقود (ج.م)', 'تكلفة الصيانة (ج.م) | الإجمالي (ج.م)'],
    ...report.vehicleBreakdown.map((v) => [
      `${v.plateNumber} (${v.model})`,
      `${v.totalKm.toLocaleString()} كم`,
      `${v.fuelCost.toLocaleString()} ج.م`,
      `صيانة: ${v.maintenanceCost.toLocaleString()} ج.م | الإجمالي: ${v.totalCost.toLocaleString()} ج.م`,
    ]),
  ];

  // 3. Batch update values to Google Sheets
  const updateResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: "'التقرير التنفيذي والمصروفات'!A1",
          values: [reportHeader, ...reportSummaryRows],
        },
        {
          range: "'خطوط السير والرحلات'!A1",
          values: [tripsHeader, ...tripsRows, tripsSummaryRow],
        },
        {
          range: "'أسطول السيارات'!A1",
          values: [vehiclesHeader, ...vehiclesRows],
        },
        {
          range: "'سجل السائقين'!A1",
          values: [driversHeader, ...driversRows],
        },
        {
          range: "'سجل استهلاك الوقود'!A1",
          values: [fuelHeader, ...fuelRows, fuelSummaryRow],
        },
        {
          range: "'الصيانة وتغيير الزيت'!A1",
          values: [maintHeader, ...maintRows, maintSummaryRow],
        },
        {
          range: "'المواقع ومخازن المصنع'!A1",
          values: [locationsHeader, ...locationsRows],
        },
      ],
    }),
  });

  if (!updateResp.ok) {
    const err = await updateResp.text();
    console.error('Failed to populate Google Sheets rows:', err);
  }

  // 4. Freeze header rows and apply professional header styling
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [0, 1, 2, 3, 4, 5, 6].map((sheetId) => ({
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        })),
      }),
    });
  } catch (err) {
    console.warn('Could not freeze Google Sheets header rows:', err);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
  };
}

// ---------------------------------------------------------------------------
// Local Excel (.xlsx) Export with Professional Styling, RTL, & Columns
// ---------------------------------------------------------------------------
export function exportToLocalExcelWorkbook(
  trips: TripRoute[],
  vehicles: Vehicle[],
  drivers: Driver[],
  maintenanceList: MaintenanceRecord[],
  report: MonthlyReportSummary,
  fuelRecords: FuelRecord[] = [],
  locations: LocationPlace[] = []
) {
  const driverMap = new Map(drivers.map((d) => [d.id, d.name]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, `${v.plateNumber} (${v.model})`]));
  const alerts = calculateFleetAlerts(vehicles, drivers);
  const alertMap = new Map(alerts.map((a) => [a.vehicleId, `${a.title} - ${a.metric}`]));

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const wb = XLSX.utils.book_new();

  // Set workbook RTL view
  if (!(wb as any).Workbook) (wb as any).Workbook = {};
  (wb as any).Workbook.Views = [{ RTL: true }];

  // -----------------------------------------------------------
  // 1. Executive Summary Sheet (التقرير التنفيذي والمؤشرات)
  // -----------------------------------------------------------
  const summaryAoa: any[][] = [
    ['مصنع الأمل للصناعات الغذائية والتوزيع - برج العرب'],
    ['إدارة النقل واللوجستيات والأسطول | التقرير التنفيذي والمصروفات المعتمدة'],
    [`تاريخ الاستخراج: ${dateStr} - ${timeStr}`, `الفترة: ${report.monthYear === 'all' ? 'كافة الفترات التراكمية' : report.monthYear}`, 'حالة البيانات: مكتملة وموثقة سحابياً'],
    [],
    ['المؤشر التشغيلي / البند المالي', 'القيمة المحاسبية', 'وحدة القياس', 'ملاحظات الأداء'],
    ['إجمالي عدد الرحلات المنفذة', report.totalTrips, 'رحلة', 'رحلات التوزيع والشحن'],
    ['إجمالي المسافة المقطوعة لأسطول المصنع', report.totalDistanceKm, 'كم', 'محسوبة من عدادات الشاحنات'],
    ['إجمالي استهلاك الوقود', report.totalFuelLiters, 'لتر', 'سولار وبنزين وغاز'],
    ['إجمالي تكلفة استهلاك الوقود', report.totalFuelCost, 'جنيه مصري', 'شامل التموين الميداني'],
    ['إجمالي تكلفة الصيانة وتغيير الزيوت', report.totalMaintenanceCost, 'جنيه مصري', 'زيوت وفلاتر وعمرات وإطارات'],
    ['إجمالي كارتات الطرق والبوابات والمصاريف', report.totalTollAndOtherCost, 'جنيه مصري', 'بوابات طريق الساحل والإسكندرية والبحيرة'],
    ['إجمالي المصروفات التشغيلية الشاملة', report.grandTotalCost, 'جنيه مصري', 'التكلفة الإجمالية الكاملة'],
    ['متوسط التكلفة التشغيلية لكل 1 كم', Number(report.avgCostPerKm.toFixed(2)), 'جنيه/كم', 'مؤشر كفاءة التشغيل'],
    [],
    ['--- تحليل المصروفات والرحلات حسب القطاع الجغرافي ---', '', '', ''],
    ['القطاع الجغرافي', 'عدد الرحلات', 'المسافة الإجمالية (كم)', 'إجمالي التكلفة (ج.م)'],
    ...report.regionBreakdown.map((r) => [
      r.region,
      r.tripCount,
      r.totalDistanceKm,
      r.totalCost,
    ]),
    [],
    ['--- تحليل استهلاك ومصروفات كل سيارة في الأسطول ---', '', '', ''],
    ['السيارة واللوحة', 'المسافة (كم)', 'تكلفة الوقود (ج.م)', 'تكلفة الصيانة (ج.م)', 'إجمالي المصروفات (ج.م)'],
    ...report.vehicleBreakdown.map((v) => [
      `${v.plateNumber} (${v.model})`,
      v.totalKm,
      v.fuelCost,
      v.maintenanceCost,
      v.totalCost,
    ]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = calculateColumnWidths(summaryAoa);
  applyRtlToWorksheet(wsSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'التقرير التنفيذي');

  // -----------------------------------------------------------
  // 2. Trips Sheet (خطوط السير والرحلات)
  // -----------------------------------------------------------
  let sumDistance = 0;
  let sumFuelLiters = 0;
  let sumFuelCost = 0;
  let sumTolls = 0;
  let sumOther = 0;
  let sumTotal = 0;

  const tripsData = [
    [
      'كود الرحلة',
      'التاريخ',
      'المنطقة',
      'خط السير',
      'نقطة البداية',
      'نقطة الوصول',
      'السيارة',
      'السائق',
      'عداد البداية (كم)',
      'عداد النهاية (كم)',
      'المسافة (كم)',
      'لترات الوقود',
      'سعر اللتر (ج.م)',
      'تكلفة الوقود (ج.م)',
      'كارتات وبوابات (ج.م)',
      'إكراميات ومصاريف (ج.م)',
      'إجمالي الرحلة (ج.م)',
      'الحالة',
      'الحمولة',
      'الملاحظات',
    ],
    ...trips.map((t) => {
      sumDistance += t.distanceKm || 0;
      sumFuelLiters += t.fuelLiters || 0;
      sumFuelCost += t.fuelTotalCost || 0;
      sumTolls += t.tollTaxes || 0;
      sumOther += t.otherExpenses || 0;
      sumTotal += t.tripCostTotal || 0;

      return [
        t.tripCode,
        t.date,
        t.region,
        t.routeName,
        t.startLocation || 'مصنع برج العرب',
        t.destination || 'محطة التوزيع',
        vehicleMap.get(t.vehicleId) || t.vehicleId,
        driverMap.get(t.driverId) || t.driverId,
        t.startOdometer,
        t.endOdometer,
        t.distanceKm,
        t.fuelLiters,
        t.fuelPricePerLiter,
        t.fuelTotalCost,
        t.tollTaxes || 0,
        t.otherExpenses || 0,
        t.tripCostTotal,
        t.status,
        t.cargoType || 'بضائع ومواد خام',
        t.notes || '',
      ];
    }),
    [
      'الإجمالي العام',
      `عدد الرحلات: ${trips.length}`,
      '---',
      '---',
      '---',
      '---',
      '---',
      '---',
      '---',
      '---',
      sumDistance,
      sumFuelLiters,
      '---',
      sumFuelCost,
      sumTolls,
      sumOther,
      sumTotal,
      '---',
      '---',
      `متوسط التكلفة/كم: ${sumDistance > 0 ? (sumTotal / sumDistance).toFixed(2) : 0} ج.م`,
    ],
  ];

  const wsTrips = XLSX.utils.aoa_to_sheet(tripsData);
  wsTrips['!cols'] = calculateColumnWidths(tripsData);
  applyRtlToWorksheet(wsTrips);
  XLSX.utils.book_append_sheet(wb, wsTrips, 'خطوط السير والرحلات');

  // -----------------------------------------------------------
  // 3. Vehicles Sheet (أسطول السيارات)
  // -----------------------------------------------------------
  let totalVehiclesKm = 0;
  let totalTankCap = 0;

  const vehiclesData = [
    [
      'كود السيارة',
      'رقم اللوحة',
      'الطراز والنوع',
      'سنة الصنع',
      'نوع الوقود',
      'سعة الخزان (لتر)',
      'معدل الاستهلاك (لتر/100كم)',
      'العداد الحالي (كم)',
      'السائق الافتراضي',
      'الحالة التشغيلية',
      'انتهاء الرخصة',
      'عداد الصيانة القادم (كم)',
      'المتبقي للصيانة (كم)',
      'تنبيهات الصيانة',
      'الملاحظات',
    ],
    ...vehicles.map((v) => {
      totalVehiclesKm += v.currentOdometer || 0;
      totalTankCap += v.tankCapacity || 0;
      const remainingKm = (v.nextOilChangeKm || 0) - (v.currentOdometer || 0);

      return [
        v.code,
        v.plateNumber,
        v.model,
        v.year,
        v.fuelType,
        v.tankCapacity,
        v.avgConsumptionPer100Km,
        v.currentOdometer,
        v.assignedDriverId ? driverMap.get(v.assignedDriverId) || v.assignedDriverId : 'غير مخصص',
        v.status,
        v.licenseExpiryDate,
        v.nextOilChangeKm,
        remainingKm,
        alertMap.get(v.id) || 'سليمة ولا توجد تنبيهات',
        v.notes || '',
      ];
    }),
    [
      'إجمالي الأسطول',
      `عدد السيارات: ${vehicles.length}`,
      '---',
      '---',
      '---',
      totalTankCap,
      '---',
      totalVehiclesKm,
      '---',
      '---',
      '---',
      '---',
      '---',
      '---',
      '---',
    ],
  ];

  const wsVehicles = XLSX.utils.aoa_to_sheet(vehiclesData);
  wsVehicles['!cols'] = calculateColumnWidths(vehiclesData);
  applyRtlToWorksheet(wsVehicles);
  XLSX.utils.book_append_sheet(wb, wsVehicles, 'أسطول السيارات');

  // -----------------------------------------------------------
  // 4. Drivers Sheet (سجل السائقين)
  // -----------------------------------------------------------
  const driversData = [
    [
      'كود السائق',
      'الاسم بالكامل',
      'رقم الهاتف',
      'الرقم القومي',
      'درجة الرخصة',
      'تاريخ انتهاء الرخصة',
      'الحالة المهنية',
      'السيارة المخصصة',
      'التقييم المهني (من 5)',
      'الملاحظات',
    ],
    ...drivers.map((d) => [
      d.code,
      d.name,
      d.phone,
      d.nationalId,
      d.licenseDegree,
      d.licenseExpiryDate,
      d.status,
      d.assignedVehicleId ? vehicleMap.get(d.assignedVehicleId) || d.assignedVehicleId : 'متاح لجميع السيارات',
      d.rating,
      d.notes || '',
    ]),
    [
      'إجمالي السائقين',
      `عدد السائقين: ${drivers.length}`,
      '---',
      '---',
      '---',
      '---',
      '---',
      '---',
      `متوسط التقييم: ${(drivers.reduce((s, d) => s + (d.rating || 5), 0) / (drivers.length || 1)).toFixed(1)}/5`,
      '---',
    ],
  ];

  const wsDrivers = XLSX.utils.aoa_to_sheet(driversData);
  wsDrivers['!cols'] = calculateColumnWidths(driversData);
  applyRtlToWorksheet(wsDrivers);
  XLSX.utils.book_append_sheet(wb, wsDrivers, 'سجل السائقين');

  // -----------------------------------------------------------
  // 5. Fuel Records Sheet (سجل الوقود)
  // -----------------------------------------------------------
  let sumFuelL = 0;
  let sumFuelCostTotal = 0;

  const fuelData = [
    [
      'كود الإيصال',
      'التاريخ',
      'السيارة واللوحة',
      'السائق',
      'محطة التموين',
      'الكمية المعبأة (لتر)',
      'سعر اللتر (ج.م)',
      'التكلفة الإجمالية (ج.م)',
      'عداد السيارة (كم)',
      'الملاحظات',
    ],
    ...fuelRecords.map((f, idx) => {
      sumFuelL += f.quantity || 0;
      sumFuelCostTotal += f.totalCost || 0;

      return [
        `REC-${String(idx + 1).padStart(4, '0')}`,
        f.date,
        vehicleMap.get(f.vehicleId) || f.vehicleId,
        f.driverId ? driverMap.get(f.driverId) || f.driverId : 'سائق الرحلة',
        f.station,
        f.quantity,
        f.price,
        f.totalCost,
        f.odometer || '---',
        f.notes || '',
      ];
    }),
    [
      'إجمالي الوقود المسجل',
      `عدد الإيصالات: ${fuelRecords.length}`,
      '---',
      '---',
      '---',
      sumFuelL,
      '---',
      sumFuelCostTotal,
      '---',
      `متوسط سعر اللتر: ${sumFuelL > 0 ? (sumFuelCostTotal / sumFuelL).toFixed(2) : 0} ج.م`,
    ],
  ];

  const wsFuel = XLSX.utils.aoa_to_sheet(fuelData);
  wsFuel['!cols'] = calculateColumnWidths(fuelData);
  applyRtlToWorksheet(wsFuel);
  XLSX.utils.book_append_sheet(wb, wsFuel, 'سجل استهلاك الوقود');

  // -----------------------------------------------------------
  // 6. Maintenance Sheet (الصيانة والزيوت)
  // -----------------------------------------------------------
  let sumMaintCostTotal = 0;

  const maintData = [
    [
      'كود الصيانة',
      'السيارة واللوحة',
      'نوع الصيانة',
      'التاريخ',
      'العداد عند الصيانة (كم)',
      'العداد القادم المستهدف (كم)',
      'التكلفة (ج.م)',
      'مركز الصيانة / الورشة',
      'رقم الفاتورة',
      'الحالة',
      'الملاحظات والتفاصيل',
    ],
    ...maintenanceList.map((m) => {
      sumMaintCostTotal += m.cost || 0;
      return [
        m.recordCode,
        vehicleMap.get(m.vehicleId) || m.vehicleId,
        m.maintenanceType,
        m.date,
        m.odometerAtService,
        m.nextDueOdometer,
        m.cost,
        m.workshopName,
        m.invoiceNumber || '---',
        m.status,
        m.notes || '',
      ];
    }),
    [
      'إجمالي الصيانة',
      `عدد العمليات: ${maintenanceList.length}`,
      '---',
      '---',
      '---',
      '---',
      sumMaintCostTotal,
      '---',
      '---',
      '---',
      '---',
    ],
  ];

  const wsMaint = XLSX.utils.aoa_to_sheet(maintData);
  wsMaint['!cols'] = calculateColumnWidths(maintData);
  applyRtlToWorksheet(wsMaint);
  XLSX.utils.book_append_sheet(wb, wsMaint, 'الصيانة وتغيير الزيت');

  // -----------------------------------------------------------
  // 7. Locations Sheet (المواقع ومستودعات المصنع)
  // -----------------------------------------------------------
  const locationsData = [
    [
      'كود الموقع',
      'اسم الموقع / المستودع',
      'القطاع الجغرافي',
      'التصنيف اللوجستي',
      'العنوان والملاحظات',
      'الحالة التشغيلية',
    ],
    ...locations.map((loc) => [
      loc.code,
      loc.name,
      loc.region,
      loc.category,
      loc.address || loc.notes || '---',
      loc.status || 'نشط',
    ]),
    [
      'إجمالي المواقع',
      `عدد المواقع والمستودعات: ${locations.length}`,
      '---',
      '---',
      '---',
      '---',
    ],
  ];

  const wsLocations = XLSX.utils.aoa_to_sheet(locationsData);
  wsLocations['!cols'] = calculateColumnWidths(locationsData);
  applyRtlToWorksheet(wsLocations);
  XLSX.utils.book_append_sheet(wb, wsLocations, 'المواقع ومخازن المصنع');

  // Write and download the formatted .xlsx workbook
  const fileName = `مصنف_أسطول_سيارات_المصنع_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ---------------------------------------------------------------------------
// Export Any Single Table with Custom Columns, Summary & RTL
// ---------------------------------------------------------------------------
export function exportSingleTableToXLSX(
  sheetName: string,
  fileNamePrefix: string,
  headers: string[],
  rows: (string | number)[][],
  summaryRow?: (string | number)[]
) {
  const wb = XLSX.utils.book_new();
  if (!(wb as any).Workbook) (wb as any).Workbook = {};
  (wb as any).Workbook.Views = [{ RTL: true }];

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const fullAoa: any[][] = [
    [`مصنع الأمل للصناعات الغذائية والتوزيع - ${sheetName}`],
    [`تاريخ التصدير: ${dateStr} - ${now.toLocaleTimeString('ar-EG')}`, `إجمالي السجلات: ${rows.length}`, 'نظام إدارة الأسطول المعتمد'],
    [],
    headers,
    ...rows,
  ];

  if (summaryRow) {
    fullAoa.push(summaryRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(fullAoa);
  ws['!cols'] = calculateColumnWidths(fullAoa);
  applyRtlToWorksheet(ws);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, `${fileNamePrefix}_${dateStr}.xlsx`);
}

// ---------------------------------------------------------------------------
// Helpers & State Wrappers
// ---------------------------------------------------------------------------
export function getSpreadsheetId(): string | null {
  return localStorage.getItem('fleet_google_sheet_id');
}

export function saveSpreadsheetId(id: string) {
  localStorage.setItem('fleet_google_sheet_id', id);
}

export async function syncFleetToGoogleSheets(
  data: {
    vehicles: Vehicle[];
    drivers: Driver[];
    trips: TripRoute[];
    maintenance: MaintenanceRecord[];
    fuelRecords?: FuelRecord[];
    locations?: LocationPlace[];
  },
  accessToken: string | null,
  _existingSpreadsheetId?: string | null
): Promise<GoogleSheetsExportResult> {
  if (!accessToken) {
    throw new Error('لم يتم العثور على رمز تسجيل دخول Google');
  }

  const trips = data.trips || [];
  const maintenance = data.maintenance || [];
  const fuelRecords = data.fuelRecords || [];
  const locations = data.locations || [];
  const vehicles = data.vehicles || [];
  const drivers = data.drivers || [];

  const totalTrips = trips.length;
  const totalDistanceKm = trips.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const totalFuelLiters = trips.reduce((s, t) => s + (t.fuelLiters || 0), 0);
  const totalFuelCost = trips.reduce((s, t) => s + (t.fuelTotalCost || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
  const totalTollAndOtherCost = trips.reduce(
    (s, t) => s + (t.tollTaxes || 0) + (t.otherExpenses || 0),
    0
  );
  const grandTotalCost = totalFuelCost + totalMaintenanceCost + totalTollAndOtherCost;
  const avgCostPerKm = totalDistanceKm > 0 ? grandTotalCost / totalDistanceKm : 0;

  // Regional Breakdown
  const regionNames: Region[] = [
    'الإسكندرية',
    'الساحل الشمالي',
    'البحيرة',
    'خط مشترك (إسكندرية - بحيرة)',
    'خط مشترك (إسكندرية - الساحل)',
  ];

  const regionBreakdown = regionNames
    .map((region) => {
      const regionTrips = trips.filter((t) => t.region === region);
      const tripCount = regionTrips.length;
      const distance = regionTrips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
      const fuel = regionTrips.reduce((sum, t) => sum + (t.fuelTotalCost || 0), 0);
      const tolls = regionTrips.reduce(
        (sum, t) => sum + (t.tollTaxes || 0) + (t.otherExpenses || 0),
        0
      );
      const totalCost = fuel + tolls;
      return {
        region,
        tripCount,
        totalDistanceKm: distance,
        fuelCost: fuel,
        tollCost: tolls,
        totalCost,
        avgCostPerKm: distance > 0 ? totalCost / distance : 0,
      };
    })
    .filter((r) => r.tripCount > 0);

  // Vehicle Breakdown
  const vehicleBreakdown = vehicles.map((v) => {
    const vTrips = trips.filter((t) => t.vehicleId === v.id);
    const vMaint = maintenance.filter((m) => m.vehicleId === v.id);
    const tripCount = vTrips.length;
    const totalKm = vTrips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
    const fuelLiters = vTrips.reduce((sum, t) => sum + (t.fuelLiters || 0), 0);
    const fuelCost = vTrips.reduce((sum, t) => sum + (t.fuelTotalCost || 0), 0);
    const tollsCost = vTrips.reduce(
      (sum, t) => sum + (t.tollTaxes || 0) + (t.otherExpenses || 0),
      0
    );
    const maintCost = vMaint.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalCost = fuelCost + maintCost + tollsCost;
    return {
      vehicleId: v.id,
      plateNumber: v.plateNumber,
      model: v.model,
      tripCount,
      totalKm,
      fuelLiters,
      fuelCost,
      maintenanceCost: maintCost,
      tollsCost,
      totalCost,
      costPerKm: totalKm > 0 ? totalCost / totalKm : 0,
    };
  });

  const report: MonthlyReportSummary = {
    monthYear: 'all',
    totalTrips,
    totalDistanceKm,
    totalFuelLiters,
    totalFuelCost,
    totalMaintenanceCost,
    totalTollAndOtherCost,
    grandTotalCost,
    avgCostPerKm,
    regionBreakdown,
    vehicleBreakdown,
  };

  const result = await createAndPopulateGoogleSheet(
    accessToken,
    trips,
    vehicles,
    drivers,
    maintenance,
    report,
    fuelRecords,
    locations
  );

  saveSpreadsheetId(result.spreadsheetId);
  return result;
}

export function exportFleetToXLSX(data: {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: TripRoute[];
  maintenance: MaintenanceRecord[];
  fuelRecords?: FuelRecord[];
  locations?: LocationPlace[];
}) {
  const trips = data.trips || [];
  const maintenance = data.maintenance || [];
  const fuelRecords = data.fuelRecords || [];
  const locations = data.locations || [];
  const vehicles = data.vehicles || [];
  const drivers = data.drivers || [];

  const totalTrips = trips.length;
  const totalDistanceKm = trips.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const totalFuelLiters = trips.reduce((s, t) => s + (t.fuelLiters || 0), 0);
  const totalFuelCost = trips.reduce((s, t) => s + (t.fuelTotalCost || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
  const totalTollAndOtherCost = trips.reduce(
    (s, t) => s + (t.tollTaxes || 0) + (t.otherExpenses || 0),
    0
  );
  const grandTotalCost = totalFuelCost + totalMaintenanceCost + totalTollAndOtherCost;
  const avgCostPerKm = totalDistanceKm > 0 ? grandTotalCost / totalDistanceKm : 0;

  const regionNames: Region[] = [
    'الإسكندرية',
    'الساحل الشمالي',
    'البحيرة',
    'خط مشترك (إسكندرية - بحيرة)',
    'خط مشترك (إسكندرية - الساحل)',
  ];

  const regionBreakdown = regionNames
    .map((region) => {
      const regionTrips = trips.filter((t) => t.region === region);
      const tripCount = regionTrips.length;
      const distance = regionTrips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
      const fuel = regionTrips.reduce((sum, t) => sum + (t.fuelTotalCost || 0), 0);
      const tolls = regionTrips.reduce(
        (sum, t) => sum + (t.tollTaxes || 0) + (t.otherExpenses || 0),
        0
      );
      const totalCost = fuel + tolls;
      return {
        region,
        tripCount,
        totalDistanceKm: distance,
        fuelCost: fuel,
        tollCost: tolls,
        totalCost,
        avgCostPerKm: distance > 0 ? totalCost / distance : 0,
      };
    })
    .filter((r) => r.tripCount > 0);

  const vehicleBreakdown = vehicles.map((v) => {
    const vTrips = trips.filter((t) => t.vehicleId === v.id);
    const vMaint = maintenance.filter((m) => m.vehicleId === v.id);
    const tripCount = vTrips.length;
    const totalKm = vTrips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
    const fuelLiters = vTrips.reduce((sum, t) => sum + (t.fuelLiters || 0), 0);
    const fuelCost = vTrips.reduce((sum, t) => sum + (t.fuelTotalCost || 0), 0);
    const tollsCost = vTrips.reduce(
      (sum, t) => sum + (t.tollTaxes || 0) + (t.otherExpenses || 0),
      0
    );
    const maintCost = vMaint.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalCost = fuelCost + maintCost + tollsCost;
    return {
      vehicleId: v.id,
      plateNumber: v.plateNumber,
      model: v.model,
      tripCount,
      totalKm,
      fuelLiters,
      fuelCost,
      maintenanceCost: maintCost,
      tollsCost,
      totalCost,
      costPerKm: totalKm > 0 ? totalCost / totalKm : 0,
    };
  });

  const report: MonthlyReportSummary = {
    monthYear: 'all',
    totalTrips,
    totalDistanceKm,
    totalFuelLiters,
    totalFuelCost,
    totalMaintenanceCost,
    totalTollAndOtherCost,
    grandTotalCost,
    avgCostPerKm,
    regionBreakdown,
    vehicleBreakdown,
  };

  exportToLocalExcelWorkbook(
    trips,
    vehicles,
    drivers,
    maintenance,
    report,
    fuelRecords,
    locations
  );
}


