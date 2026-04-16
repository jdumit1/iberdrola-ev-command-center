import React from 'react';
import { AlertCircle, CheckCircle2, Info, TrendingUp, X, XCircle } from 'lucide-react';

export const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed top-4 right-4 z-[9999] flex max-w-sm flex-col gap-2">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl animate-slide-in
          ${toast.type === 'success' ? 'border-emerald-200 bg-white/95 text-emerald-900' :
            toast.type === 'error' ? 'border-red-200 bg-white/95 text-red-900' :
            toast.type === 'warning' ? 'border-amber-200 bg-white/95 text-amber-900' :
            'border-slate-200 bg-white/95 text-slate-900'}`}
      >
        {toast.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> :
         toast.type === 'error' ? <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" /> :
         toast.type === 'warning' ? <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" /> :
         <Info size={18} className="mt-0.5 shrink-0 text-sky-600" />}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button onClick={() => onDismiss(toast.id)} className="text-slate-400 transition hover:text-slate-700">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
);

export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" />
      <div
        className={`relative ${sizes[size]} w-full rounded-[30px] border border-slate-200 bg-white/96 shadow-[0_32px_90px_rgba(15,23,42,0.18)] animate-modal-in`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

export const KpiCard = ({ icon: Icon, label, value, sublabel, color = 'emerald', trend }) => {
  const colorMap = {
    emerald: 'from-emerald-100 via-white to-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'from-amber-100 via-white to-amber-50 border-amber-200 text-amber-700',
    yellow: 'from-yellow-100 via-white to-yellow-50 border-yellow-200 text-yellow-700',
    red: 'from-red-100 via-white to-red-50 border-red-200 text-red-700',
    blue: 'from-sky-100 via-white to-cyan-50 border-sky-200 text-sky-700',
    violet: 'from-violet-100 via-white to-fuchsia-50 border-violet-200 text-violet-700',
  };

  return (
    <div className={`group relative overflow-hidden rounded-[28px] border bg-gradient-to-br ${colorMap[color]} p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)] transition-all duration-300 hover:-translate-y-1`}>
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-950 tabular-nums">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
        </div>
        <div className="rounded-2xl bg-white/80 p-2.5 shadow-sm transition group-hover:bg-white">
          <Icon size={22} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
          <TrendingUp size={12} />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};