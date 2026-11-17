import { Link } from 'react-router-dom';

import { INDICATOR_DOMAINS, INDICATOR_KEYS, type PendingCommand } from '@republika/shared';
import { ministryMultiplier } from '@republika/simulation';

import { PageHeader } from '@/app/PageHeader';
import { campaignQuarter, campaignYear } from '@/app/time';
import { displayIndicator, isFavourable, useGameState } from '@/app/useGame';
import { definitions, eventTitle, factionName, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { reasonText } from '@/features/report/reasonText';
import {
  formatDecimal,
  formatInteger,
  formatRupiahTriliun,
  formatSignedIndicator,
  formatSignedRupiahTriliun,
} from '@/format/formatters';
import { gameController } from '@/store/controller';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Progress } from '@/ui/components/progress';
import { Term, deltaArrow } from '@/ui/components/term';
import { Hemicycle } from '@/ui/charts/Hemicycle';
import { IconChevronRight, IconCoins } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';

function SectionHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="font-serif text-xl leading-none">{title}</h2>
      {note !== undefined && (
        <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
          {note}
        </span>
      )}
    </div>
  );
}

function queueLabel(command: PendingCommand): string {
  return command.type === 'ENACT_POLICY'
    ? copy.dashboard.queueEnact(policyName(command.policyId))
    : copy.dashboard.queueLobby(factionName(command.factionId));
}

