import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      id="toast-container"
      className="fixed bottom-20 md:bottom-5 left-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      dir="rtl"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border text-xs transition-all duration-300 animate-in slide-in-from-bottom-2 ${
        toast.type === 'success'
          ? 'bg-slate-900 text-white border-emerald-500/40 shadow-emerald-950/20'
          : toast.type === 'error'
          ? 'bg-slate-900 text-white border-rose-500/40 shadow-rose-950/20'
          : 'bg-slate-900 text-white border-slate-700 shadow-slate-950/30'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {toast.type === 'success' && (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
        )}
        {toast.type === 'error' && (
          <AlertCircle className="w-4 h-4 text-rose-400 stroke-[2.5]" />
        )}
        {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 stroke-[2.5]" />}
      </div>
      <div className="flex-1">
        <div className="font-bold text-slate-100">{toast.title}</div>
        {toast.description && (
          <div className="text-[11px] text-slate-300 mt-0.5">{toast.description}</div>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
