import React from 'react';
import { cn } from '../../utils';

const WIDTHS = {
  narrow: 'max-w-4xl',
  reading: 'max-w-[52rem]',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
};

export function PageShell({ children, width = 'default', className, contentClassName, ...props }) {
  return (
    <div className={cn('h-full overflow-y-auto bg-canvas overscroll-contain', className)} {...props}>
      <div className={cn(
        'shore-page-content mx-auto w-full',
        WIDTHS[width] || WIDTHS.default,
        contentClassName,
      )}>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions, className, titleClassName }) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className={cn('text-2xl font-bold tracking-tight text-fg sm:text-3xl', titleClassName)}>{title}</h1>
        {description && <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0">{actions}</div>}
    </header>
  );
}