export default function DashboardPage() {
  const state = useGameState();
  const lastReport = useGameStore((store) => store.lastReport);
  const year = campaignYear(state.turn, definitions.scenario.startYear);
  const quarter = campaignQuarter(state.turn);
  const unanswered = state.pendingEvents.filter((event) => event.resolvedChoiceId === null);

  const supporters = definitions.factions.filter((faction) => {
    const support = state.factions.find((item) => item.factionId === faction.id);
    return (support?.supportTenths ?? faction.initialSupportTenths) >= 500;
  });
  const supporterSeats = supporters.reduce((total, faction) => total + faction.seats, 0);

  const cancel = (pendingCommandId: string) => {
    const result = gameController.dispatch({
      type: 'CANCEL_PENDING',
      commandId: gameController.newCommandId(),
      pendingCommandId,
    });
    if (result.ok) gameController.notify(copy.dashboard.cancelled);
  };

  return (
    <>
      <PageHeader
        kicker={copy.dashboard.kicker}
        title={copy.dashboard.title}
        subtitle={copy.dashboard.subtitle}
        actions={
          <Badge variant="secondary">{copy.dashboard.quarterOf(state.turn, state.maxTurns)}</Badge>
        }
      />

      {unanswered.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-5 border border-maroon/50 bg-maroon/10 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-maroon/50 bg-maroon/20 font-serif text-lg text-red-200">
            !
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {copy.dashboard.eventBannerTitle} ·{' '}
              {unanswered.map((event) => eventTitle(event.eventId)).join(', ')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {copy.dashboard.eventBannerBody}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="border-maroon/50">
            <Link to="/game/events">{copy.dashboard.eventBannerCta}</Link>
          </Button>
        </div>
      )}

      <section>
        <SectionHeading
          title={copy.dashboard.indicatorSection}
          note={copy.game.turnLabel(year, quarter)}
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {INDICATOR_KEYS.map((key) => {
            const delta = lastReport?.indicatorDeltas[key] ?? 0;
            const favourable = isFavourable(key, delta);
            return (
              <div
                key={key}
                data-testid={`indicator-${key}`}
                className="relative border border-border/60 bg-card/45 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-card/70"
              >
                <span
                  className="absolute left-0 top-0 h-px w-10 bg-primary/50"
                  aria-hidden="true"
                />
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                  <Term explanation={copy.glossary[key]}>{INDICATOR_DOMAINS[key].shortLabel}</Term>
                </p>
                <p className="numeric mt-3 font-serif text-[1.9rem] leading-none text-foreground">
                  {displayIndicator(key, state.indicators[key])}
                </p>
                <p
                  className={cn(
                    'mt-2 text-[0.68rem] leading-snug',
                    delta === 0
                      ? 'text-muted-foreground/70'
                      : favourable
                        ? 'text-emerald-300/80'
                        : 'text-red-300/80',
                  )}
                >
                  {delta === 0
                    ? copy.dashboard.deltaFlat
                    : copy.dashboard.deltaFromLast(deltaArrow(delta), formatSignedIndicator(delta))}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <p className="institutional-label">{copy.dashboard.queueNote}</p>
                <CardTitle className="mt-2">{copy.dashboard.queueTitle}</CardTitle>
              </div>
              <span className="numeric text-xs text-muted-foreground">
                {state.actionPointsRemaining}/{state.actionPointsPerTurn} {copy.common.ap}
              </span>
            </CardHeader>
            <CardContent className="space-y-3" data-testid="command-queue">
              {state.pendingCommands.length === 0 && (
                <p className="text-sm text-muted-foreground">{copy.dashboard.queueEmpty}</p>
              )}
              {state.pendingCommands.map((command) => (
                <div
                  key={command.commandId}
                  className="flex items-center justify-between gap-4 border-t border-border/40 pt-3 first:border-t-0 first:pt-0"
                >
                  <div>
                    <p className="text-sm leading-snug">{queueLabel(command)}</p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      {command.apCost} {copy.common.ap}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => cancel(command.commandId)}>
                    {copy.dashboard.cancel}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <p className="institutional-label">{copy.dashboard.cabinetSection}</p>
                <CardTitle className="mt-2">{copy.cabinet.title}</CardTitle>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/game/cabinet">
                  {copy.cabinet.title}
                  <IconChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.ministries.map((ministryState) => {
                const definition = definitions.ministries.find(
                  (ministry) => ministry.id === ministryState.ministryId,
                );
                if (definition === undefined) return null;
                const activeCount = state.activePolicies.filter((policy) => {
                  const category = definitions.policies.find(
                    (item) => item.id === policy.policyId,
                  )?.category;
                  return category !== undefined && definition.categories.includes(category);
                }).length;
                return (
                  <div key={definition.id} className="grid grid-cols-[minmax(0,1fr)_88px] gap-4">
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm">{definition.name}</p>
                        <span className="text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                          {copy.cabinet.multiplierValue(
                            formatDecimal(ministryMultiplier(ministryState.effectiveness)),
                          )}
                        </span>
                      </div>
                      <Progress
                        className="mt-2"
                        value={ministryState.effectiveness}
                        aria-label={`${definition.name} · ${copy.common.effectiveness}`}
                      />
                      <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
                        {copy.dashboard.ministryPolicyCount(activeCount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="numeric font-serif text-2xl leading-none">
                        {formatInteger(ministryState.effectiveness)}
                      </p>
                      <p className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy.common.effectiveness}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <p className="institutional-label">{copy.dashboard.activePolicies}</p>
                <CardTitle className="mt-2">
                  {copy.dashboard.activeCount(state.activePolicies.length)}
                </CardTitle>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/game/policies">{copy.dashboard.policyCta}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.activePolicies.length === 0 && (
                <p className="text-sm text-muted-foreground">{copy.policies.empty}</p>
              )}
              {state.activePolicies.map((policy) => (
                <div
                  key={policy.policyId}
                  className="flex items-start justify-between gap-4 border-t border-border/40 pt-3 first:border-t-0 first:pt-0"
                >
                  <div>
                    <p className="text-sm leading-snug">{policyName(policy.policyId)}</p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      {copy.policies.activeUntil(policy.remainingTurns)} ·{' '}
                      {policy.perTurnCostBillion === 0
                        ? copy.policies.noPerTurn
                        : `${formatRupiahTriliun(policy.perTurnCostBillion)} ${copy.policies.perTurn.toLowerCase()}`}
                    </p>
                  </div>
                  <Badge variant="success">{copy.common.active}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="institutional-label">{copy.dashboard.coalitionSection}</p>
              <CardTitle className="mt-2">
                {copy.dashboard.coalitionSeats(supporterSeats)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Hemicycle
                ariaLabel={copy.parliament.hemicycleAria}
                centerValue={formatInteger(supporterSeats)}
                centerLabel={copy.common.seats}
                groups={definitions.factions.map((faction) => ({
                  id: faction.id,
                  label: faction.name,
                  seats: faction.seats,
                  color: faction.color,
                }))}
              />
              <div className="mt-4 space-y-2 border-t border-border/50 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{copy.dashboard.supportersNote}</span>
                  <span className="numeric">{copy.parliament.coalitionSeats(supporterSeats)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{copy.parliament.threshold}</span>
                  <span className="numeric">{copy.parliament.thresholdValue}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="institutional-label">{copy.dashboard.latestReport}</p>
              <CardTitle className="mt-2">
                {lastReport === null
                  ? copy.dashboard.noReport
                  : copy.dashboard.latestReportMeta(
                      lastReport.turn,
                      lastReport.year,
                      lastReport.quarter,
                    )}
              </CardTitle>
            </CardHeader>
            {lastReport !== null && (
              <CardContent>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {(['approval', 'fiscalHealth', 'trust'] as const).map((key) => {
                    const cause = lastReport.topCauses[key][0];
                    return (
                      <li key={key}>
                        {copy.dashboard.topCause(
                          INDICATOR_DOMAINS[key].shortLabel,
                          formatSignedIndicator(lastReport.indicatorDeltas[key]),
                        )}
                        {cause !== undefined &&
                          ` — ${reasonText(cause.reasonCode, cause.sourceId)}`}
                      </li>
                    );
                  })}
                  <li>
                    {copy.common.treasury}{' '}
                    {formatSignedRupiahTriliun(lastReport.treasuryDeltaBillion)}
                  </li>
                </ul>
                <Button asChild size="sm" variant="link" className="mt-3 h-auto px-0">
                  <Link to="/game/report">{copy.dashboard.reportCta}</Link>
                </Button>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <p className="institutional-label">{copy.dashboard.budgetTitle}</p>
                <CardTitle className="numeric mt-2">
                  {formatRupiahTriliun(state.treasuryBillion)}
                </CardTitle>
              </div>
              <span className="grid h-10 w-10 place-items-center border border-primary/25 bg-primary/10 text-primary">
                <IconCoins className="h-[18px] w-[18px]" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {copy.dashboard.budgetBody}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
