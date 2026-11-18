import { useCallback, useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { APP_VERSION } from '@republika/shared';

import { definitions } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { formatRupiahTriliun } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { useGameStore } from '@/store/gameStore';
import { ApTokens } from '@/ui/ApTokens';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { ConfirmDialog } from '@/ui/components/dialog';
import {
  IconArrowLeft,
  IconCabinet,
  IconDesk,
  IconEvent,
  IconFolder,
  IconHistory,
  IconNews,
  IconParliament,
  IconPolicy,
  IconSettings,
} from '@/ui/icons';
import { cn } from '@/ui/lib/utils';
import { QuarterTrack } from '@/ui/QuarterTrack';
import { RepublicMark } from '@/ui/RepublicMark';

import { ScreenErrorBoundary } from './ScreenErrorBoundary';
import { campaignQuarter, campaignYear } from './time';

type BadgeKind = 'bills' | 'events';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly badge?: BadgeKind;
}

const MAIN_NAV: readonly NavItem[] = [
  { to: '/game/dashboard', label: copy.nav.dashboard, icon: IconDesk },
  { to: '/game/policies', label: copy.nav.policies, icon: IconPolicy },
  { to: '/game/parliament', label: copy.nav.parliament, icon: IconParliament, badge: 'bills' },
  { to: '/game/cabinet', label: copy.nav.cabinet, icon: IconCabinet },
  { to: '/game/events', label: copy.nav.events, icon: IconEvent, badge: 'events' },
  { to: '/game/report', label: copy.nav.report, icon: IconNews },
];

const ARCHIVE_NAV: readonly NavItem[] = [
  { to: '/game/history', label: copy.nav.history, icon: IconHistory },
];

const UTILITY_NAV: readonly NavItem[] = [
  { to: '/saves', label: copy.nav.saves, icon: IconFolder },
  { to: '/settings', label: copy.nav.settings, icon: IconSettings },
  { to: '/', label: copy.nav.menu, icon: IconArrowLeft },
];

/** Urutan halaman untuk pintasan angka 1–7. */
export const SHORTCUT_ROUTES = [...MAIN_NAV, ...ARCHIVE_NAV].map((item) => item.to);

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors duration-150 ease-standard',
    isActive
      ? 'bg-raised text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
      : 'text-text-secondary hover:bg-raised hover:text-foreground',
  );

