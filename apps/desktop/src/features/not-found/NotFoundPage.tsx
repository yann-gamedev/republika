import { Link } from 'react-router-dom';

import { copy } from '@/copy/id';
import { Button } from '@/ui/components/button';
import { Seal } from '@/ui/Seal';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-8">
      <div className="max-w-lg border border-border/70 bg-card/80 p-10 text-center shadow-document">
        <Seal label={copy.menu.sealLabel} className="mx-auto h-20 w-20" />
        <p className="institutional-label mt-6">404</p>
        <h1 className="mt-3 text-3xl">{copy.app.notFoundTitle}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {copy.app.notFoundBody}
        </p>
        <Button asChild className="mt-6">
          <Link to="/">{copy.app.backToMenu}</Link>
        </Button>
      </div>
    </main>
  );
}
