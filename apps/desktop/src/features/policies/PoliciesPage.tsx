import { INDICATOR_DOMAINS, type PolicyDefinition } from '@republika/shared';
import { evaluateRequirement, projectPolicy } from '@republika/simulation';

import { PageHeader } from '@/app/PageHeader';
import { PREVIEW_COMMAND_ID, ministryInfluence, previewCommand, useGameState } from '@/app/useGame';
import { definitions, factionName, ministryName, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { effectText, requirementText, type ContentNames } from '@/features/content/effectText';
import {
  formatDecimal,
  formatInteger,
  formatRupiahTriliun,
  formatSignedIndicator,
  formatSignedRupiahTriliun,
} from '@/format/formatters';
import { gameController } from '@/store/controller';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { cn } from '@/ui/lib/utils';

const names: ContentNames = { factionName, ministryName, policyName };

function categoryLabel(policy: PolicyDefinition): string {
  return copy.policies.categoryLabels[policy.category];
}

function InfluenceLine({ category }: { category: PolicyDefinition['category'] }) {
  const state = useGameState();
  const influence = ministryInfluence(state, category);
  if (influence === null) return null;
  return (
    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.12em] text-primary/80">
      {copy.cabinet.influence(influence.name, formatDecimal(influence.multiplier))}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-3">
      <dt className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground/70">
        {label}
      </dt>
      <dd className="numeric mt-1 text-sm">{value}</dd>
    </div>
  );
}

