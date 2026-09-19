import { Bell, Check, Truck, Wrench, X } from 'lucide-react';
import React, { useEffect } from 'react';

interface NotificationToastBannerProps {
  notification: { title: string; body: string; vehicleId?: string } | null;
  onDismiss: () => void;
  onOpenSettings?: () => void;
  onOpenMaintenanceForVehicle?: (vehicleId: string) => void;
}

export const NotificationToastBanner: React.FC<NotificationToastBannerProps> = ({
  notification,
  onDismiss,
  onOpenSettings,
  onOpenMaintenanceForVehicle,
}) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isOilAlert =
    notification.title.includes('زيت') ||
    notification.body.includes('زيت') ||
    Boolean(notification.vehicleId);

  return (
    <div className="fixed top-4 left-4 right-4 sm:right-auto sm:left-6 z-50 sm:max-w-md w-auto animate-in slide-in-from-top-4 duration-300">
      <div
        className={`bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border flex items-start gap-3 ${
          isOilAlert ? 'border-amber-500/60 shadow-amber-950/40' : 'border-slate-700/80'
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            isOilAlert
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {isOilAlert ? (
            <Truck className="w-5 h-5 animate-pulse text-amber-400" />
          ) : (
            <Bell className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-amber-400 leading-snug">{notification.title}</h4>
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-md transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">{notification.body}</p>

          <div className="flex items-center flex-wrap gap-2.5 mt-3 pt-2.5 border-t border-slate-800">
            {notification.vehicleId && onOpenMaintenanceForVehicle && (
              <button
                type="button"
                onClick={() => {
                  const vId = notification.vehicleId!;
                  onDismiss();
                  onOpenMaintenanceForVehicle(vId);
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>تسجيل صيانة زيت الآن</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تم الاطلاع</span>
            </button>

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onDismiss();
                  onOpenSettings();
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer mr-auto"
              >
                إعدادات التنبيه
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
