'use client';

import React from 'react';

export const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent ${className}`}
  />
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean }
> = ({ variant = 'secondary', loading, children, disabled, className = '', ...rest }) => (
  <button
    className={`${variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : 'btn-secondary'} ${className}`}
    disabled={disabled || loading}
    {...rest}
  >
    {loading && <Spinner />}
    {children}
  </button>
);

export const ErrorBanner: React.FC<{ message: string | null; onClose?: () => void }> = ({
  message,
  onClose,
}) => {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      <span className="break-all">{message}</span>
      {onClose && (
        <button className="shrink-0 text-red-400 hover:text-red-200" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  );
};

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({
  label,
  children,
  hint,
}) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
    <div
      className="h-full rounded-full bg-accent transition-all duration-300"
      style={{ width: `${Math.round(value * 100)}%` }}
    />
  </div>
);

export const StepBadge: React.FC<{ active: boolean; done: boolean; index: number; label: string; onClick: () => void }> = ({
  active,
  done,
  index,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
      active ? 'bg-accent text-white' : done ? 'text-emerald-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
    }`}
  >
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
        active ? 'bg-white text-accent' : done ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
      }`}
    >
      {done ? '✓' : index}
    </span>
    {label}
  </button>
);
