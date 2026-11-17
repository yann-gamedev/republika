import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/ui/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em]',
  {
    variants: {
      variant: {
        default: 'border-primary/35 bg-primary/10 text-primary',
        secondary: 'border-border bg-secondary/70 text-secondary-foreground',
        outline: 'border-border text-muted-foreground',
        destructive: 'border-destructive/40 bg-destructive/15 text-red-300',
        success: 'border-emerald-700/50 bg-emerald-900/25 text-emerald-300',
        maroon: 'border-maroon/60 bg-maroon/20 text-red-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
