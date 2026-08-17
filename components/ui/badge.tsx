import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/12 text-indigo-200',
        secondary: 'border-border/15 bg-secondary/70 text-muted-foreground',
        success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
        warning: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
        destructive: 'border-red-400/20 bg-red-400/10 text-red-200',
        outline: 'border-border/25 bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
