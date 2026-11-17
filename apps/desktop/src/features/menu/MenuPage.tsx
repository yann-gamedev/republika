import { useCallback, useState, type ComponentType, type SVGProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { APP_VERSION } from '@republika/shared';

import { copy } from '@/copy/id';
import { isTauriRuntime, quitApplication } from '@/platform';
import { gameController } from '@/store/controller';
import type { ContinueResult } from '@/store/gameController';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { ConfirmDialog } from '@/ui/components/dialog';
import {
  IconChevronRight,
  IconFolder,
  IconLock,
  IconPlay,
  IconPower,
  IconSettings,
} from '@/ui/icons';
import { cn } from '@/ui/lib/utils';
import { Seal } from '@/ui/Seal';

interface ActionCardProps {
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly label: string;
  readonly description: string;
  readonly to?: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly primary?: boolean;
  readonly footnote?: string;
}

function ActionCard({
  icon: Icon,
  label,
  description,
  to,
  onClick,
  disabled = false,
  primary = false,
  footnote,
}: ActionCardProps) {
  const content = (
    <>
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center border',
          primary
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-border/70 bg-secondary/40 text-muted-foreground',
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className={cn('font-serif text-lg', primary && 'text-xl')}>{label}</span>
          {disabled ? (
            <IconLock className="h-4 w-4 text-muted-foreground/50" />
          ) : (
            <IconChevronRight
              className={cn(
                'h-4 w-4 transition-transform group-hover:translate-x-0.5',
                primary ? 'text-primary' : 'text-muted-foreground',
              )}
            />
          )}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
        {footnote !== undefined && (
          <span className="mt-2 block text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground/60">
            {footnote}
          </span>
        )}
      </span>
    </>
  );

  const classes = cn(
    'group flex w-full items-start gap-4 border p-4 text-left transition-colors',
    primary
      ? 'border-primary/35 bg-primary/[0.07] hover:border-primary/60 hover:bg-primary/[0.11]'
      : 'border-border/60 bg-card/30 hover:border-primary/35 hover:bg-card/60',
    disabled && 'cursor-not-allowed opacity-45 hover:border-border/60 hover:bg-card/30',
    primary && 'sm:col-span-2',
  );

  if (disabled) {
    return (
      <div className={classes} aria-disabled="true">
        {content}
      </div>
    );
  }

  if (to !== undefined) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  );
}

