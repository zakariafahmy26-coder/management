import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import React, { useState } from 'react';
import { MaintenanceAlert } from '../types';

interface AlertBannerProps {
  alerts?: MaintenanceAlert[];
  onOpenMaintenanceModalForVehicle?: (vehicleId: string) => void;
  onQuickAction?: (vehicleId: string) => void;
  onSelectVehicleTab?: () => void;
  onViewMaintenanceTab?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts = [],
  onOpenMaintenanceModalForVehicle,
  onQuickAction,
  onSelectVehicleTab,
  onViewMaintenanceTab,
}) => {
  const handleOpenMaintenance = onOpenMaintenanceModalForVehicle || onQuickAction;
  const handleViewTab = onSelectVehicleTab || onViewMaintenanceTab;
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'urgent' | 'warning'>('all');

  const safeAlerts = alerts || [];

  if (safeAlerts.length === 0) {
    return null;
  }

  const urgentCount = safeAlerts.filter((a) => a.severity === 'urgent').length;
  const warningCount = safeAlerts.filter((a) => a.severity === 'warning').length;

  const filteredAlerts = safeAlerts.filter((a) => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-rose-950/90 border-b border-amber-500/30 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${urgentCount > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-slate-950'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-amber-200">
                تنبيهات الصيانة الدورية والتراخيص ({safeAlerts.length})
              </span>
              <span className="text-xs text-slate-300 mr-2">
                {urgentCount > 0 && (
                  <span className="text-rose-400 font-semibold">{urgentCount} إجراءات عاجلة متأخرة</span>
                )}
                {urgentCount > 0 && warningCount > 0 && ' • '}
                {warningCount > 0 && (
                  <span className="text-amber-300">{warningCount} مواعيد مستحقة قريباً</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-xs bg-slate-800/80 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-2 py-0.5 rounded cursor-pointer ${filterSeverity === 'all' ? 'bg-slate-600 text-white font-bold' : 'text-slate-400'}`}
              >
                الكل ({safeAlerts.length})
              </button>
              <button
                onClick={() => setFilterSeverity('urgent')}
                className={`px-2 py-0.5 rounded cursor-pointer ${filterSeverity === 'urgent' ? 'bg-rose-700 text-white font-bold' : 'text-rose-300'}`}
              >
                عاجل ({urgentCount})
              </button>
              <button
                onClick={() => setFilterSeverity('warning')}
                className={`px-2 py-0.5 rounded cursor-pointer ${filterSeverity === 'warning' ? 'bg-amber-600 text-white font-bold' : 'text-amber-300'}`}
              >
                قريباً ({warningCount})
              </button>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
              title={isExpanded ? 'طي التنبيهات' : 'عرض تفاصيل التنبيهات'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible list of alerts */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition ${
                  alert.severity === 'urgent'
                    ? 'bg-rose-950/50 border-rose-600/60 text-rose-100 hover:bg-rose-950/70'
                    : 'bg-amber-950/40 border-amber-600/50 text-amber-100 hover:bg-amber-950/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold flex items-center gap-1">
                      <AlertCircle className={`w-3.5 h-3.5 ${alert.severity === 'urgent' ? 'text-rose-400' : 'text-amber-400'}`} />
                      {alert.vehiclePlate}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        alert.severity === 'urgent' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {alert.metric}
                    </span>
                  </div>
                  <div className="font-medium text-slate-200">{alert.title}</div>
                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{alert.message}</p>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{alert.dueDetail}</span>
                  {alert.vehicleId && handleOpenMaintenance && (
                    <button
                      onClick={() => handleOpenMaintenance(alert.vehicleId)}
                      className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 font-semibold cursor-pointer underline"
                    >
                      <Wrench className="w-3 h-3" />
                      تسجيل صيانة
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
