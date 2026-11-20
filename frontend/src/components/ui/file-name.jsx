import React from 'react';

export function FileName({ value }) {
  const name = String(value || '');
  const dot = name.lastIndexOf('.');
  const hasExtension = dot > 0 && dot < name.length - 1;

  return (
    <span className="inline-flex min-w-0 max-w-full align-bottom" title={name}>
      <span className="min-w-0 truncate">{hasExtension ? name.slice(0, dot) : name}</span>
      {hasExtension && <span className="shrink-0">{name.slice(dot)}</span>}
    </span>
  );
}
