import * as React from 'react';
import { cn } from '@/lib/cn';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-24 w-full resize-y rounded-xl border border-input/25 bg-background/45 px-3.5 py-3 text-sm leading-6 text-foreground shadow-inner shadow-black/5 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/60 hover:border-input/40 focus-visible:border-ring/70 focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
