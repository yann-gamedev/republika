import type { ComponentType, SVGProps } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { APP_VERSION } from '@republika/shared';

import { copy } from '@/copy/id';
import { mockContentHash, mockStartYear } from '@/features/mock/mockState';
import { formatRupiahTriliun } from '@/format/formatters';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
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

export function GameLayout() {
  const state = useAppStore((store) => store.gameState);
  const feedback = useAppStore((store) => store.feedback);
  const clearFeedback = useAppStore((store) => store.clearFeedback);
  const notify = useAppStore((store) => store.notify);

  const year = campaignYear(state.turn, mockStartYear);
  const quarter = campaignQuarter(state.turn);
  const blocked = state.pendingEvents.length > 0;
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
              <NavEntry key={item.to} item={item} pendingEvents={state.pendingEvents.length} />
            ))}
          </div>

          <p className="institutional-label mt-8 px-4">{copy.nav.sectionArchive}</p>
          <div className="mt-3 space-y-1">
            {ARCHIVE_NAV.map((item) => (
              <NavEntry key={item.to} item={item} pendingEvents={state.pendingEvents.length} />
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
            <Badge variant="outline">{copy.game.mockBadge}</Badge>
            <span className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
              {copy.app.version(APP_VERSION)}
            </span>
          </div>
          <p className="mt-3 px-2 text-[0.65rem] leading-relaxed text-muted-foreground/70">
            {copy.app.stageNote}
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

              <Button
                size="sm"
                variant={blocked ? 'outline' : 'default'}
                disabled={blocked}
                title={blocked ? copy.game.endQuarterBlocked : copy.game.endQuarterHint}
                onClick={() => notify(copy.game.endQuarterHint)}
              >
                {copy.game.endQuarter}
              </Button>
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
              {copy.settings.contentHash} · {mockContentHash.slice(0, 12)}
            </span>
          </div>
        </footer>
      </div>

      {feedback !== null && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 max-w-sm border border-primary/40 bg-card/95 p-4 shadow-document backdrop-blur"
        >
          <p className="text-sm leading-relaxed text-foreground">{feedback}</p>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={clearFeedback}>
              {copy.common.close}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
