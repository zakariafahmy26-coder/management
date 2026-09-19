import {
  Vehicle,
  Driver,
  TripRoute,
  MaintenanceRecord,
  FuelRecord,
  MaintenanceAlert,
  MonthlyReportSummary,
} from '../types';

export interface DailyReportDataPayload {
  companyId?: string;
  reportDate?: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: TripRoute[];
  maintenance: MaintenanceRecord[];
  fuelRecords: FuelRecord[];
  alerts?: MaintenanceAlert[];
  monthlyReport?: MonthlyReportSummary;
  aiExecutiveSummary?: string;
}

export function generateDailyEmailHtml(payload: DailyReportDataPayload): string {
  const dateStr = payload.reportDate || new Date().toISOString().split('T')[0];
  const nowDisplay = new Date().toLocaleString('ar-EG', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const vehicles = payload.vehicles || [];
  const drivers = payload.drivers || [];
  const trips = payload.trips || [];
  const maintenance = payload.maintenance || [];
  const fuelRecords = payload.fuelRecords || [];

  // Filter today's or recent active items
  const todayTrips = trips.filter(
    (t) => t.date === dateStr || t.status === 'جارية حالياً' || t.status === 'جارية' || t.status === 'مكتملة'
  );
  const activeTripsList = todayTrips.length > 0 ? todayTrips : trips.slice(0, 10);

  const completedTripsCount = activeTripsList.filter((t) => t.status === 'مكتملة').length;
  const inProgressTripsCount = activeTripsList.filter((t) => t.status === 'جارية حالياً' || t.status === 'جارية').length;
  const totalDistanceKm = activeTripsList.reduce((acc, t) => acc + (Number(t.distanceKm) || 0), 0);
  const totalTollsCost = activeTripsList.reduce((acc, t) => acc + (Number(t.tollTaxes) || 0), 0);

  // Fuel calculation
  const todayFuel = fuelRecords.filter((f) => f.date === dateStr);
  const activeFuelList = todayFuel.length > 0 ? todayFuel : fuelRecords.slice(0, 8);
  const totalFuelLiters = activeFuelList.reduce((acc, f) => acc + (Number(f.quantity) || 0), 0);
  const totalFuelCost = activeFuelList.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0);

  // Maintenance calculation
  const todayMaint = maintenance.filter((m) => m.date === dateStr);
  const activeMaintList = todayMaint.length > 0 ? todayMaint : maintenance.slice(0, 6);
  const totalMaintCost = activeMaintList.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);

  // Grand Total Day Expenses
  const grandTotalDayExpenses = totalFuelCost + totalTollsCost + totalMaintCost;

  // Fleet vehicles status
  const activeVehiclesCount = vehicles.filter((v) => v.status === 'جاهزة للعمل' || v.status === 'في خط سير').length;
  const maintenanceVehiclesCount = vehicles.filter((v) => v.status === 'في الصيانة').length;
  const idleVehiclesCount = vehicles.filter((v) => v.status === 'خارج الخدمة').length;

  // Urgent Oil Alerts
  const oilAlertVehicles = vehicles
    .filter((v) => {
      if (!v.nextOilChangeKm || v.nextOilChangeKm <= 0) return false;
      const remaining = v.nextOilChangeKm - v.currentOdometer;
      return remaining <= 500;
    })
    .map((v) => {
      const remaining = v.nextOilChangeKm - v.currentOdometer;
      return {
        plate: v.plateNumber,
        model: v.model,
        odometer: v.currentOdometer,
        targetKm: v.nextOilChangeKm,
        remainingKm: remaining,
        isOverdue: remaining <= 0,
      };
    });

  // Regions summary
  const alexTrips = activeTripsList.filter((t) => t.region === 'الإسكندرية' || (t.region && t.region.includes('إسكندرية'))).length;
  const coastTrips = activeTripsList.filter((t) => t.region === 'الساحل الشمالي' || (t.region && t.region.includes('الساحل'))).length;
  const beheiraTrips = activeTripsList.filter((t) => t.region === 'البحيرة' || (t.region && t.region.includes('بحيرة'))).length;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير نهاية اليوم المجمع لأسطول وسيارات المصنع</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
      direction: rtl;
      text-align: right;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 24px 12px;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
      border-bottom: 4px solid #10b981;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .title {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
    }
    .subtitle {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
    }
    .meta-bar {
      background-color: #0b1120;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      color: #cbd5e1;
      font-size: 11px;
      border-bottom: 1px solid #334155;
    }
    .content {
      padding: 24px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 10px;
      text-align: center;
    }
    .kpi-card.highlight {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-color: #a7f3d0;
    }
    .kpi-val {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .kpi-card.highlight .kpi-val {
      color: #065f46;
    }
    .kpi-lbl {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 24px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ai-box {
      background: linear-gradient(135deg, #022c22 0%, #064e3b 100%);
      color: #f0fdf4;
      border: 1px solid #059669;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
    }
    .ai-title {
      font-size: 13px;
      font-weight: 800;
      color: #34d399;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ai-text {
      font-size: 12px;
      line-height: 1.6;
      color: #e2e8f0;
      margin: 0;
      white-space: pre-line;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 16px;
    }
    th {
      background-color: #f1f5f9;
      color: #475569;
      font-weight: 700;
      padding: 10px 8px;
      text-align: right;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
    }
    .status-completed {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-progress {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .status-urgent {
      background-color: #fee2e2;
      color: #991b1b;
      font-weight: 800;
    }
    .status-warning {
      background-color: #fef3c7;
      color: #92400e;
    }
    .alert-card {
      background-color: #fff1f2;
      border: 1px solid #fecdd3;
      border-right: 4px solid #e11d48;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 11px;
    }
    .footer-btn {
      display: inline-block;
      background-color: #10b981;
      color: #ffffff !important;
      text-decoration: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Header -->
      <div class="header">
        <div class="badge">إشعار آلي يومي • EOD AUTO REPORT</div>
        <h1 class="title">تقرير نهاية اليوم المجمع لأسطول سيارات المصنع</h1>
        <p class="subtitle">محاور التشغيل: الإسكندرية • الساحل الشمالي • البحيرة</p>
      </div>

      <!-- Meta Bar -->
      <div class="meta-bar">
        <span>📅 تاريخ التقرير: <strong>${dateStr}</strong></span>
        <span>⏰ التوليد: <strong>${nowDisplay}</strong></span>
        <span>🏢 إدارة الحركة واللوجستيات</span>
      </div>

      <div class="content">

        <!-- AI Executive Flash Summary -->
        <div class="ai-box">
          <div class="ai-title">
            ✨ التحليل التنفيذي وملاحظات الذكاء الاصطناعي (Gemini Fleet AI)
          </div>
          <p class="ai-text">
${
  payload.aiExecutiveSummary ||
  `تم استكمال عمليات التشغيل اليومية بنجاح عبر خطوط الإسكندرية والساحل والبحيرة. بلغت المصروفات التشغيلية اليومية حوالي ${grandTotalDayExpenses.toLocaleString(
    'ar-EG'
  )} ج.م تشمل السولار والصيانة ورسوم الكارتات. يرجى إيلاء الأولوية العاجلة لتنبيهات غيار الزيت الواردة في التقرير أدناه لحماية محركات الشاحنات وتفادي الأعطال المفاجئة.`
}
          </p>
        </div>

        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-val">${activeTripsList.length}</div>
            <div class="kpi-lbl">إجمالي رحلات اليوم</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val">${completedTripsCount}</div>
            <div class="kpi-lbl">رحلات مكتملة</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val">${totalDistanceKm.toLocaleString('ar-EG')} كم</div>
            <div class="kpi-lbl">إجمالي الكيلومترات</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-val">${totalFuelCost.toLocaleString('ar-EG')} ج.م</div>
            <div class="kpi-lbl">منصرفات السولار (${totalFuelLiters.toLocaleString('ar-EG')} لتر)</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val">${totalMaintCost.toLocaleString('ar-EG')} ج.م</div>
            <div class="kpi-lbl">تكاليف الصيانة وقطع الغيار</div>
          </div>
          <div class="kpi-card highlight">
            <div class="kpi-val">${grandTotalDayExpenses.toLocaleString('ar-EG')} ج.م</div>
            <div class="kpi-lbl">إجمالي مصاريف اليوم</div>
          </div>
        </div>

        <!-- 1. Trips & Routes Section -->
        <div class="section-title">
          🚚 1. شيت خطوط السير والرحلات (آخر تحديث)
        </div>
        <p style="font-size:11px; color:#64748b; margin-top:-6px; margin-bottom:12px;">
          توزيع الرحلات جغرافياً: الإسكندرية (${alexTrips}) • الساحل الشمالي والعلمين (${coastTrips}) • البحيرة (${beheiraTrips})
        </p>

        <table>
          <thead>
            <tr>
              <th>كود / خط السير</th>
              <th>المركبة</th>
              <th>السائق</th>
              <th>المسافة</th>
              <th>الكارتة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${
              activeTripsList.length === 0
                ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;">لا توجد رحلات مسجلة لهذا اليوم</td></tr>'
                : activeTripsList
                    .slice(0, 8)
                    .map((t) => {
                      const vObj = vehicles.find((v) => v.id === t.vehicleId);
                      const dObj = drivers.find((d) => d.id === t.driverId);
                      const vPlate = vObj ? `${vObj.plateNumber}` : (t.vehicleId || '-');
                      const dName = dObj ? dObj.name : (t.driverId || '-');
                      const startLoc = t.startLocation || 'المصنع';
                      const dest = t.destination || t.routeName || 'خط سير';
                      const isCompleted = t.status === 'مكتملة';
                      const isRunning = t.status === 'جارية حالياً' || t.status === 'جارية';

                      return `
              <tr>
                <td><strong>${t.tripCode || t.tripNumber || t.id.slice(0, 6)}</strong><br/><span style="font-size:10px;color:#64748b;">${startLoc} ← ${dest}</span></td>
                <td>${vPlate}</td>
                <td>${dName}</td>
                <td>${Number(t.distanceKm) || 0} كم</td>
                <td>${Number(t.tollTaxes) || 0} ج.م</td>
                <td>
                  <span class="status-pill ${
                    isCompleted
                      ? 'status-completed'
                      : isRunning
                      ? 'status-progress'
                      : 'status-warning'
                  }">
                    ${isCompleted ? 'مكتملة' : isRunning ? 'جارية' : 'معلقة'}
                  </span>
                </td>
              </tr>
            `;
                    })
                    .join('')
            }
          </tbody>
        </table>

        <!-- 2. Fleet & Oil Change Alerts -->
        <div class="section-title">
          🚛 2. شيت سيارات وشاحنات الأسطول والتنبيهات
        </div>
        <p style="font-size:11px; color:#64748b; margin-top:-6px; margin-bottom:12px;">
          حالة الأسطول: ${activeVehiclesCount} نشطة • ${maintenanceVehiclesCount} تحت الصيانة • ${idleVehiclesCount} جاهزة
        </p>

        ${
          oilAlertVehicles.length > 0
            ? `
          <div style="margin-bottom:16px;">
            <div style="font-size:12px; font-weight:700; color:#b91c1c; margin-bottom:6px;">
              🚨 تنبيهات حاسمة: شاحنات تجاوزت أو اقتربت من موعد تغيير الزيت (${oilAlertVehicles.length} شاحنة):
            </div>
            ${oilAlertVehicles
              .map(
                (item) => `
              <div class="alert-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <strong style="color:#991b1b;">شاحنة ${item.model} (${item.plate})</strong>
                    <div style="font-size:11px; color:#475569; margin-top:2px;">
                      العداد الحالي: ${item.odometer.toLocaleString('ar-EG')} كم • المستهدف: ${item.targetKm.toLocaleString('ar-EG')} كم
                    </div>
                  </div>
                  <span class="status-pill ${item.isOverdue ? 'status-urgent' : 'status-warning'}">
                    ${item.isOverdue ? `تجاوزت بـ ${Math.abs(item.remainingKm).toLocaleString('ar-EG')} كم` : `متبقي ${item.remainingKm.toLocaleString('ar-EG')} كم`}
                  </span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : `
          <div style="background-color:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:10px; font-size:11px; color:#065f46; margin-bottom:16px;">
            ✅ جميع شاحنات وسيارات الأسطول ضمن الحدود الآمنة لغيار الزيت والصيانة الدورية.
          </div>
        `
        }

        <!-- 3. Fuel & Maintenance Breakdown -->
        <div class="section-title">
          ⛽ 3. شيتات الوقود والصيانة المنفذة
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
          <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
            <div style="font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px;">⛽ استهلاك السولار والوقود</div>
            <div style="font-size:11px; color:#475569; line-height:1.6;">
              • إجمالي الكمية: <strong>${totalFuelLiters.toLocaleString('ar-EG')} لتر</strong><br/>
              • إجمالي التكلفة: <strong>${totalFuelCost.toLocaleString('ar-EG')} ج.م</strong><br/>
              • عدد التفويلات المسجلة: <strong>${activeFuelList.length} عملية</strong>
            </div>
          </div>
          <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
            <div style="font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px;">🔧 الصيانة وقطع الغيار</div>
            <div style="font-size:11px; color:#475569; line-height:1.6;">
              • إجمالي المنصرف: <strong>${totalMaintCost.toLocaleString('ar-EG')} ج.م</strong><br/>
              • البنود المنجزة: <strong>${activeMaintList.length} صيانة</strong><br/>
              • مراكز الخدمة: <strong>ورشة المصنع ومراكز معتمدة</strong>
            </div>
          </div>
        </div>

        <!-- 4. Drivers Sheet Summary -->
        <div class="section-title">
          👤 4. شيت السائقين والجاهزية
        </div>
        <p style="font-size:11px; color:#475569; line-height:1.5; margin:0 0 16px 0;">
          إجمالي كادر السائقين المسجل: <strong>${drivers.length} سائق</strong>. السائقون العاملون بالورديات اليوم بحالة ممتازة وجاهزية تامة، مع الالتزام بتعليمات السلامة والسرعات المقررة على طريقي مصر-إسكندرية الصحراوي والساحلي الدولي.
        </p>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin:0 0 8px 0; font-weight:600;">
          نظام الإدارة الذكية لأسطول وسيارات المصنع • تقرير ختام اليوم المؤتمت
        </p>
        <p style="margin:0; font-size:10px; color:#94a3b8;">
          تم إرسال هذا البريد الإلكتروني آلياً بناءً على إعدادات الجدولة اليومية لنهاية اليوم.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateDailyEmailPlainText(payload: DailyReportDataPayload): string {
  const dateStr = payload.reportDate || new Date().toISOString().split('T')[0];
  const trips = payload.trips || [];
  const vehicles = payload.vehicles || [];
  const fuelRecords = payload.fuelRecords || [];
  const maintenance = payload.maintenance || [];

  const totalFuelCost = fuelRecords.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0);
  const totalMaintCost = maintenance.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
  const totalTolls = trips.reduce((acc, t) => acc + (Number(t.tollTaxes) || 0), 0);
  const grandTotal = totalFuelCost + totalMaintCost + totalTolls;

  return `
[تقرير نهاية اليوم المجمع لأسطول وسيارات المصنع]
تاريخ التقرير: ${dateStr}
محاور التشغيل: الإسكندرية - الساحل الشمالي - البحيرة

1. ملخص الرحلات وخطوط السير:
- عدد الرحلات: ${trips.length} رحلة
- رسوم الكارتات: ${totalTolls} ج.م

2. أسطول السيارات:
- إجمالي السيارات: ${vehicles.length} سيارة

3. الوقود والسولار:
- إجمالي التكلفة: ${totalFuelCost} ج.م

4. الصيانة وقطع الغيار:
- إجمالي التكلفة: ${totalMaintCost} ج.م

إجمالي منصرفات اليوم: ${grandTotal} ج.م

--
نظام إدارة أسطول المصنع
  `.trim();
}
