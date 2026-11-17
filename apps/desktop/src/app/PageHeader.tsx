import type { ReactNode } from 'react';

interface PageHeaderProps {
  readonly kicker: string;
  readonly title: string;
  readonly subtitle: string;
  readonly actions?: ReactNode;
}

export function PageHeader({ kicker, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="pb-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <p className="institutional-label">{kicker}</p>
          <h1 className="mt-3 text-[2.35rem] leading-[1.05] text-foreground">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="rule-line mt-6" />
    </header>
  );
}