export default function MenuPage() {
  const navigate = useNavigate();
  const [quitNotice, setQuitNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [corrupt, setCorrupt] = useState<{ hasBackup: boolean } | null>(null);

  const handleContinueResult = useCallback(
    (result: ContinueResult) => {
      setLoading(false);
      if (result.status === 'loaded') {
        navigate('/game/dashboard');
      } else if (result.status === 'missing') {
        setQuitNotice(copy.menu.continueMissing);
      } else if (result.status === 'incompatible') {
        setQuitNotice(result.message);
      } else {
        setCorrupt({ hasBackup: result.hasBackup });
      }
    },
    [navigate],
  );

  const handleContinue = () => {
    setLoading(true);
    setQuitNotice(copy.menu.continueLoading);
    void gameController.continueCampaign().then(handleContinueResult);
  };

  const restoreBackup = useCallback(() => {
    setCorrupt(null);
    setLoading(true);
    void gameController.continueFromBackup().then(handleContinueResult);
  }, [handleContinueResult]);

  const startOver = useCallback(() => {
    setCorrupt(null);
    navigate('/inauguration');
  }, [navigate]);

  const closeCorrupt = useCallback(() => {
    setCorrupt(null);
    setQuitNotice(null);
  }, []);

  const handleQuit = () => {
    if (!isTauriRuntime()) {
      setQuitNotice(copy.menu.quitUnavailable);
      return;
    }
    void quitApplication().catch(() => setQuitNotice(copy.errors.quitUnavailable));
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(var(--border)/0.22)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.22)_1px,transparent_1px)] [background-size:64px_64px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/2 h-[42rem] w-[42rem] -translate-y-1/2 rounded-full border border-primary/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-1/2 h-[30rem] w-[30rem] -translate-y-1/2 rounded-full border border-primary/10"
      />

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)]">
        <section className="flex flex-col justify-between px-14 py-10 2xl:px-20">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Seal label={copy.menu.sealLabel} className="h-12 w-12" />
              <div>
                <p className="font-serif text-xl tracking-[0.18em]">{copy.app.name}</p>
                <p className="text-[0.62rem] uppercase tracking-institutional text-muted-foreground">
                  {copy.app.kicker}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="success">{copy.app.offline}</Badge>
              <span className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                {copy.app.version(APP_VERSION)}
              </span>
            </div>
          </div>

          <div className="py-12">
            <p className="institutional-label">{copy.menu.kicker}</p>
            <h1 className="mt-4 font-serif text-[5.6rem] leading-[0.86] tracking-[0.08em] text-foreground">
              {copy.menu.title}
            </h1>
            <div className="mt-6 flex max-w-2xl items-start gap-5">
              <span className="mt-2 h-px w-16 shrink-0 bg-primary/70" aria-hidden="true" />
              <p className="text-base leading-relaxed text-muted-foreground">
                {copy.menu.subtitle}
              </p>
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
              <ActionCard
                icon={IconPlay}
                label={copy.menu.newGame}
                description={copy.menu.newGameDescription}
                to="/inauguration"
                primary
              />
              <ActionCard
                icon={IconChevronRight}
                label={copy.menu.continueGame}
                description={copy.menu.continueDescription}
                onClick={handleContinue}
                disabled={loading}
              />
              <ActionCard
                icon={IconFolder}
                label={copy.menu.loadGame}
                description={copy.menu.loadDescription}
                disabled
                footnote={copy.menu.loadUnavailable}
              />
              <ActionCard
                icon={IconSettings}
                label={copy.menu.settings}
                description={copy.menu.settingsDescription}
                to="/settings"
              />
              <ActionCard
                icon={IconPower}
                label={copy.menu.quit}
                description={copy.menu.quitDescription}
                onClick={handleQuit}
              />
            </div>

            {quitNotice !== null && (
              <p role="status" className="mt-4 max-w-2xl text-xs text-primary">
                {quitNotice}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-5">
            <p className="max-w-xl text-[0.68rem] leading-relaxed text-muted-foreground/70">
              {copy.menu.footerNote}
            </p>
            <span className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground/60">
              {copy.menu.versionLine(APP_VERSION)}
            </span>
          </div>
        </section>

        <aside className="relative flex flex-col justify-between border-l border-border/50 bg-card/20 px-12 py-10 backdrop-blur-[2px]">
          <div className="flex items-center justify-between">
            <p className="institutional-label">{copy.menu.sessionLabel}</p>
            <p className="text-xs text-muted-foreground">{copy.menu.sessionValue}</p>
          </div>

          <div className="py-12">
            <Seal label={copy.menu.sealLabel} className="mx-auto h-56 w-56 text-primary/80" />
            <div className="mx-auto mt-12 max-w-sm">
              <p className="institutional-label">{copy.menu.agendaTitle}</p>
              <ol className="mt-4 space-y-0">
                {copy.menu.agendaItems.map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-4 border-t border-border/40 py-3 first:border-t-0"
                  >
                    <span className="numeric text-[0.68rem] text-primary/80">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm leading-relaxed text-foreground/85">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="border-t border-border/50 pt-5">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{copy.app.offline}</Badge>
              <span className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground/60">
                {copy.app.stageNote}
              </span>
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
              <Link to="/settings">{copy.menu.settings}</Link>
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={corrupt !== null}
        title={copy.menu.corruptTitle}
        confirmLabel={corrupt?.hasBackup === true ? copy.menu.useBackup : copy.menu.newGame}
        cancelLabel={copy.common.close}
        onConfirm={corrupt?.hasBackup === true ? restoreBackup : startOver}
        onCancel={closeCorrupt}
        {...(corrupt?.hasBackup === true
          ? { secondaryLabel: copy.menu.newGame, onSecondary: startOver }
          : {})}
      >
        {corrupt?.hasBackup === true ? copy.menu.corruptBody : copy.menu.corruptNoBackup}
      </ConfirmDialog>
    </main>
  );
}
