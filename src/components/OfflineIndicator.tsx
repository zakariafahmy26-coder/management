import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center justify-between gap-3 rounded-xl bg-slate-900/95 text-white p-3 shadow-2xl border border-amber-500/50 backdrop-blur-md animate-bounce-short"
      dir="rtl"
    >
      <div className="flex items-center gap-2.5">
        <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
          <WifiOff className="w-5 h-5" />
        </span>
        <div>
          <p className="text-xs font-bold text-amber-300">وضع عدم الاتصال (Offline)</p>
          <p className="text-[11px] text-slate-300">
            أنت تعمل بدون إنترنت. البيانات والخرائط المخبأة متاحة ويمكنك متابعة العمل.
          </p>
        </div>
      </div>
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
    </div>
  );
};
