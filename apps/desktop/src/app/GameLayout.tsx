import { useCallback, useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { APP_VERSION } from '@republika/shared';

import { contentHash, definitions } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { formatRupiahTriliun } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { ConfirmDialog } from '@/ui/components/dialog';
import {
  IconCabinet,
  IconDashboard,
  IconEvent,
  IconHistory,
  IconParliament,
  IconPolicy,
  IconSettings,
} from '@/ui/icons';
import { cn } from '@/ui/lib/utils';
import { Seal } from '@/ui/Seal';

import { campaignQuarter, campaignYear } from './time';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const MAIN_NAV: readonly NavItem[] = [
  { to: '/game/dashboard', label: copy.nav.dashboard, icon: IconDashboard },
  { to: '/game/policies', label: copy.nav.policies, icon: IconPolicy },
  { to: '/game/parliament', label: copy.nav.parliament, icon: IconParliament },
  { to: '/game/cabinet', label: copy.nav.cabinet, icon: IconCabinet },
  { to: '/game/events', label: copy.nav.events, icon: IconEvent },
];

const ARCHIVE_NAV: readonly NavItem[] = [
  { to: '/game/history', label: copy.nav.history, icon: IconHistory },
];

function NavEntry({ item, pendingEvents }: { item: NavItem; pendingEvents: number }) {
  const Icon = item.icon;
  const isEvent = item.to === '/game/events';
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 border-l-2 py-2.5 pl-4 pr-3 text-sm transition-colors',
          isActive
            ? 'border-primary/80 bg-primary/[0.08] text-foreground'
            : 'border-transparent text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground',
        )
      }
    >
      <Icon className="h-[17px] w-[17px] shrink-0 opacity-80" />
      <span className="flex-1">{item.label}</span>
      {isEvent && pendingEvents > 0 && (
        <span className="min-w-5 rounded-full bg-maroon/40 px-1.5 py-0.5 text-center text-[0.6rem] font-semibold text-red-100">
          {pendingEvents}
        </span>
      )}
    </NavLink>
  );
}

/** Urutan halaman untuk pintasan angka 1-6. */
const SHORTCUT_ROUTES = [...MAIN_NAV, ...ARCHIVE_NAV].map((item) => item.to);

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

