import React from 'react';
import { cn } from '../../utils';

const WIDTHS = {
  narrow: 'max-w-4xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
};

export function PageShell({ children, width = 'default', className, contentClassName, ...props }) {
  return (
    <div className={cn('h-full overflow-y-auto bg-canvas overscroll-contain', className)} {...props}>
      <div className={cn(
        'mx-auto w-full px-4 pt-[max(1.25rem,calc(0.75rem+env(safe-area-inset-top,0px)))] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-8 md:pb-10 lg:px-8',
        WIDTHS[width] || WIDTHS.default,
        contentClassName,
      )}>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions, className }) {
  return (
    <header className={cn('flex flex-col gap-3.5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0">{actions}</div>}
    </header>
  );
}
