import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  INDICATOR_DOMAINS,
  INDICATOR_KEYS,
  type IndicatorKey,
  type PendingCommand,
} from '@republika/shared';
import { predictVote } from '@republika/simulation';

import { displayIndicator, isFavourable, useGameState } from '@/app/useGame';
import { eventArt, sceneArt } from '@/content/art';
import {
  candidateName,
  definitions,
  eventTitle,
  factionName,
  policyName,
  provinceName,
  roleTitle,
} from '@/content/gameContent';
import { copy } from '@/copy/id';
import { formatSignedIndicator } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { useGameStore } from '@/store/gameStore';
import { ArtImage } from '@/ui/ArtImage';
import { Button } from '@/ui/components/button';
import { LineChart } from '@/ui/charts/LineChart';
import { IconArrowRight } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';

import { factionStance, latestEventId, trendFromReports, type TrendPoint } from './desk';

const quietArt = sceneArt('dashboard-desk');

function Panel({
  id,
  title,
  aside,
  children,
  className,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn('flex flex-col gap-4 rounded-2xl border border-border bg-card p-6', className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="font-sans text-base font-medium tracking-normal">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function lobbyBonusesOf(commands: readonly PendingCommand[]): Record<string, number> {
  return Object.fromEntries(
    commands.flatMap((command) =>
      command.type === 'LOBBY_FACTION'
        ? [[command.factionId, definitions.scenario.lobbySupportBonusTenths] as const]
        : [],
    ),
  );
}

function deltaClass(key: IndicatorKey, delta: number): string {
  if (delta === 0) return 'text-muted-foreground';
  return isFavourable(key, delta) ? 'text-positive' : 'text-negative';
}

export default function DashboardPage() {
  const state = useGameState();
  const lastReport = useGameStore((store) => store.lastReport);
  const [selected, setSelected] = useState<IndicatorKey>('approval');
  const [trend, setTrend] = useState<readonly TrendPoint[]>([]);

  // K5: history dimuat lazy saat Meja kerja dibuka, lalu diringkas jadi ≤ 5 titik.
  useEffect(() => {
    let active = true;
    void gameController
      .loadHistory()
      .then((history) => {
        if (active) setTrend(trendFromReports(history.reports));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [state.turn]);

  const pendingEvents = state.pendingEvents;
  const unanswered = pendingEvents.filter((event) => event.resolvedChoiceId === null).length;
  const lobbyBonuses = useMemo(
    () => lobbyBonusesOf(state.pendingCommands),
    [state.pendingCommands],
  );
  const bills = state.pendingCommands.filter((command) => command.type === 'ENACT_POLICY').length;

  const cancel = (pendingCommandId: string) => {
    const result = gameController.dispatch({
      type: 'CANCEL_PENDING',
      commandId: gameController.newCommandId(),
      pendingCommandId,
    });
    if (result.ok) gameController.notify(copy.dashboard.cancelled);
  };

  const domain = INDICATOR_DOMAINS[selected];
  const trendLabels = trend.map((point) => copy.dashboard.quarterTick(point.year, point.quarter));
  const trendValues = trend.map((point) => point.indicators[selected] / 10);

  const newsEventId = latestEventId(lastReport);
  const factionsBySeats = [...definitions.factions].sort(
    (left, right) => right.seats - left.seats || left.id.localeCompare(right.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-[34px] font-normal leading-tight">{copy.dashboard.title}</h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          {copy.dashboard.subtitle(unanswered, bills)}
        </p>
      </header>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        <Panel
          id="desk-inbox"
          title={copy.dashboard.inboxTitle}
          aside={
            <span className="text-[13px] text-muted-foreground">{copy.dashboard.inboxNote}</span>
          }
        >
          <div className="grid grid-cols-2 gap-4" data-testid="command-queue">
            {pendingEvents.length === 0 && state.pendingCommands.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">
                {copy.dashboard.inboxEmpty}
                <span className="sr-only"> {copy.dashboard.queueEmpty}</span>
              </p>
            )}

            {pendingEvents.map((pending) => {
              const definition = definitions.events.find((event) => event.id === pending.eventId);
              const answered = pending.resolvedChoiceId !== null;
              return (
                <Link
                  key={pending.eventId}
                  to="/game/events"
                  className="group relative block text-ink transition-transform duration-150 ease-standard hover:-translate-y-[3px] motion-reduce:hover:translate-y-0"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-[6px_-6px_-6px_6px] rounded-sm bg-[#CFC6B2]"
                  />
                  <span className="relative flex min-h-[176px] flex-col gap-2 rounded-sm bg-paper p-5">
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        answered ? 'text-ink-muted' : 'text-urgent',
                      )}
                    >
                      {answered ? copy.dashboard.noteAnswered : copy.dashboard.noteKicker}
                    </span>
                    <span className="font-serif text-[21px] leading-tight">
                      {eventTitle(pending.eventId)}
                    </span>
                    <span className="line-clamp-2 text-[13px] leading-5 text-ink-muted">
                      {definition?.body ?? ''} {copy.dashboard.noteFree}.
                    </span>
                    <span className="mt-auto flex items-center gap-1.5 text-[13px] font-medium">
                      {copy.dashboard.noteOpen}
                      <IconArrowRight className="h-4 w-4" />
                    </span>
                  </span>
                </Link>
              );
            })}

            {state.pendingCommands.map((command) => {
              if (command.type !== 'ENACT_POLICY') {
                return (
                  <div
                    key={command.commandId}
                    className="flex min-h-[120px] flex-col gap-2 rounded-sm border border-border bg-raised p-5"
                  >
                    <span className="text-xs font-medium text-text-secondary">
                      {command.type === 'LOBBY_FACTION'
                        ? copy.dashboard.lobbyKicker
                        : command.type === 'RESHUFFLE'
                          ? copy.dashboard.reshuffleKicker
                          : copy.dashboard.provinceKicker}
                    </span>
                    <span className="font-serif text-lg leading-tight">
                      {command.type === 'LOBBY_FACTION'
                        ? copy.dashboard.queueLobby(factionName(command.factionId))
                        : command.type === 'RESHUFFLE'
                          ? copy.dashboard.queueReshuffle(
                              roleTitle(command.roleId),
                              candidateName(command.candidateId),
                            )
                          : copy.dashboard.queueProvince(
                              copy.map.actions[command.action],
                              provinceName(command.provinceId),
                            )}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-auto self-start px-0"
                      onClick={() => cancel(command.commandId)}
                    >
                      {copy.dashboard.cancel}
                    </Button>
                  </div>
                );
              }
              const policy = definitions.policies.find((item) => item.id === command.policyId);
              const prediction =
                policy?.needsVote === true
                  ? predictVote(state, command.policyId, definitions, lobbyBonuses)
                  : null;
              return (
                <div
                  key={command.commandId}
                  className="flex min-h-[176px] flex-col gap-2 rounded-sm border border-border bg-raised p-5"
                >
                  <span className="text-xs font-medium text-text-secondary">
                    {prediction === null ? copy.dashboard.billNoVote : copy.dashboard.billKicker}
                  </span>
                  <span className="font-serif text-[21px] leading-tight">
                    {policyName(command.policyId)}
                  </span>
                  <span className="text-[13px] leading-5 text-text-secondary">
                    {prediction === null
                      ? copy.dashboard.billNoVoteBody
                      : copy.dashboard.billEstimate(prediction.yesSeats)}
                  </span>
                  {prediction !== null && (
                    <div
                      aria-hidden="true"
                      className="relative mt-auto h-1.5 rounded-full bg-raised-hover"
                    >
                      <div
                        className={cn(
                          'h-1.5 rounded-full',
                          prediction.passed ? 'bg-primary' : 'bg-negative',
                        )}
                        style={{ width: `${prediction.yesSeats}%` }}
                      />
                      <div className="absolute left-[51%] top-[-4px] h-3.5 w-0.5 bg-foreground" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn('self-start px-0', prediction === null && 'mt-auto')}
                    onClick={() => cancel(command.commandId)}
                  >
                    {copy.dashboard.cancel}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-text-secondary">
            <span>{copy.dashboard.apLeft(state.actionPointsRemaining)}</span>
            <Button asChild size="sm" variant="secondary" className="ml-auto">
              <Link to="/game/policies">{copy.dashboard.proposePolicy}</Link>
            </Button>
          </div>
        </Panel>

        <Panel
          id="desk-indicators"
          title={copy.dashboard.indicatorsTitle}
          aside={<span className="text-xs text-muted-foreground">{copy.dashboard.vsLast}</span>}
          className="gap-1 p-4 [&>div:first-child]:px-3 [&>div:first-child]:pb-2 [&>div:first-child]:pt-1"
        >
          {INDICATOR_KEYS.map((key) => {
            const delta = lastReport?.indicatorDeltas[key] ?? 0;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                data-testid={`indicator-${key}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(key)}
                className={cn(
                  'grid h-10 w-full grid-cols-[1fr_auto_56px] items-center gap-3 rounded-md px-3 text-left text-sm transition-colors duration-150 ease-standard hover:bg-raised',
                  isSelected && 'bg-raised',
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isSelected ? 'bg-primary' : 'bg-transparent',
                    )}
                  />
                  {INDICATOR_DOMAINS[key].shortLabel}
                </span>
                <span className="numeric font-medium">
                  {displayIndicator(key, state.indicators[key])}
                </span>
                <span className={cn('text-right font-mono text-xs', deltaClass(key, delta))}>
                  {formatSignedIndicator(delta)}
                </span>
              </button>
            );
          })}
        </Panel>
      </div>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        <Panel
          id="desk-direction"
          title={copy.dashboard.directionTitle(domain.shortLabel)}
          aside={
            <span className="numeric font-serif text-[32px]">
              {displayIndicator(selected, state.indicators[selected])}
            </span>
          }
        >
          <p className="-mt-3 text-[13px] text-muted-foreground">{copy.dashboard.directionHint}</p>
          {trend.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {copy.dashboard.directionEmpty}
            </p>
          ) : (
            <LineChart
              ariaLabel={copy.dashboard.directionAria(domain.shortLabel)}
              labels={trendLabels}
              series={[
                {
                  id: selected,
                  label: domain.shortLabel,
                  color: '#C9A227',
                  values: trendValues,
                },
              ]}
              height={220}
            />
          )}
        </Panel>

        <section
          aria-labelledby="desk-news"
          className="flex flex-col overflow-hidden rounded-2xl bg-paper text-ink"
        >
          <ArtImage
            load={newsEventId === null ? quietArt : eventArt(newsEventId)}
            alt={
              newsEventId === null
                ? copy.art.scenes['dashboard-desk']
                : copy.art.event(eventTitle(newsEventId))
            }
            className="h-[200px] w-full shrink-0"
          />
          <div className="flex flex-col gap-2 p-5">
            <span id="desk-news" className="text-xs font-medium text-ink-muted">
              {copy.dashboard.newsKicker}
            </span>
            <span className="font-serif text-xl leading-snug">
              {lastReport === null
                ? copy.dashboard.newsEmpty
                : newsEventId === null
                  ? copy.dashboard.newsQuiet
                  : eventTitle(newsEventId)}
            </span>
            {lastReport !== null && (
              <Link
                to="/game/report"
                className="mt-1 text-[13px] font-medium text-[#7A5A0A] underline-offset-2 hover:underline"
              >
                {copy.dashboard.newsCta}
              </Link>
            )}
          </div>
        </section>
      </div>

      <Panel
        id="desk-coalition"
        title={copy.dashboard.coalitionTitle}
        aside={
          <Link to="/game/parliament" className="text-[13px] text-primary hover:underline">
            {copy.dashboard.openParliament}
          </Link>
        }
      >
        <div
          role="img"
          aria-label={copy.dashboard.coalitionAria}
          className="flex h-3 gap-0.5 overflow-hidden rounded-md"
        >
          {factionsBySeats.map((faction) => (
            <div
              key={faction.id}
              style={{ flex: `${faction.seats} 1 0`, backgroundColor: faction.color }}
            />
          ))}
        </div>
        <ul className="grid grid-cols-3 gap-x-6 gap-y-2">
          {factionsBySeats.map((faction) => {
            const support =
              state.factions.find((item) => item.factionId === faction.id)?.supportTenths ??
              faction.initialSupportTenths;
            return (
              <li
                key={faction.id}
                className="flex items-center gap-2 text-[13px] text-text-secondary"
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: faction.color }}
                />
                <span className="truncate text-foreground">{faction.name}</span>
                <span className="ml-auto shrink-0 font-mono text-xs">
                  {copy.dashboard.factionLegend(
                    faction.seats,
                    copy.dashboard.stance[factionStance(support)],
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
