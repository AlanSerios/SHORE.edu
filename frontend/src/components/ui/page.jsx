import React from 'react';
import { cn } from '../../utils';

const WIDTHS = {
  narrow: 'max-w-4xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
};

export function PageShell({ children, width = 'default', className, contentClassName }) {
  return (
    <div className={cn('h-full overflow-y-auto bg-canvas', className)}>
      <div className={cn(
        'mx-auto w-full px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-8',
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
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
