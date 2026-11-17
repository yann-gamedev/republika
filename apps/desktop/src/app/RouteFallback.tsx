import { copy } from '@/copy/id';

export function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-4">
        <span className="h-px w-12 bg-primary/60" aria-hidden="true" />
        <p className="text-xs uppercase tracking-institutional text-muted-foreground">
          {copy.app.loading}
        </p>
      </div>
    </div>
  );
}