function NavEntry({ item, counts }: { item: NavItem; counts: Record<BadgeKind, number> }) {
  const Icon = item.icon;
  const count = item.badge === undefined ? 0 : counts[item.badge];
  return (
    <NavLink to={item.to} end={item.to === '/'} className={navClass}>
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge === 'events' && count > 0 && (
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
          aria-label={copy.nav.eventsBadge(count)}
        >
          {count}
        </span>
      )}
      {item.badge === 'bills' && count > 0 && (
        <span className="font-mono text-xs text-muted-foreground">
          {copy.nav.billsBadge(count)}
        </span>
      )}
    </NavLink>
  );
}

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
  const location = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }
      if (document.querySelector('[role="dialog"]') !== null) return;
      const index = Number.parseInt(event.key, 10) - 1;
      const route = SHORTCUT_ROUTES[index];
      if (route !== undefined) navigate(route);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Toast sukses/info tertutup sendiri (timer sekali jalan); toast error menunggu pengguna.
  useEffect(() => {
    if (toast === null || toast.tone === 'error') return undefined;
    const timer = window.setTimeout(() => gameController.dismissToast(), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const confirmEnd = useCallback(() => {
    setConfirmOpen(false);
    void gameController.endQuarter().then((result) => {
      if (!result.ok) return;
      const finished = gameController.state?.status === 'completed';
      navigate(finished ? '/game/final' : '/game/report');
    });
  }, [navigate]);

  if (state === null) return <Navigate to="/" replace />;

  const year = campaignYear(state.turn, definitions.scenario.startYear);
  const quarter = campaignQuarter(state.turn);
  const unanswered = state.pendingEvents.filter((event) => event.resolvedChoiceId === null).length;
  const bills = state.pendingCommands.filter(
    (command) =>
      command.type === 'ENACT_POLICY' &&
      definitions.policies.find((policy) => policy.id === command.policyId)?.needsVote === true,
  ).length;
  const counts: Record<BadgeKind, number> = { bills, events: unanswered };
  const completed = state.status === 'completed';
  const busy = uiStatus === 'busy';
  const blocked = unanswered > 0 || completed || busy;
  const blockedReason =
    unanswered > 0
      ? copy.game.endQuarterReasonEvents(unanswered)
      : busy
        ? copy.game.endQuarterReasonBusy
        : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-6 border-b border-border bg-sidebar px-6">
        <Link to="/game/dashboard" className="flex w-[200px] shrink-0 items-center gap-2.5">
          <RepublicMark />
          <span className="font-serif text-[17px] font-medium">{copy.menu.wordmark}</span>
        </Link>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{copy.game.president}</span>
          <span className="truncate text-sm font-medium">{state.presidentName}</span>
        </div>

        <div className="flex w-[300px] min-w-[220px] shrink flex-col gap-1.5">
          <span className="flex justify-between text-xs text-muted-foreground">
            <span>{copy.game.turnLabel(year, quarter)}</span>
            <span className="font-mono">
              {state.turn} / {state.maxTurns}
            </span>
          </span>
          <QuarterTrack
            current={state.turn}
            total={state.maxTurns}
            label={copy.game.quarterTrack(state.turn, state.maxTurns)}
            className="w-full [&>span]:flex-1"
          />
        </div>

        <div className="ml-auto flex items-center gap-6">
          <div className="flex items-center gap-2" title={copy.game.apLabel}>
            <ApTokens
              remaining={state.actionPointsRemaining}
              total={state.actionPointsPerTurn}
              label={copy.game.apTokens(state.actionPointsRemaining, state.actionPointsPerTurn)}
            />
            <span className="text-[13px] text-text-secondary">
              {copy.game.apShort(state.actionPointsRemaining)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{copy.game.treasuryLabel}</span>
            <span className="numeric text-sm font-medium">
              {formatRupiahTriliun(state.treasuryBillion)}
            </span>
          </div>

          {completed ? (
            <Button size="sm" variant="outline" onClick={() => navigate('/game/final')}>
              {copy.game.campaignCompleted}
            </Button>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                disabled={blocked}
                aria-describedby={blockedReason === null ? undefined : 'end-quarter-reason'}
                title={blockedReason ?? copy.game.endQuarterHint}
                onClick={() => setConfirmOpen(true)}
              >
                {copy.game.endQuarter}
              </Button>
              {blockedReason !== null && (
                <Link
                  id="end-quarter-reason"
                  to="/game/events"
                  className="text-xs text-text-secondary underline-offset-2 hover:text-foreground hover:underline"
                >
                  {blockedReason}
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          aria-label={copy.nav.label}
          className="sticky top-16 flex h-[calc(100vh-4rem)] w-[232px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border bg-sidebar px-4 py-6"
        >
          <span className="px-3 pb-2 text-xs text-muted-foreground">{copy.nav.sectionMain}</span>
          {MAIN_NAV.map((item) => (
            <NavEntry key={item.to} item={item} counts={counts} />
          ))}
          <span className="px-3 pb-2 pt-6 text-xs text-muted-foreground">
            {copy.nav.sectionArchive}
          </span>
          {ARCHIVE_NAV.map((item) => (
            <NavEntry key={item.to} item={item} counts={counts} />
          ))}
          <div className="mt-auto flex flex-col gap-0.5 pt-6">
            {UTILITY_NAV.map((item) => (
              <NavEntry key={item.to} item={item} counts={counts} />
            ))}
            <div className="mt-4 flex items-center justify-between gap-2 px-3">
              {uiStatus === 'saveFailed' ? (
                <Badge variant="destructive">{copy.game.saveFailed}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">{copy.app.offline}</span>
              )}
              <span className="font-mono text-xs text-muted-foreground">{APP_VERSION}</span>
            </div>
          </div>
        </nav>

        <main className="min-w-0 flex-1 px-8 pb-16 pt-8">
          <div className="mx-auto max-w-[1280px]">
            <ScreenErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </ScreenErrorBoundary>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={helpOpen}
        title={copy.shortcuts.title}
        confirmLabel={copy.common.close}
        onConfirm={closeHelp}
        onCancel={closeHelp}
      >
        <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-2">
          {copy.shortcuts.items.map(([key, description]) => (
            <div key={key} className="contents">
              <dt>
                <kbd className="rounded-sm border border-border bg-raised px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {key}
                </kbd>
              </dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      </ConfirmDialog>

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
          aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
          className={cn(
            'fixed bottom-6 right-6 z-50 w-80 rounded-lg border bg-raised p-4 shadow-document',
            toast.tone === 'error' ? 'border-negative/60' : 'border-primary/40',
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
