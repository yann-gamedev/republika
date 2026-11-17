import { Link } from 'react-router-dom';

import { INDICATOR_DOMAINS, INDICATOR_KEYS, type IndicatorKey } from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { campaignQuarter, campaignYear } from '@/app/time';
import { copy } from '@/copy/id';
import {
  mockDefinitions,
  mockLatestReport,
  mockMinisterNames,
  mockPolicyName,
  mockPreviousIndicators,
  mockStartYear,
  mockTrend,
} from '@/features/mock/mockState';
import {
  formatDecimal,
  formatIndicator,
  formatInteger,
  formatPercentTenths,
  formatRupiahTriliun,
  formatSignedIndicator,
  formatSignedRupiahTriliun,
} from '@/format/formatters';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Progress } from '@/ui/components/progress';
import { Hemicycle } from '@/ui/charts/Hemicycle';
import { LineChart } from '@/ui/charts/LineChart';
import { IconChevronRight, IconCoins } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';

function displayIndicator(key: IndicatorKey, valueTenths: number): string {
  return INDICATOR_DOMAINS[key].unit === 'percent'
    ? formatPercentTenths(valueTenths)
    : formatIndicator(valueTenths);
}

function isFavourable(key: IndicatorKey, delta: number): boolean {
  if (delta === 0) return false;
  if (key === 'inflationPct' || key === 'unemploymentPct') return delta < 0;
  return delta > 0;
}

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

