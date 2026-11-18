import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { copy } from '@/copy/id';
import { LOG_LOCATION } from '@/platform/logger';
import { appLogger } from '@/store/controller';

interface Props {
  readonly children: ReactNode;
  /** Batas di-reset saat pindah layar. */
  readonly resetKey: string;
}

interface State {
  readonly error: Error | null;
}

/**
 * Error boundary per layar: satu layar gagal tidak membuat seluruh aplikasi
 * crash. State permainan tidak diubah, jadi autosave tetap aman.
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    void appLogger.log(
      'error',
      `layar ${this.props.resetKey}: ${error.message} ${info.componentStack ?? ''}`,
    );
  }

  override componentDidUpdate(previous: Props): void {
    if (previous.resetKey !== this.props.resetKey && this.state.error !== null) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <section
        role="alert"
        className="mx-auto max-w-xl border border-maroon/60 bg-card/80 p-8 shadow-document"
      >
        <p className="institutional-label">{copy.errors.screenKicker}</p>
        <h1 className="mt-3 font-serif text-2xl">{copy.errors.screenTitle}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {copy.errors.screenBody}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {copy.errors.logLocation(LOG_LOCATION)}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {copy.errors.backToMenu}
        </Link>
      </section>
    );
  }
}
