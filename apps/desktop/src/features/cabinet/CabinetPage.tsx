import { PageHeader } from '@/app/PageHeader';
import { copy } from '@/copy/id';
import {
  mockDefinitions,
  mockMinisterNames,
  mockPolicyName,
  mockStartYear,
} from '@/features/mock/mockState';
import { formatDecimal, formatInteger } from '@/format/formatters';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Progress } from '@/ui/components/progress';
import { IconCabinet } from '@/ui/icons';

function ministryMultiplier(effectiveness: number): number {
  return 0.8 + (0.4 * (effectiveness - 40)) / 50;
}

export default function CabinetPage() {
  const state = useAppStore((store) => store.gameState);

  const averageEffectiveness =
    state.ministries.length === 0
      ? 0
      : state.ministries.reduce((total, ministry) => total + ministry.effectiveness, 0) /
        state.ministries.length;

  return (
    <>
      <PageHeader
        kicker={copy.cabinet.kicker}
        title={copy.cabinet.title}
        subtitle={copy.cabinet.subtitle}
        actions={<Badge variant="outline">{state.cabinetName ?? copy.game.noCabinet}</Badge>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-border/50 py-4">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconCabinet className="h-4 w-4 text-primary/70" />
          {copy.cabinet.effectiveness}
        </span>
        <span className="numeric font-serif text-2xl leading-none">
          {formatInteger(averageEffectiveness)}
        </span>
        <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          {copy.cabinet.multiplierValue(formatDecimal(ministryMultiplier(averageEffectiveness)))}
        </span>
        <span className="ml-auto max-w-xl text-[0.65rem] leading-relaxed text-muted-foreground">
          {copy.cabinet.note}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {state.ministries.map((ministryState) => {
          const definition = mockDefinitions.ministries.find(
            (ministry) => ministry.id === ministryState.ministryId,
          );
          if (definition === undefined) return null;

          const activePolicies = state.activePolicies.filter((active) => {
            const policy = mockDefinitions.policies.find((item) => item.id === active.policyId);
            return policy !== undefined && definition.categories.includes(policy.category);
          });
          const multiplier = ministryMultiplier(ministryState.effectiveness);

          return (
            <Card key={definition.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                    {definition.categories
                      .map((category) => copy.policies.categoryLabels[category])
                      .join(' · ')}
                  </p>
                  <CardTitle className="mt-1.5">{definition.name}</CardTitle>
                </div>
                <Badge variant={ministryState.effectiveness >= 60 ? 'success' : 'outline'}>
                  {formatInteger(ministryState.effectiveness)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {copy.cabinet.effectiveness}
                  </span>
                  <span className="numeric text-xs text-muted-foreground">
                    {copy.cabinet.multiplierValue(formatDecimal(multiplier))}
                  </span>
                </div>
                <Progress className="mt-2" value={ministryState.effectiveness} />

                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                  <div>
                    <dt className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                      {copy.cabinet.lead}
                    </dt>
                    <dd className="mt-1 font-serif text-base">
                      {mockMinisterNames[definition.id] ?? copy.cabinet.noLead}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                      {copy.cabinet.activePolicies}
                    </dt>
                    <dd className="mt-1 text-sm">
                      {copy.cabinet.policyCount(activePolicies.length)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-border/40 pt-4">
                  {activePolicies.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{copy.policies.empty}</p>
                  ) : (
                    <ul className="space-y-2">
                      {activePolicies.map((active) => (
                        <li
                          key={active.policyId}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="inline-block h-px w-3 bg-primary/60"
                            />
                            {mockPolicyName(active.policyId)}
                          </span>
                          <span className="numeric text-muted-foreground">
                            {copy.policies.activeUntil(active.remainingTurns)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="mt-4 text-[0.62rem] leading-relaxed text-muted-foreground/70">
                  {copy.cabinet.since} · {copy.game.turnLabel(mockStartYear, 1)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-5 border border-border/40 bg-card/20 px-4 py-3 text-[0.68rem] leading-relaxed text-muted-foreground">
        {copy.cabinet.note}
      </p>
    </>
  );
}