export default function DashboardPage() {
  const state = useAppStore((store) => store.gameState);
  const year = campaignYear(state.turn, mockStartYear);
  const quarter = campaignQuarter(state.turn);
  const pendingEvent = mockDefinitions.events.find((event) =>
    state.pendingEvents.some((pending) => pending.eventId === event.id),
  );

  const deltaFor = (key: IndicatorKey): number =>
    state.indicators[key] - mockPreviousIndicators[key];

  const coalitionSeats = mockDefinitions.factions.reduce((total, faction) => {
    const support = state.factions.find((item) => item.factionId === faction.id);
    return (support?.supportTenths ?? faction.initialSupportTenths) >= 500
      ? total + faction.seats
      : total;
  }, 0);

  return (
    <>
      <PageHeader
        kicker={copy.dashboard.kicker}
        title={copy.dashboard.title}
        subtitle={copy.dashboard.subtitle}
        actions={<Badge variant="outline">{copy.game.mockBadge}</Badge>}
      />

      {state.pendingEvents.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-5 border border-maroon/50 bg-maroon/10 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-maroon/50 bg-maroon/20 font-serif text-lg text-red-200">
            !
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {copy.dashboard.eventBannerTitle}
              {pendingEvent !== undefined && ` · ${pendingEvent.title}`}
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
          note={copy.dashboard.indicatorTrend}
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {INDICATOR_KEYS.map((key) => {
            const domain = INDICATOR_DOMAINS[key];
            const value = state.indicators[key];
            const delta = deltaFor(key);
            const favourable = isFavourable(key, delta);
            return (
              <div
                key={key}
                className="relative border border-border/60 bg-card/45 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-card/70"
              >
                <span
                  className="absolute left-0 top-0 h-px w-10 bg-primary/50"
                  aria-hidden="true"
                />
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {domain.shortLabel}
                </p>
                <p className="numeric mt-3 font-serif text-[1.9rem] leading-none text-foreground">
                  {displayIndicator(key, value)}
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
                    : copy.dashboard.deltaFromLast(formatSignedIndicator(delta))}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <p className="institutional-label">{copy.dashboard.indicatorTrend}</p>
              <CardTitle className="mt-2">{copy.dashboard.chartAria}</CardTitle>
            </div>
            <Badge variant="secondary">{copy.common.turn}</Badge>
          </CardHeader>
          <CardContent>
            <LineChart
              ariaLabel={copy.dashboard.chartAria}
              labels={mockTrend.map((point) =>
                copy.dashboard.quarterTick(point.year, point.quarter),
              )}
              series={[
                {
                  id: 'approval',
                  label: copy.dashboard.approval,
                  color: 'hsl(41 42% 58%)',
                  values: mockTrend.map((point) => point.approvalTenths),
                },
                {
                  id: 'trust',
                  label: copy.dashboard.trust,
                  color: 'hsl(2 44% 60%)',
                  values: mockTrend.map((point) => point.trustTenths),
                },
              ]}
              formatValue={formatIndicator}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="institutional-label">{copy.dashboard.coalitionSection}</p>
            <CardTitle className="mt-2">{copy.dashboard.coalitionSeats(coalitionSeats)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Hemicycle
              ariaLabel={copy.parliament.hemicycleAria}
              centerValue={formatInteger(100)}
              centerLabel={copy.common.seats}
              groups={mockDefinitions.factions.map((faction) => ({
                id: faction.id,
                label: faction.name,
                seats: faction.seats,
                color: faction.color,
              }))}
            />
            <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{copy.parliament.coalition}</span>
                <span className="numeric">{copy.parliament.coalitionSeats(coalitionSeats)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{copy.parliament.opposition}</span>
                <span className="numeric">
                  {copy.parliament.oppositionSeats(100 - coalitionSeats)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{copy.parliament.threshold}</span>
                <span className="numeric">{copy.parliament.thresholdValue}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
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
              const definition = mockDefinitions.ministries.find(
                (ministry) => ministry.id === ministryState.ministryId,
              );
              if (definition === undefined) return null;
              const multiplier = 0.8 + (0.4 * (ministryState.effectiveness - 40)) / 50;
              const activeCount = state.activePolicies.filter((policy) => {
                const policyDefinition = mockDefinitions.policies.find(
                  (item) => item.id === policy.policyId,
                );
                return policyDefinition?.category === definition.categories[0];
              }).length;
              return (
                <div key={definition.id} className="grid grid-cols-[minmax(0,1fr)_88px] gap-4">
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm">{definition.name}</p>
                      <span className="text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                        {copy.cabinet.multiplierValue(formatDecimal(multiplier))}
                      </span>
                    </div>
                    <Progress className="mt-2" value={ministryState.effectiveness} />
                    <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
                      {mockMinisterNames[definition.id] ?? copy.cabinet.noLead} ·{' '}
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
                    <p className="text-sm leading-snug">{mockPolicyName(policy.policyId)}</p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      {copy.policies.activeUntil(policy.remainingTurns)} ·{' '}
                      {formatRupiahTriliun(policy.perTurnCostBillion)}
                    </p>
                  </div>
                  <Badge variant="success">{copy.common.active}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="institutional-label">{copy.dashboard.latestReport}</p>
              <CardTitle className="mt-2">
                {copy.dashboard.latestReportMeta(
                  mockLatestReport.turn,
                  mockLatestReport.year,
                  mockLatestReport.quarter,
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {mockLatestReport.summary[0]}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[0.68rem]">
                <span className="text-red-300/80">
                  {copy.dashboard.approval}{' '}
                  {formatSignedIndicator(mockLatestReport.approvalDeltaTenths)}
                </span>
                <span className="text-red-300/80">
                  {copy.common.treasury}{' '}
                  {formatSignedRupiahTriliun(mockLatestReport.treasuryDeltaBillion)}
                </span>
              </div>
              <Button asChild size="sm" variant="link" className="mt-3 h-auto px-0">
                <Link to="/game/history">{copy.nav.history}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <p className="institutional-label">{copy.dashboard.budgetTitle}</p>
                <CardTitle className="mt-2 numeric">
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

      <div className="mt-4 flex items-center justify-between gap-4 text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground/60">
        <span>{copy.dashboard.briefingTitle}</span>
        <span>
          {copy.game.turnLabel(year, quarter)} ·{' '}
          {copy.dashboard.pendingCount(state.pendingEvents.length)}
        </span>
      </div>
    </>
  );
}
