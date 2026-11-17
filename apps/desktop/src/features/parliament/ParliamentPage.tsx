import { POLICY_CATEGORIES } from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { copy } from '@/copy/id';
import { mockDefinitions } from '@/features/mock/mockState';
import { formatIndicator, formatInteger, formatRupiahTriliun } from '@/format/formatters';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Progress } from '@/ui/components/progress';
import { Hemicycle } from '@/ui/charts/Hemicycle';
import { IconCoins, IconVote } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';

const COALITION_SUPPORT = 500;

export default function ParliamentPage() {
  const state = useAppStore((store) => store.gameState);
  const mockSelections = useAppStore((store) => store.mockSelections);
  const recordMockChoice = useAppStore((store) => store.recordMockChoice);

  const factions = mockDefinitions.factions.map((faction) => {
    const factionState = state.factions.find((item) => item.factionId === faction.id);
    return {
      faction,
      supportTenths: factionState?.supportTenths ?? faction.initialSupportTenths,
    };
  });

  const coalitionSeats = factions.reduce(
    (total, item) => (item.supportTenths >= COALITION_SUPPORT ? total + item.faction.seats : total),
    0,
  );
  const totalSeats = factions.reduce((total, item) => total + item.faction.seats, 0);
  const lobbyCost = formatRupiahTriliun(mockDefinitions.scenario.lobbyCostBillion);
  const lobbyBonus = formatIndicator(mockDefinitions.scenario.lobbySupportBonusTenths);

  return (
    <>
      <PageHeader
        kicker={copy.parliament.kicker}
        title={copy.parliament.title}
        subtitle={copy.parliament.subtitle}
        actions={<Badge variant="outline">{copy.parliament.thresholdValue}</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <p className="institutional-label">{copy.parliament.totalSeats}</p>
            <CardTitle className="mt-2">{copy.parliament.hemicycleAria}</CardTitle>
          </CardHeader>
          <CardContent>
            <Hemicycle
              ariaLabel={copy.parliament.hemicycleAria}
              centerValue={formatInteger(totalSeats)}
              centerLabel={copy.common.seats}
              groups={mockDefinitions.factions.map((faction) => ({
                id: faction.id,
                label: faction.name,
                seats: faction.seats,
                color: faction.color,
              }))}
            />
            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                  {copy.parliament.coalition}
                </p>
                <p className="numeric mt-1 text-sm">
                  {copy.parliament.coalitionSeats(coalitionSeats)}
                </p>
              </div>
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                  {copy.parliament.opposition}
                </p>
                <p className="numeric mt-1 text-sm">
                  {copy.parliament.oppositionSeats(totalSeats - coalitionSeats)}
                </p>
              </div>
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                  {copy.parliament.threshold}
                </p>
                <p className="numeric mt-1 text-sm">{copy.parliament.thresholdValue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="institutional-label">{copy.parliament.support}</p>
            <CardTitle className="mt-2">{copy.parliament.totalSeats}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {factions.map((item) => (
              <div key={item.faction.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2"
                      style={{ backgroundColor: item.faction.color }}
                    />
                    {item.faction.shortName}
                  </span>
                  <span className="numeric text-xs">{formatIndicator(item.supportTenths)}</span>
                </div>
                <Progress className="mt-1.5" value={item.supportTenths / 10} />
              </div>
            ))}
            <p className="border-t border-border/50 pt-3 text-[0.65rem] leading-relaxed text-muted-foreground">
              {copy.parliament.coalitionNote}
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-serif text-xl leading-none">{copy.parliament.kicker}</h2>
          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            {copy.parliament.lobbyCost(lobbyCost)} · {copy.parliament.lobbyBonus(lobbyBonus)}
          </span>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {factions.map(({ faction, supportTenths }) => {
            const lobbied =
              state.lobbyThisTurn.includes(faction.id) ||
              mockSelections[`lobby:${faction.id}`] !== undefined;
            const inCoalition = supportTenths >= COALITION_SUPPORT;
            return (
              <article
                key={faction.id}
                className={cn(
                  'border border-border/60 bg-card/35 p-5 transition-colors',
                  inCoalition
                    ? 'border-emerald-800/35 bg-emerald-950/10'
                    : 'hover:border-primary/30 hover:bg-card/55',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="inline-block h-3 w-3 shrink-0"
                        style={{ backgroundColor: faction.color }}
                      />
                      <h3 className="truncate font-serif text-lg leading-tight">{faction.name}</h3>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {faction.description}
                    </p>
                  </div>
                  <Badge variant={inCoalition ? 'success' : 'outline'}>
                    {inCoalition ? copy.parliament.coalition : copy.parliament.opposition}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-y border-border/40 py-3">
                  <div>
                    <p className="text-[0.56rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {copy.parliament.seats}
                    </p>
                    <p className="numeric mt-0.5 text-sm">
                      {copy.parliament.seatShare(faction.seats)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.56rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {copy.parliament.support}
                    </p>
                    <p className="numeric mt-0.5 text-sm">{formatIndicator(supportTenths)}</p>
                  </div>
                  <div>
                    <p className="text-[0.56rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {copy.parliament.lobby}
                    </p>
                    <p className="numeric mt-0.5 text-sm">
                      {lobbied ? copy.parliament.lobbyPending : copy.common.available}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[0.56rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {copy.parliament.preferences} · {copy.parliament.preferenceScale}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {POLICY_CATEGORIES.map((category) => {
                        const value = faction.policyPreferences[category];
                        return (
                          <span
                            key={category}
                            className={cn(
                              'border px-1.5 py-0.5 text-[0.6rem]',
                              value > 0
                                ? 'border-emerald-800/50 text-emerald-300/85'
                                : value < 0
                                  ? 'border-maroon/50 text-red-300/80'
                                  : 'border-border/60 text-muted-foreground',
                            )}
                          >
                            {copy.policies.categoryLabels[category]} {value > 0 ? '+' : ''}
                            {formatInteger(value)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={lobbied ? 'outline' : 'default'}
                    disabled={lobbied}
                    onClick={() =>
                      recordMockChoice(`lobby:${faction.id}`, faction.id, copy.parliament.lobbyMock)
                    }
                  >
                    <IconVote className="h-3.5 w-3.5" />
                    {lobbied ? copy.parliament.lobbyDone : copy.parliament.lobby}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-border/50 bg-card/25 px-4 py-3 text-[0.68rem] text-muted-foreground">
        <span className="flex items-center gap-2">
          <IconCoins className="h-4 w-4 text-primary/70" />
          {copy.parliament.lobbyCost(lobbyCost)} · {copy.parliament.lobbyBonus(lobbyBonus)}
        </span>
        <span>{copy.parliament.thresholdNote}</span>
      </div>
    </>
  );
}
