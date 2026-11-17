import { Component, type ErrorInfo, type ReactNode } from 'react';

import { copy } from '@/copy/id';
import { Button } from '@/ui/components/button';
import { Seal } from '@/ui/Seal';

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

interface AppErrorBoundaryState {
  readonly hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('REPUBLIKA UI error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center px-8">
        <div className="max-w-lg border border-border/70 bg-card/80 p-10 text-center shadow-document">
          <Seal label={copy.menu.sealLabel} className="mx-auto h-20 w-20" />
          <p className="institutional-label mt-6">{copy.app.name}</p>
          <h1 className="mt-3 text-3xl">{copy.errors.boundaryTitle}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {copy.errors.boundaryBody}
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            {copy.errors.reload}
          </Button>
        </div>
      </main>
    );
  }
}
