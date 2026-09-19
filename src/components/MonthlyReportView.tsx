import {
  ArrowDownToLine,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  Download,
  FileSpreadsheet,
  FileText,
  Fuel,
  MapPin,
  Printer,
  TrendingUp,
  Truck,
  Wrench,
  Sparkles,
  Loader2,
} from 'lucide-react';
import React, { useState } from 'react';
import { MonthlyReportSummary } from '../types';
import { aiService } from '../services/aiService';

interface MonthlyReportViewProps {
  report: MonthlyReportSummary;
  availableMonths: string[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onExportLocalExcel: () => void;
  onSyncGoogleSheets: () => void;
  isSyncingSheets: boolean;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  report,
  availableMonths,
  selectedMonth,
  onMonthChange,
  onExportLocalExcel,
  onSyncGoogleSheets,
  isSyncingSheets,
}) => {
  const safeReport: MonthlyReportSummary = report || {
    monthYear: selectedMonth,
    totalTrips: 0,
    totalDistanceKm: 0,
    totalFuelLiters: 0,
    totalFuelCost: 0,
    totalMaintenanceCost: 0,
    totalTollAndOtherCost: 0,
    grandTotalCost: 0,
    avgCostPerKm: 0,
    regionBreakdown: [],
    vehicleBreakdown: [],
  };

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      const result = await aiService.generateExecutiveReport(safeReport);
      setAiSummary(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Month selector & Export actions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              التقرير الشهري الشامل لمصروفات وتشغيل أسطول السيارات
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              تقرير إداري معتمد
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تحليل دقيق لتكاليف الوقود، كارتات الطرق، الصيانات الدورية ومعدلات استهلاك الكيلومتر لقطاعات الإسكندرية والساحل والبحيرة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">الشهر:</span>
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="all">جميع الفترات التراكمية</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Export to Excel */}
          <button
            onClick={onExportLocalExcel}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          {/* Sync to Google Sheets */}
          <button
            onClick={onSyncGoogleSheets}
            disabled={isSyncingSheets}
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isSyncingSheets ? 'مزامنة...' : 'مزامنة Google Sheets'}</span>
          </button>

          {/* Print Report */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة التقرير (A4)</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Wrapper */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Printable Header */}
        <div className="border-b border-slate-200 pb-5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-slate-900">
              مصنع الأمل للصناعات الغذائية والتوزيع - برج العرب
            </div>
            <div className="text-xs text-slate-500 mt-1">
              إدارة النقل والحركة واللوجستيات | تقرير المصروفات التشغيلية للفترة:{' '}
              <strong className="text-slate-800">{selectedMonth === 'all' ? 'كافة الفترات التراكمية' : selectedMonth}</strong>
            </div>
          </div>
          <div className="text-left text-xs text-slate-400">
            <div>تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>نطاق التغطية: الإسكندرية - الساحل الشمالي - البحيرة</div>
          </div>
        </div>

        {/* Executive 4 Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold">إجمالي المصروفات الشاملة</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {safeReport.grandTotalCost.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              وقود + صيانة + بوابات وكارتات
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
            <span className="text-xs text-blue-800 font-semibold">إجمالي تكلفة استهلاك الوقود</span>
            <div className="text-2xl font-black text-blue-950 mt-1">
              {safeReport.totalFuelCost.toLocaleString()} <span className="text-xs font-normal text-blue-700">ج.م</span>
            </div>
            <div className="text-[11px] text-blue-700 mt-1">
              {safeReport.totalFuelLiters.toLocaleString()} لتر ({((safeReport.totalFuelCost / (safeReport.grandTotalCost || 1)) * 100).toFixed(0)}% من المصروفات)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="text-xs text-amber-800 font-semibold">إجمالي الصيانة وقطع الغيار</span>
            <div className="text-2xl font-black text-amber-950 mt-1">
              {safeReport.totalMaintenanceCost.toLocaleString()} <span className="text-xs font-normal text-amber-700">ج.م</span>
            </div>
            <div className="text-[11px] text-amber-700 mt-1">
              تغيير زيت، إطارات، عمرات دورية
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
            <span className="text-xs text-emerald-800 font-semibold">متوسط تكلفة الكيلومتر الواحد</span>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {safeReport.avgCostPerKm.toFixed(2)} <span className="text-xs font-normal text-emerald-700">ج.م / كم</span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              على مسافة {safeReport.totalDistanceKm.toLocaleString()} كم ({safeReport.totalTrips} رحلة)
            </div>
          </div>
        </div>

        {/* Regional Cost & Operational Breakdown */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            تحليل التكاليف والرحلات بحسب القطاعات الجغرافية
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-y border-slate-200">
                  <th className="p-3">القطاع الجغرافي</th>
                  <th className="p-3">عدد الرحلات المنفذة</th>
                  <th className="p-3">إجمالي الكيلومترات (كم)</th>
                  <th className="p-3">تكلفة الوقود (ج.م)</th>
                  <th className="p-3">الكارتات والبوابات (ج.م)</th>
                  <th className="p-3">إجمالي تكلفة القطاع (ج.م)</th>
                  <th className="p-3">متوسط التكلفة / كم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(safeReport.regionBreakdown || []).map((reg) => (
                  <tr key={reg.region} className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900">{reg.region}</td>
                    <td className="p-3">{reg.tripCount} رحلة</td>
                    <td className="p-3 font-mono">{reg.totalDistanceKm.toLocaleString()} كم</td>
                    <td className="p-3 font-mono">{reg.fuelCost.toLocaleString()} ج.م</td>
                    <td className="p-3 font-mono">{reg.tollCost.toLocaleString()} ج.م</td>
                    <td className="p-3 font-bold text-slate-900">{reg.totalCost.toLocaleString()} ج.م</td>
                    <td className="p-3 font-bold text-emerald-700">{reg.avgCostPerKm.toFixed(2)} ج.م/كم</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Per-Vehicle Operational & Financial Table */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            كشف حساب تشغيل ومصروفات كل سيارة في الأسطول
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-y border-slate-200">
                  <th className="p-3">السيارة واللوحة</th>
                  <th className="p-3">الطراز</th>
                  <th className="p-3">عدد الرحلات</th>
                  <th className="p-3">الكيلومترات</th>
                  <th className="p-3">لترات الوقود</th>
                  <th className="p-3">تكلفة الوقود</th>
                  <th className="p-3">تكلفة الصيانة</th>
                  <th className="p-3">الكارتات والمصاريف</th>
                  <th className="p-3">إجمالي المصروفات</th>
                  <th className="p-3">التكلفة / كم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(safeReport.vehicleBreakdown || []).map((veh) => (
                  <tr key={veh.vehicleId} className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900">{veh.plateNumber}</td>
                    <td className="p-3 text-slate-600">{veh.model}</td>
                    <td className="p-3">{veh.tripCount}</td>
                    <td className="p-3 font-mono">{veh.totalKm.toLocaleString()} كم</td>
                    <td className="p-3 font-mono text-blue-700">{veh.fuelLiters.toLocaleString()} لتر</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{veh.fuelCost.toLocaleString()} ج.م</td>
                    <td className="p-3 font-mono text-amber-800">{veh.maintenanceCost.toLocaleString()} ج.م</td>
                    <td className="p-3 font-mono text-slate-600">{veh.tollsCost.toLocaleString()} ج.م</td>
                    <td className="p-3 font-mono font-black text-emerald-800 text-sm">
                      {veh.totalCost.toLocaleString()} ج.م
                    </td>
                    <td className="p-3 font-bold text-slate-700">
                      {veh.costPerKm.toFixed(2)} ج.م/كم
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive AI Analysis Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">
                التحليل الاستراتيجي التنفيذي بالذكاء الاصطناعي (Gemini AI Insights)
              </h4>
            </div>
            <button
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className="print:hidden bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التحليل...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiSummary ? 'إعادة التوليد' : 'توليد التحليل الذكي'}</span>
                </>
              )}
            </button>
          </div>

          {aiSummary ? (
            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              {aiSummary}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              انقر على "توليد التحليل الذكي" لإدراج تقرير تحليلي مدعوم بالذكاء الاصطناعي يوضح فرص خفض التكاليف وتوزيع النفقات.
            </p>
          )}
        </div>

        {/* Official Sign-off block for printing */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-3 text-center text-xs text-slate-600 font-medium">
          <div>
            <div className="mb-8">مسؤول حركة السيارات والأسطول</div>
            <div className="font-bold text-slate-800">..............................</div>
          </div>
          <div>
            <div className="mb-8">المشرف المالي وإدارة التكاليف</div>
            <div className="font-bold text-slate-800">..............................</div>
          </div>
          <div>
            <div className="mb-8">اعتماد مدير المصنع</div>
            <div className="font-bold text-slate-800">..............................</div>
          </div>
        </div>
      </div>
    </div>
  );
};
