'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border border-white/15 bg-gradient-to-br from-primary via-[#7b70ff] to-[#5f8cff] text-primary-foreground shadow-[0_12px_32px_hsl(var(--primary)/0.24)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_40px_hsl(var(--primary)/0.32)] active:translate-y-0',
        secondary:
          'border border-border/20 bg-secondary/80 text-secondary-foreground hover:border-border/35 hover:bg-secondary',
        outline:
          'border border-border/25 bg-background/30 text-foreground hover:border-border/45 hover:bg-accent/70',
        ghost: 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
        destructive:
          'border border-destructive/30 bg-destructive/15 text-red-200 hover:bg-destructive/25',
        link: 'min-h-0 rounded-none p-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'px-4 py-2.5',
        sm: 'min-h-9 rounded-lg px-3 text-xs',
        lg: 'min-h-12 px-6 text-sm',
        icon: 'h-11 w-11 min-h-11 p-0',
        'icon-sm': 'h-9 w-9 min-h-9 rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? children : (
          <>
            {loading && <CircleNotch className="h-4 w-4 animate-spin motion-reduce:animate-none" weight="bold" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
