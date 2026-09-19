export interface MonthlyExecutiveReportPayload {
  companyId?: string;
  companyName?: string;
  monthName?: string; // e.g. 'سبتمبر 2026'
  reportDate?: string; // YYYY-MM-DD
  generatedAt?: string;
  summary: {
    totalVehicles: number;
    activeVehiclesCount: number;
    maintenanceVehiclesCount: number;
    fleetAvailabilityRate: number; // percentage e.g. 92
    totalDrivers: number;
    activeDriversCount: number;
    totalTasks: number;
    completedTasksCount: number;
    delayedTasksCount: number;
    taskComplianceRate: number; // percentage e.g. 96
    totalDistanceKm: number;
    totalFuelLiters: number;
    totalFuelCost: number;
    totalMaintenanceCost: number;
    totalTollsCost: number;
    grandTotalExpenses: number;
    urgentAlertsCount: number;
  };
  managers: Array<{
    name: string;
    email: string;
    role?: string;
  }>;
  regionalBreakdown?: {
    alexandria: { trips: number; sharePercent: number };
    northCoast: { trips: number; sharePercent: number };
    beheira: { trips: number; sharePercent: number };
  };
  keyHighlights?: string[];
}

export function generateMonthlyExecutiveEmailHtml(payload: MonthlyExecutiveReportPayload): string {
  const monthName = payload.monthName || new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  const companyName = payload.companyName || 'أسطول العمليات اللوجستية FleetOps';
  const generatedAt = payload.generatedAt || new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' });
  const s = payload.summary;

  const managersListHtml = payload.managers && payload.managers.length > 0
    ? payload.managers.map((m) => `
      <span style="display:inline-block; background:#f1f5f9; color:#1e293b; padding:4px 10px; border-radius:999px; font-size:11px; margin:2px 4px; font-weight:600; border:1px solid #cbd5e1;">
        👤 ${m.name} (${m.email})
      </span>
    `).join('')
    : '<span style="color:#64748b; font-size:12px;">جميع المديرين المسجلين في إدارة الأسطول</span>';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>التقرير الشهري الشامل لإدارة الأسطول - ${monthName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", Helvetica, Arial, sans-serif;
      color: #0f172a;
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 24px 12px;
      box-sizing: border-box;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: right;
      border-bottom: 3px solid #0284c7;
    }
    .badge {
      display: inline-block;
      background: rgba(2, 132, 199, 0.25);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .content {
      padding: 24px;
    }
    .grid-kpi {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      text-align: right;
    }
    .kpi-title {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .kpi-value {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 11px;
      color: #10b981;
      margin-top: 4px;
      font-weight: 600;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #1e293b;
      margin: 20px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    .table-custom th {
      background: #f1f5f9;
      color: #475569;
      padding: 8px 12px;
      text-align: right;
      font-weight: 700;
      border-bottom: 1px solid #cbd5e1;
    }
    .table-custom td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .expense-total-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 18px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .managers-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 14px 16px;
      margin-top: 20px;
    }
    .footer {
      background: #f1f5f9;
      padding: 18px 24px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Header -->
      <div class="header">
        <div class="badge">🚀 التقرير الشهري الآلي للإدارة العليا</div>
        <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:800; color:#ffffff;">
          تقرير أداء الأسطول والعمليات: ${monthName}
        </h1>
        <p style="margin:0; font-size:12px; color:#94a3b8;">
          الشركة: ${companyName} • تاريخ الإصدار المجدول: ${generatedAt}
        </p>
      </div>

      <div class="content">

        <!-- Intro -->
        <p style="font-size:13px; color:#334155; line-height:1.6; margin-top:0;">
          تحية طيبة، يُرسل هذا التقرير تلقائياً في <strong>أول يوم من كل شهر ميلادي</strong> لجميع المديرين ومسؤولي العمليات المسجلين بالنظام عبر <strong>محرك الأتمتة المدمج</strong>، لتقديم لقطة قياسية شاملة لأداء المركبات والمهام والمنصرفات التشغيلية.
        </p>

        <!-- KPI Grid -->
        <div class="grid-kpi">
          <div class="kpi-card">
            <div class="kpi-title">جاهزية أسطول الشاحنات</div>
            <div class="kpi-value">${s.fleetAvailabilityRate}%</div>
            <div class="kpi-sub">${s.activeVehiclesCount} جاهزة من إجمالي ${s.totalVehicles} مركبة</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">المهام المنجزة بنجاح</div>
            <div class="kpi-value">${s.completedTasksCount} مهمة</div>
            <div class="kpi-sub">معدل التزام تشغيلي: ${s.taskComplianceRate}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">إجمالي المسافات المقطوعة</div>
            <div class="kpi-value">${s.totalDistanceKm.toLocaleString()} كم</div>
            <div class="kpi-sub">تغطية الإسكندرية، الساحل، والبحيرة</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">كادر السائقين النشطين</div>
            <div class="kpi-value">${s.activeDriversCount} سائق</div>
            <div class="kpi-sub">من أصل ${s.totalDrivers} مسجلين بالنظام</div>
          </div>
        </div>

        <!-- Financial Breakdown -->
        <div class="section-title">
          <span>💰 ملخص التكاليف والمنصرفات التشغيلية للشهر</span>
        </div>

        <table class="table-custom">
          <thead>
            <tr>
              <th>البند التشغيلي</th>
              <th>الكمية / الحجم</th>
              <th style="text-align:left;">المبلغ (ج.م)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>⛽ استهلاك الوقود والسولار المعتمد</td>
              <td>${s.totalFuelLiters.toLocaleString()} لتر</td>
              <td style="text-align:left; font-weight:700;">${s.totalFuelCost.toLocaleString()} ج.م</td>
            </tr>
            <tr>
              <td>🛠️ الصيانة الدورية وقطع الغيار والفلاتر</td>
              <td>${s.maintenanceVehiclesCount > 0 ? `${s.maintenanceVehiclesCount} مركبات خضعت للصيانة` : 'صيانة وقائية دورية'}</td>
              <td style="text-align:left; font-weight:700;">${s.totalMaintenanceCost.toLocaleString()} ج.م</td>
            </tr>
            <tr>
              <td>🛣️ رسوم بوابات الطرق والكارتات</td>
              <td>محاور الإسكندرية / الساحل الدولي</td>
              <td style="text-align:left; font-weight:700;">${s.totalTollsCost.toLocaleString()} ج.م</td>
            </tr>
          </tbody>
        </table>

        <!-- Total Box -->
        <div class="expense-total-box">
          <div>
            <div style="font-size:12px; color:#166534; font-weight:700;">إجمالي المنصرفات التشغيلية المعتمدة</div>
            <div style="font-size:11px; color:#15803d;">شامل الوقود، الصيانة، ورسوم الطرق السريعة</div>
          </div>
          <div style="font-size:22px; font-weight:800; color:#166534;">
            ${s.grandTotalExpenses.toLocaleString()} ج.م
          </div>
        </div>

        <!-- Regional Distribution -->
        <div class="section-title">
          <span>📍 التوزيع الجغرافي للرحلات والعمليات</span>
        </div>
        <div style="display:flex; gap:8px; margin-bottom:18px;">
          <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#64748b;">محور الإسكندرية</div>
            <div style="font-size:16px; font-weight:700; color:#0284c7;">55%</div>
          </div>
          <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#64748b;">محور الساحل الشمالي</div>
            <div style="font-size:16px; font-weight:700; color:#0284c7;">30%</div>
          </div>
          <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#64748b;">محور البحيرة والدلتا</div>
            <div style="font-size:16px; font-weight:700; color:#0284c7;">15%</div>
          </div>
        </div>

        <!-- Recipients box -->
        <div class="managers-box">
          <div style="font-size:12px; font-weight:700; color:#334155; margin-bottom:6px;">
            📬 تم إرسال هذا التقرير آلياً للمديرين المسجلين:
          </div>
          <div>
            ${managersListHtml}
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin:0 0 6px 0; font-weight:700;">
          نظام الإدارة الذكية للأسطول FleetOps • محرك الأتمتة المدمج (Automation Engine V3)
        </p>
        <p style="margin:0; font-size:10px; color:#94a3b8;">
          تم التوليد والإرسال آلياً في اليوم الأول من الشهر الميلادي استناداً إلى قاعدة الأتمتة المجدولة.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateMonthlyExecutiveReportPlainText(payload: MonthlyExecutiveReportPayload): string {
  const monthName = payload.monthName || 'الشهر الحالي';
  const s = payload.summary;

  return `
[التقرير الشهري الشامل لإدارة الأسطول - ${monthName}]
التاريخ: ${payload.reportDate || new Date().toISOString().split('T')[0]}

1. مؤشرات الأسطول والجاهزية:
- إجمالي المركبات: ${s.totalVehicles} مركبة (نسبة الجاهزية: ${s.fleetAvailabilityRate}%)
- إجمالي المهام: ${s.totalTasks} (المنجز بنجاح: ${s.completedTasksCount} - نسبة الالتزام: ${s.taskComplianceRate}%)
- إجمالي المسافات: ${s.totalDistanceKm} كم

2. التكاليف والمنصرفات:
- الوقود: ${s.totalFuelCost} ج.م (${s.totalFuelLiters} لتر)
- الصيانة وقطع الغيار: ${s.totalMaintenanceCost} ج.م
- الكارتات ورسوم الطرق: ${s.totalTollsCost} ج.م
- إجمالي المنصرفات: ${s.grandTotalExpenses} ج.م

3. المستلمون:
${payload.managers?.map(m => `- ${m.name} (${m.email})`).join('\n') || 'جميع المديرين المسجلين'}

--
نظام إدارة الأسطول FleetOps - محرك الأتمتة المدمج
  `.trim();
}
