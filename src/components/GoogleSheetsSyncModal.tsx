import { CheckCircle2, Copy, ExternalLink, FileSpreadsheet, X } from 'lucide-react';
import React, { useState } from 'react';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetUrl: string | null;
  syncedStats: {
    tripsCount: number;
    vehiclesCount: number;
    driversCount: number;
    maintenanceCount: number;
    fuelCount?: number;
    locationsCount?: number;
  };
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  spreadsheetUrl,
  syncedStats,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (spreadsheetUrl) {
      navigator.clipboard.writeText(spreadsheetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                تمت المزامنة بنجاح مع Google Sheets
              </h3>
              <p className="text-xs text-slate-500">تم تحديث وتصدير كافة الشيتات والبيانات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم تحديث وتنسيق الشيتات الـ 7 المرتبطة ببعضها:</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-700 pr-3 list-disc font-medium text-[11px]">
              <li>التقرير التنفيذي والمصروفات المعتمدة</li>
              <li>شيت الرحلات وخطوط السير ({syncedStats.tripsCount} رحلة)</li>
              <li>شيت أسطول السيارات والعدادات ({syncedStats.vehiclesCount} سيارة)</li>
              <li>شيت السائقين والتراخيص ({syncedStats.driversCount} سائق)</li>
              <li>شيت استهلاك وتموين الوقود ({syncedStats.fuelCount ?? 0} إيصال)</li>
              <li>شيت الصيانة وتغيير الزيت ({syncedStats.maintenanceCount} عملية)</li>
              <li className="col-span-1 sm:col-span-2">شيت المواقع ومخازن المصنع ({syncedStats.locationsCount ?? 0} موقع)</li>
            </ul>
          </div>

          {spreadsheetUrl ? (
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">رابط ملف Google Sheets المباشر:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={spreadsheetUrl}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-[11px] select-all"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="نسخ الرابط"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <p className="text-[11px] text-emerald-600 font-bold">تم نسخ الرابط للحافظة!</p>}

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer text-xs"
                >
                  <span>فتح الشيت في Google Sheets الآن</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">
              تم تجهيز البيانات وإرسالها للمزامنة مع حساب Google Drive.
            </p>
          )}

          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
