import * as React from 'react';
import { cn } from '@/lib/cn';

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex min-h-11 w-full rounded-xl border border-input/25 bg-background/45 px-3.5 py-2.5 text-sm text-foreground shadow-inner shadow-black/5 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/60 hover:border-input/40 focus-visible:border-ring/70 focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
