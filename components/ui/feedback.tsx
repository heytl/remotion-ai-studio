'use client';

import * as React from 'react';
import { CheckCircle, CircleNotch, WarningCircle, X } from '@phosphor-icons/react';
import { Button } from './button';
import { Card } from './card';
import { cn } from '@/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return <CircleNotch className={cn('h-4 w-4 animate-spin motion-reduce:animate-none', className)} weight="bold" aria-hidden="true" />;
}

export function ErrorBanner({ message, onClose }: { message: string | null; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert">
      <WarningCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" weight="fill" aria-hidden="true" />
      <span className="min-w-0 flex-1 overflow-wrap-anywhere">{message}</span>
      {onClose && (
        <Button variant="ghost" size="icon-sm" className="-mr-2 -mt-1 text-red-200 hover:bg-red-400/10" onClick={onClose} aria-label="关闭错误提示">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export function SuccessBanner({ message, onClose }: { message: string | null; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100" role="status">
      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" weight="fill" aria-hidden="true" />
      <span className="min-w-0 flex-1 overflow-wrap-anywhere">{message}</span>
      {onClose && (
        <Button variant="ghost" size="icon-sm" className="-mr-2 -mt-1 text-emerald-200 hover:bg-emerald-400/10" onClick={onClose} aria-label="关闭成功提示">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-indigo-200">{icon}</div>}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function PageHeading({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
