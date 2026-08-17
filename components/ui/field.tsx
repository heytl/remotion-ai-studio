'use client';

import * as React from 'react';
import { Label } from './label';
import { cn } from '@/lib/cn';

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactElement<{ id?: string; 'aria-describedby'?: string }>;
  className?: string;
}) {
  const generatedId = React.useId();
  const childId = children.props.id || generatedId;
  const hintId = hint ? `${childId}-hint` : undefined;
  const control = React.cloneElement(children, {
    id: childId,
    'aria-describedby': children.props['aria-describedby'] || hintId,
  });

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={childId}>
        {label}
        {required && <span className="ml-1 text-red-300" aria-hidden="true">*</span>}
        {required && <span className="sr-only">（必填）</span>}
      </Label>
      {control}
      {hint && <p id={hintId} className="text-xs leading-5 text-muted-foreground/75">{hint}</p>}
    </div>
  );
}
