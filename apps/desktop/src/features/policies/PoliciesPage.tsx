import type { PolicyDefinition } from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { copy } from '@/copy/id';
import { effectText, requirementText } from '@/features/content/effectText';
import { mockContentNames, mockDefinitions } from '@/features/mock/mockState';
import { formatInteger, formatRupiahTriliun } from '@/format/formatters';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { cn } from '@/ui/lib/utils';

function categoryLabel(policy: PolicyDefinition): string {
  return copy.policies.categoryLabels[policy.category];
}

function PolicyEffects({ policy }: { policy: PolicyDefinition }) {
  return (
    <ul className="space-y-1.5">
      {policy.effects.map((effect, index) => (
        <li
          key={`${policy.id}-effect-${index}`}
          className="flex gap-2 text-[0.72rem] leading-relaxed text-muted-foreground"
        >
          <span className="mt-[0.45rem] h-px w-2.5 shrink-0 bg-primary/50" aria-hidden="true" />
          <span>{effectText(effect, mockContentNames)}</span>
        </li>
      ))}
    </ul>
  );
}

function PolicyRequirements({ policy }: { policy: PolicyDefinition }) {
  if (policy.requirements.length === 0) {
    return <p className="text-[0.72rem] text-muted-foreground">{copy.policies.noRequirements}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {policy.requirements.map((requirement, index) => (
        <li
          key={`${policy.id}-requirement-${index}`}
          className="flex gap-2 text-[0.72rem] leading-relaxed text-muted-foreground"
        >
          <span className="mt-[0.45rem] h-px w-2.5 shrink-0 bg-border" aria-hidden="true" />
          <span>{requirementText(requirement, mockContentNames)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PoliciesPage() {
  const state = useAppStore((store) => store.gameState);
  const mockSelections = useAppStore((store) => store.mockSelections);
  const recordMockChoice = useAppStore((store) => store.recordMockChoice);

  const pendingPolicyIds = new Set(
    state.pendingCommands.flatMap((command) =>
      command.type === 'ENACT_POLICY' ? [command.policyId] : [],
    ),
  );
  const activePolicyIds = new Set(state.activePolicies.map((policy) => policy.policyId));

  return (
    <>
      <PageHeader
        kicker={copy.policies.kicker}
        title={copy.policies.title}
        subtitle={copy.policies.subtitle}
        actions={
          <Badge variant="outline">
            {copy.common.ap} {state.actionPointsRemaining}/{state.actionPointsPerTurn}
          </Badge>
        }
      />

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-serif text-xl leading-none">{copy.policies.activeTitle}</h2>
          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            {copy.dashboard.activeCount(state.activePolicies.length)}
          </span>
        </div>

        {state.activePolicies.length === 0 ? (
          <div className="border border-dashed border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
            {copy.policies.empty}
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {state.activePolicies.map((active) => {
              const policy = mockDefinitions.policies.find(
                (definition) => definition.id === active.policyId,
              );
              if (policy === undefined) return null;
              return (
                <Card key={active.policyId}>
                  <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
                    <div>
                      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                        {categoryLabel(policy)}
                      </p>
                      <CardTitle className="mt-1.5">{policy.name}</CardTitle>
                    </div>
                    <Badge variant="success">{copy.common.active}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {policy.description}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/40 pt-3">
                      <div>
                        <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                          {copy.policies.duration}
                        </p>
                        <p className="numeric mt-1 text-sm">
                          {copy.policies.activeUntil(active.remainingTurns)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                          {copy.policies.perTurn}
                        </p>
                        <p className="numeric mt-1 text-sm">
                          {formatRupiahTriliun(active.perTurnCostBillion)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                          {copy.common.turn}
                        </p>
                        <p className="numeric mt-1 text-sm">{formatInteger(active.enactedTurn)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-9">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-serif text-xl leading-none">{copy.policies.availableTitle}</h2>
          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            {formatInteger(mockDefinitions.policies.length)} · {copy.game.mockBadge}
          </span>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {mockDefinitions.policies.map((policy) => {
            const isActive = activePolicyIds.has(policy.id);
            const isPending = pendingPolicyIds.has(policy.id);
            const isRequested = mockSelections[`policy:${policy.id}`] !== undefined;
            const cooldown = state.policyCooldowns[policy.id] ?? 0;
            const blocked = isActive || isPending || isRequested || cooldown > 0;

            const buttonLabel = isActive
              ? copy.common.active
              : isPending || isRequested
                ? copy.policies.pendingButton
                : cooldown > 0
                  ? copy.policies.cooldownActive(cooldown)
                  : copy.policies.enact;

            return (
              <article
                key={policy.id}
                className={cn(
                  'flex flex-col border border-border/60 bg-card/35 transition-colors',
                  isActive
                    ? 'border-emerald-800/40 bg-emerald-950/10'
                    : 'hover:border-primary/30 hover:bg-card/55',
                )}
              >
                <div className="border-b border-border/40 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                        {categoryLabel(policy)}
                      </p>
                      <h3 className="mt-1.5 font-serif text-lg leading-tight">{policy.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {isActive && <Badge variant="success">{copy.common.active}</Badge>}
                      {isPending && <Badge variant="secondary">{copy.policies.pending}</Badge>}
                      {isRequested && (
                        <Badge variant="secondary">{copy.policies.pendingButton}</Badge>
                      )}
                      {policy.needsVote ? (
                        <Badge variant="maroon">{copy.policies.voteRequired}</Badge>
                      ) : (
                        <Badge variant="outline">{copy.policies.voteNotRequired}</Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {policy.description}
                  </p>
                </div>

                <dl className="grid grid-cols-4 divide-x divide-border/40 border-b border-border/40 text-center">
                  <div className="px-2 py-3">
                    <dt className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {copy.policies.apCost}
                    </dt>
                    <dd className="numeric mt-1 text-sm">{formatInteger(policy.apCost)}</dd>
                  </div>
                  <div className="px-2 py-3">
                    <dt className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {copy.policies.fiscalCost}
                    </dt>
                    <dd className="numeric mt-1 text-sm">
                      {formatRupiahTriliun(policy.fiscalCostBillion)}
                    </dd>
                  </div>
                  <div className="px-2 py-3">
                    <dt className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {copy.policies.duration}
                    </dt>
                    <dd className="numeric mt-1 text-sm">
                      {copy.policies.durationValue(policy.durationTurns)}
                    </dd>
                  </div>
                  <div className="px-2 py-3">
                    <dt className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {copy.policies.cooldown}
                    </dt>
                    <dd className="numeric mt-1 text-sm">
                      {copy.policies.cooldownValue(policy.cooldownTurns)}
                    </dd>
                  </div>
                </dl>

                <div className="grid flex-1 gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <p className="institutional-label">{copy.policies.effects}</p>
                    <div className="mt-2.5">
                      <PolicyEffects policy={policy} />
                    </div>
                  </div>
                  <div>
                    <p className="institutional-label">{copy.policies.requirements}</p>
                    <div className="mt-2.5">
                      <PolicyRequirements policy={policy} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border/40 px-5 py-3">
                  <span className="text-[0.62rem] text-muted-foreground">
                    {policy.perTurnCostBillion > 0
                      ? `${copy.policies.perTurn}: ${formatRupiahTriliun(policy.perTurnCostBillion)}`
                      : copy.policies.noPerTurn}
                  </span>
                  <Button
                    size="sm"
                    variant={blocked ? 'outline' : 'default'}
                    disabled={blocked}
                    onClick={() =>
                      recordMockChoice(`policy:${policy.id}`, policy.id, copy.policies.enactMock)
                    }
                  >
                    {buttonLabel}
                  </Button>
                </div>

                {isRequested && (
                  <p className="border-t border-border/40 px-5 py-2.5 text-[0.68rem] text-muted-foreground">
                    {copy.policies.pendingNote}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <p className="mt-6 text-[0.65rem] leading-relaxed text-muted-foreground/70">
        {copy.policies.enactMock}
      </p>
    </>
  );
}
