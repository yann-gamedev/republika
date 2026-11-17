import { copy } from '@/copy/id';

export function RouteFallback() {
  return (
    <div aria-busy="true" className="min-h-[60vh] px-2 py-8">
      <p className="sr-only">{copy.app.loading}</p>
      <div className="h-3 w-40 animate-pulse bg-secondary/40 motion-reduce:animate-none" />
      <div className="mt-4 h-9 w-96 max-w-full animate-pulse bg-secondary/40 motion-reduce:animate-none" />
      <div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-28 animate-pulse bg-secondary/25 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