export function GameLayout() {
  const state = useGameStore((store) => store.state);
  const toast = useGameStore((store) => store.toast);
  const uiStatus = useGameStore((store) => store.uiStatus);
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      if (document.querySelector('[role="dialog"]') !== null) return;
      const index = Number.parseInt(event.key, 10) - 1;
      const route = SHORTCUT_ROUTES[index];
      if (route !== undefined) navigate(route);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const confirmEnd = useCallback(() => {
    setConfirmOpen(false);
    void gameController.endQuarter().then((result) => {
      if (result.ok) navigate('/game/dashboard');
    });
  }, [navigate]);

  if (state === null) return <Navigate to="/" replace />;

  const year = campaignYear(state.turn, definitions.scenario.startYear);
  const quarter = campaignQuarter(state.turn);
  const unanswered = state.pendingEvents.filter((event) => event.resolvedChoiceId === null).length;
  const completed = state.status === 'completed';
  const blocked = unanswered > 0 || completed || uiStatus === 'busy';
  const apSlots = Array.from({ length: state.actionPointsPerTurn }, (_, index) => index);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-border/60 bg-background/80">
        <div className="border-b border-border/50 px-6 py-6">
          <Link to="/" className="flex items-center gap-3">
            <Seal label={copy.menu.sealLabel} className="h-11 w-11" />
            <span>
              <span className="block font-serif text-xl tracking-[0.14em]">{copy.app.name}</span>
              <span className="mt-0.5 block text-[0.62rem] uppercase tracking-institutional text-muted-foreground">
                {copy.game.office}
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="institutional-label px-4">{copy.nav.sectionMain}</p>
          <div className="mt-3 space-y-1">
            {MAIN_NAV.map((item) => (
              <NavEntry key={item.to} item={item} pendingEvents={unanswered} />
            ))}
          </div>

          <p className="institutional-label mt-8 px-4">{copy.nav.sectionArchive}</p>
          <div className="mt-3 space-y-1">
            {ARCHIVE_NAV.map((item) => (
              <NavEntry key={item.to} item={item} pendingEvents={unanswered} />
            ))}
          </div>
        </nav>

        <div className="border-t border-border/50 px-4 py-5">
          <div className="space-y-2">
            <Link
              to="/settings"
              className="flex items-center gap-2 px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <IconSettings className="h-3.5 w-3.5" />
              {copy.nav.settings}
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <span aria-hidden="true">←</span>
              {copy.game.menu}
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 px-2">
            {uiStatus === 'saveFailed' ? (
              <Badge variant="destructive">{copy.game.saveFailed}</Badge>
            ) : (
              <Badge variant="outline">{copy.app.offline}</Badge>
            )}
            <span className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
              {copy.app.version(APP_VERSION)}
            </span>
          </div>
          <p className="mt-3 px-2 text-[0.65rem] leading-relaxed text-muted-foreground/70">
            {copy.app.stageNote} · {copy.game.shortcutHint}
          </p>
        </div>
      </aside>

      <div className="pl-[268px]">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/88 backdrop-blur-md">
          <div className="flex items-center gap-6 px-8 py-4">
            <div className="min-w-0">
              <p className="institutional-label">{copy.game.president}</p>
              <div className="mt-1 flex items-baseline gap-3">
                <p className="truncate font-serif text-lg leading-none">{state.presidentName}</p>
                <span className="truncate text-xs text-muted-foreground">
                  {state.cabinetName ?? copy.game.noCabinet}
                </span>
              </div>
            </div>

            <div className="vertical-rule hidden h-10 xl:block" />

            <div className="hidden xl:block">
              <p className="institutional-label">{copy.common.turn}</p>
              <p className="mt-1 text-sm">
                {copy.game.turnLabel(year, quarter)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {copy.game.turnProgress(state.turn, state.maxTurns)}
                </span>
              </p>
            </div>

            <div className="ml-auto flex items-center gap-5">
              <div>
                <p className="institutional-label">{copy.game.apLabel}</p>
                <div className="mt-1.5 flex items-center gap-1.5" aria-label={copy.game.apLabel}>
                  {apSlots.map((slot) => (
                    <span
                      key={slot}
                      className={cn(
                        'block h-2 w-6 border',
                        slot < state.actionPointsRemaining
                          ? 'border-primary/70 bg-primary/70'
                          : 'border-border bg-transparent',
                      )}
                    />
                  ))}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {state.actionPointsRemaining}/{state.actionPointsPerTurn}
                  </span>
                </div>
              </div>

              <div className="min-w-[112px] border-l border-border/50 pl-5">
                <p className="institutional-label">{copy.game.treasuryLabel}</p>
                <p className="numeric mt-1 text-sm font-medium">
                  {formatRupiahTriliun(state.treasuryBillion)}
                </p>
              </div>

              {completed ? (
                <Button size="sm" variant="outline" onClick={() => navigate('/game/dashboard')}>
                  {copy.game.campaignCompleted}
                </Button>
              ) : (
                <div className="flex flex-col items-end">
                  <Button
                    size="sm"
                    variant={blocked ? 'outline' : 'default'}
                    disabled={blocked}
                    title={unanswered > 0 ? copy.game.endQuarterBlocked : copy.game.endQuarterHint}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {copy.game.endQuarter}
                  </Button>
                  {unanswered > 0 && (
                    <Link
                      to="/game/events"
                      className="mt-1 max-w-[220px] text-right text-[0.62rem] leading-snug text-red-200/80 hover:text-red-100"
                    >
                      {copy.game.endQuarterBlocked}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-8 pb-16 pt-8">
          <div className="mx-auto max-w-[1180px]">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border/40 px-8 py-5">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/60">
            <span>{copy.menu.footerNote}</span>
            <span>
              {copy.settings.contentHash} · {contentHash.slice(0, 12)}
            </span>
          </div>
        </footer>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={copy.game.endQuarterConfirmTitle}
        confirmLabel={copy.game.endQuarterConfirm}
        cancelLabel={copy.common.cancel}
        onConfirm={confirmEnd}
        onCancel={closeConfirm}
      >
        {copy.game.endQuarterConfirmBody(state.pendingCommands.length, state.actionPointsRemaining)}
      </ConfirmDialog>

      {toast !== null && (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'fixed bottom-6 right-6 z-50 max-w-sm border bg-card/95 p-4 shadow-document backdrop-blur',
            toast.tone === 'error' ? 'border-maroon/70' : 'border-primary/40',
          )}
        >
          <p className="text-sm leading-relaxed text-foreground">{toast.message}</p>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => gameController.dismissToast()}>
              {copy.common.close}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