export default function PoliciesPage() {
  const state = useGameState();
  const pendingByPolicy = new Map(
    state.pendingCommands.flatMap((command) =>
      command.type === 'ENACT_POLICY' ? [[command.policyId, command.commandId] as const] : [],
    ),
  );
  const activeById = new Map(state.activePolicies.map((policy) => [policy.policyId, policy]));
  const catalog = [...definitions.policies].sort((a, b) => (a.id < b.id ? -1 : 1));

  const enact = (policy: PolicyDefinition) => {
    const result = gameController.dispatch({
      type: 'ENACT_POLICY',
      commandId: gameController.newCommandId(),
      policyId: policy.id,
    });
    if (result.ok) gameController.notify(copy.policies.enacted(policy.name));
  };

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
          <h2 className="font-serif text-xl leading-none">{copy.policies.availableTitle}</h2>
          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            {copy.dashboard.activeCount(state.activePolicies.length)}
          </span>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {catalog.map((policy) => {
            const active = activeById.get(policy.id);
            const pendingCommandId = pendingByPolicy.get(policy.id);
            const cooldown = state.policyCooldowns[policy.id] ?? 0;
            const blockedCode =
              pendingCommandId === undefined
                ? previewCommand(state, {
                    type: 'ENACT_POLICY',
                    commandId: PREVIEW_COMMAND_ID,
                    policyId: policy.id,
                  })
                : null;
            const projection = projectPolicy(state, policy.id, definitions);

            return (
              <article
                key={policy.id}
                data-testid={`policy-${policy.id}`}
                className={cn(
                  'flex flex-col border border-border/60 bg-card/35 transition-colors',
                  active !== undefined
                    ? 'border-emerald-800/40 bg-emerald-950/10'
                    : pendingCommandId !== undefined
                      ? 'border-primary/45 bg-primary/[0.05]'
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
                      {active !== undefined && (
                        <Badge variant="success">
                          {copy.policies.activeUntil(active.remainingTurns)}
                        </Badge>
                      )}
                      {pendingCommandId !== undefined && (
                        <Badge variant="secondary">{copy.policies.pending}</Badge>
                      )}
                      {cooldown > 0 && (
                        <Badge variant="destructive">
                          {copy.policies.cooldownActive(cooldown)}
                        </Badge>
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
                  <InfluenceLine category={policy.category} />
                </div>

                <dl className="grid grid-cols-4 divide-x divide-border/40 border-b border-border/40 text-center">
                  <Stat label={copy.policies.apCost} value={formatInteger(policy.apCost)} />
                  <Stat
                    label={copy.policies.fiscalCost}
                    value={formatRupiahTriliun(projection.upfrontCostBillion)}
                  />
                  <Stat
                    label={copy.policies.perTurn}
                    value={formatRupiahTriliun(projection.perTurnCostBillion)}
                  />
                  <Stat
                    label={copy.policies.costTotal}
                    value={formatRupiahTriliun(projection.totalCostBillion)}
                  />
                </dl>

                <div className="grid flex-1 gap-5 p-5 sm:grid-cols-2">
                  <div>
                    <p className="institutional-label">{copy.policies.projection}</p>
                    {projection.indicators.length === 0 ? (
                      <p className="mt-2.5 text-xs text-muted-foreground">
                        {copy.policies.projectionEmpty}
                      </p>
                    ) : (
                      <ul className="mt-2.5 space-y-1.5 text-xs">
                        {projection.indicators.map((item) => (
                          <li
                            key={item.indicator}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="text-muted-foreground">
                              {INDICATOR_DOMAINS[item.indicator].shortLabel}
                            </span>
                            <span
                              className={cn(
                                'numeric',
                                item.direction === 'up' && 'text-emerald-300/85',
                                item.direction === 'down' && 'text-red-300/85',
                              )}
                            >
                              {item.direction === 'up'
                                ? '↑'
                                : item.direction === 'down'
                                  ? '↓'
                                  : '→'}{' '}
                              {formatSignedIndicator(item.minTenths)} …{' '}
                              {formatSignedIndicator(item.maxTenths)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {projection.treasuryEffectBillion !== 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {copy.policies.treasuryEffect}:{' '}
                        <span className="numeric text-foreground">
                          {formatSignedRupiahTriliun(projection.treasuryEffectBillion)}
                        </span>
                      </p>
                    )}
                    <p className="mt-2 text-[0.62rem] leading-relaxed text-muted-foreground/70">
                      {copy.policies.projectionNote}
                    </p>
                    {projection.vote !== null && (
                      <p
                        className={cn(
                          'mt-3 text-xs',
                          projection.vote.passed ? 'text-emerald-300/85' : 'text-red-300/85',
                        )}
                      >
                        {copy.policies.votePrediction(projection.vote.yesSeats)} ·{' '}
                        {projection.vote.passed
                          ? copy.policies.voteLikelyPass
                          : copy.policies.voteLikelyFail}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="institutional-label">{copy.policies.requirements}</p>
                    {policy.requirements.length === 0 ? (
                      <p className="mt-2.5 text-xs text-muted-foreground">
                        {copy.policies.noRequirements}
                      </p>
                    ) : (
                      <ul className="mt-2.5 space-y-1.5 text-xs">
                        {policy.requirements.map((requirement, index) => {
                          const met = evaluateRequirement(state, requirement);
                          return (
                            <li key={index} className="flex gap-2">
                              <span
                                aria-label={
                                  met
                                    ? copy.policies.requirementMet
                                    : copy.policies.requirementNotMet
                                }
                                className={met ? 'text-emerald-300' : 'text-red-300'}
                              >
                                {met ? '✓' : '✗'}
                              </span>
                              <span className="text-muted-foreground">
                                {requirementText(requirement, names)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <p className="institutional-label mt-4">{copy.policies.effects}</p>
                    <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                      {policy.effects.map((effect, index) => (
                        <li key={index}>{effectText(effect, names)}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border/40 px-5 py-3">
                  <span className="text-[0.68rem] leading-snug text-muted-foreground">
                    {blockedCode !== null && active === undefined
                      ? `${copy.policies.unavailableReason}: ${copy.commandErrors[blockedCode]}`
                      : copy.policies.durationValue(policy.durationTurns)}
                  </span>
                  {pendingCommandId !== undefined ? (
                    <Button size="sm" variant="outline" onClick={() => cancel(pendingCommandId)}>
                      {copy.policies.cancelPending}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={blockedCode !== null ? 'outline' : 'default'}
                      disabled={blockedCode !== null}
                      title={blockedCode !== null ? copy.commandErrors[blockedCode] : undefined}
                      onClick={() => enact(policy)}
                    >
                      {active !== undefined ? copy.common.active : copy.policies.enact}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
