import * as React from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'min-h-11 w-full appearance-none rounded-xl border border-input/25 bg-background/45 px-3.5 py-2.5 pr-10 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] hover:border-input/40 focus-visible:border-ring/70 focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  )
);
NativeSelect.displayName = 'NativeSelect';
