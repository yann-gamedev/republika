import { useEffect, useRef, useState } from 'react';

import {
  INDICATOR_DOMAINS,
  POLICY_CATEGORIES,
  type GameState,
  type PolicyCategory,
  type PolicyDefinition,
} from '@republika/shared';
import { evaluateRequirement, projectPolicy } from '@republika/simulation';

import {
  PREVIEW_COMMAND_ID,
  isFavourable,
  ministryInfluence,
  previewCommand,
  useGameState,
} from '@/app/useGame';
import { POLICY_CATEGORY_SCENE, policyArt } from '@/content/art';
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
import { ApTokens } from '@/ui/ApTokens';
import { ArtImage } from '@/ui/ArtImage';
import { Button } from '@/ui/components/button';
import { cn } from '@/ui/lib/utils';

const names: ContentNames = { factionName, ministryName, policyName };

type SortKey = 'status' | 'cost' | 'category';
type CategoryFilter = 'ALL' | PolicyCategory;

/** Urutan status: diajukan, tersedia, aktif, jeda, terkunci. */
function statusRank(state: GameState, policy: PolicyDefinition): number {
  if (state.pendingCommands.some((c) => c.type === 'ENACT_POLICY' && c.policyId === policy.id))
    return 0;
  if (state.activePolicies.some((active) => active.policyId === policy.id)) return 2;
  if ((state.policyCooldowns[policy.id] ?? 0) > 0) return 3;
  const blocked = previewCommand(state, {
    type: 'ENACT_POLICY',
    commandId: PREVIEW_COMMAND_ID,
    policyId: policy.id,
  });
  return blocked === null ? 1 : 4;
}

export function filterAndSortPolicies(
  state: GameState,
  policies: readonly PolicyDefinition[],
  options: { readonly query: string; readonly category: CategoryFilter; readonly sort: SortKey },
): PolicyDefinition[] {
  const query = options.query.trim().toLocaleLowerCase('id-ID');
  const filtered = policies.filter(
    (policy) =>
      (options.category === 'ALL' || policy.category === options.category) &&
      (query.length === 0 ||
        `${policy.name} ${policy.description}`.toLocaleLowerCase('id-ID').includes(query)),
  );
  const byId = (a: PolicyDefinition, b: PolicyDefinition) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const totalCost = (policy: PolicyDefinition) =>
    policy.fiscalCostBillion + policy.perTurnCostBillion * policy.durationTurns;
  return [...filtered].sort((a, b) => {
    if (options.sort === 'cost') return totalCost(a) - totalCost(b) || byId(a, b);
    if (options.sort === 'category') {
      return (
        POLICY_CATEGORIES.indexOf(a.category) - POLICY_CATEGORIES.indexOf(b.category) || byId(a, b)
      );
    }
    return statusRank(state, a) - statusRank(state, b) || byId(a, b);
  });
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('numeric', mono && 'font-mono text-[13px]')}>{value}</dd>
    </div>
  );
}

function PolicyDetail({ policy }: { policy: PolicyDefinition }) {
  const state = useGameState();
  const pendingCommandId = state.pendingCommands.find(
    (command) => command.type === 'ENACT_POLICY' && command.policyId === policy.id,
  )?.commandId;
  const active = state.activePolicies.find((item) => item.policyId === policy.id);
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
  const influence = ministryInfluence(state, policy.category);

  const enact = () => {
    const result = gameController.dispatch({
      type: 'ENACT_POLICY',
      commandId: gameController.newCommandId(),
      policyId: policy.id,
    });
    if (result.ok) gameController.notify(copy.policies.enacted(policy.name));
  };

  const cancel = (commandId: string) => {
    const result = gameController.dispatch({
      type: 'CANCEL_PENDING',
      commandId: gameController.newCommandId(),
      pendingCommandId: commandId,
    });
    if (result.ok) gameController.notify(copy.dashboard.cancelled);
  };

  const reason =
    active !== undefined
      ? copy.policies.activeUntil(active.remainingTurns)
      : cooldown > 0
        ? copy.policies.cooldownActive(cooldown)
        : blockedCode !== null
          ? copy.commandErrors[blockedCode]
          : null;

  return (
    <section
      aria-labelledby="policy-detail-title"
      data-testid={`policy-${policy.id}`}
      className="flex flex-col rounded-2xl border border-border bg-card"
    >
      <div className="flex flex-col gap-2 border-b border-border p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-text-secondary">
            {copy.policies.categoryLabels[policy.category]}
          </span>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-xs',
              policy.needsVote ? 'bg-[#2A1E1E] text-[#F0A08A]' : 'bg-raised text-text-secondary',
            )}
          >
            {policy.needsVote ? copy.policies.voteRequired : copy.policies.voteNotRequired}
          </span>
        </div>
        <h2 id="policy-detail-title" className="font-serif text-[26px] font-normal leading-tight">
          {policy.name}
        </h2>
        <p className="text-sm leading-[22px] text-text-secondary">{policy.description}</p>
      </div>

      <dl className="grid grid-cols-4 border-b border-border">
        <Stat label={copy.policies.apCost} value={formatInteger(policy.apCost)} />
        <Stat
          label={copy.policies.fiscalCost}
          value={formatRupiahTriliun(projection.upfrontCostBillion)}
        />
        <Stat
          label={copy.policies.duration}
          value={copy.policies.durationValue(policy.durationTurns)}
        />
        <Stat
          label={copy.policies.minister}
          value={
            influence === null ? '—' : copy.policies.multiplier(formatDecimal(influence.multiplier))
          }
          mono
        />
      </dl>

      <div className="flex flex-col gap-2.5 p-6">
        <span className="text-sm font-medium">{copy.policies.projection}</span>
        {projection.indicators.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{copy.policies.projectionEmpty}</p>
        ) : (
          projection.indicators.map((item) => (
            <div
              key={item.indicator}
              className="grid grid-cols-[1fr_140px] items-center gap-3 text-sm"
            >
              <span className="text-text-secondary">
                {INDICATOR_DOMAINS[item.indicator].shortLabel}
              </span>
              <span
                className={cn(
                  'text-right font-mono text-[13px]',
                  item.expectedTenths !== 0 &&
                    (isFavourable(item.indicator, item.expectedTenths)
                      ? 'text-positive'
                      : 'text-negative'),
                )}
              >
                {formatSignedIndicator(item.minTenths)} … {formatSignedIndicator(item.maxTenths)}
              </span>
            </div>
          ))
        )}
        {projection.perTurnCostBillion !== 0 && (
          <div className="grid grid-cols-[1fr_140px] items-center gap-3 text-sm">
            <span className="text-text-secondary">{copy.policies.perTurn}</span>
            <span className="text-right font-mono text-[13px]">
              {formatRupiahTriliun(projection.perTurnCostBillion)}
            </span>
          </div>
        )}
        {projection.treasuryEffectBillion !== 0 && (
          <div className="grid grid-cols-[1fr_140px] items-center gap-3 text-sm">
            <span className="text-text-secondary">{copy.policies.treasuryEffect}</span>
            <span className="text-right font-mono text-[13px]">
              {formatSignedRupiahTriliun(projection.treasuryEffectBillion)}
            </span>
          </div>
        )}
        <span className="text-xs leading-[18px] text-muted-foreground">
          {copy.policies.projectionNote}
        </span>
        {projection.vote !== null && (
          <span className="text-[13px] text-text-secondary">
            {copy.policies.parliamentEstimate}:{' '}
            <span className={projection.vote.passed ? 'text-foreground' : 'text-negative'}>
              {copy.policies.seatsEstimate(projection.vote.yesSeats)}
            </span>
          </span>
        )}

        <details className="mt-2 text-[13px]">
          <summary className="cursor-pointer text-text-secondary hover:text-foreground">
            {copy.policies.effectsToggle}
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{copy.policies.requirements}</p>
              {policy.requirements.length === 0 ? (
                <p className="mt-1.5 text-text-secondary">{copy.policies.noRequirements}</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {policy.requirements.map((requirement, index) => {
                    const met = evaluateRequirement(state, requirement);
                    return (
                      <li key={index} className="flex gap-2">
                        <span
                          aria-label={
                            met ? copy.policies.requirementMet : copy.policies.requirementNotMet
                          }
                          className={met ? 'text-positive' : 'text-negative'}
                        >
                          {met ? '✓' : '✗'}
                        </span>
                        <span className="text-text-secondary">
                          {requirementText(requirement, names)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{copy.policies.effects}</p>
              <ul className="mt-1.5 space-y-1 text-text-secondary">
                {policy.effects.map((effect, index) => (
                  <li key={index}>{effectText(effect, names)}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>

      <div className="flex flex-col gap-2 px-6 pb-6 pt-2">
        {pendingCommandId !== undefined ? (
          <Button size="lg" variant="secondary" onClick={() => cancel(pendingCommandId)}>
            {copy.policies.cancelPending}
          </Button>
        ) : blockedCode === 'INSUFFICIENT_AP' ? (
          <Button size="lg" disabled>
            {copy.policies.apExhausted}
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={blockedCode !== null}
            aria-describedby={reason === null ? undefined : 'policy-blocked-reason'}
            onClick={enact}
          >
            {copy.policies.enactAp(policy.apCost)}
          </Button>
        )}
        {reason !== null && pendingCommandId === undefined && (
          <p id="policy-blocked-reason" className="text-[13px] text-text-secondary">
            {reason}
          </p>
        )}
      </div>
    </section>
  );
}

export default function PoliciesPage() {
  const state = useGameState();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [sort, setSort] = useState<SortKey>('status');
  const catalog = filterAndSortPolicies(state, definitions.policies, { query, category, sort });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = catalog.find((policy) => policy.id === selectedId) ?? catalog[0];
  const searchRef = useRef<HTMLInputElement>(null);
  const pendingIds = new Set(
    state.pendingCommands.flatMap((command) =>
      command.type === 'ENACT_POLICY' ? [command.policyId] : [],
    ),
  );

  // Pintasan "/" memfokuskan kotak pencarian.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== '/' || target?.tagName === 'INPUT' || target?.tagName === 'SELECT') return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] font-normal leading-tight">
            {copy.policies.title}
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">{copy.policies.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <ApTokens
            remaining={state.actionPointsRemaining}
            total={state.actionPointsPerTurn}
            label={copy.game.apTokens(state.actionPointsRemaining, state.actionPointsPerTurn)}
          />
          <span className="text-sm text-text-secondary">
            {copy.policies.apLeft(state.actionPointsRemaining)}
          </span>
        </div>
      </div>

      {state.status === 'completed' && (
        <p
          role="note"
          className="rounded-lg border border-primary/40 bg-primary/[0.07] px-5 py-3 text-sm"
        >
          {copy.commandErrors.CAMPAIGN_COMPLETED}
        </p>
      )}

      <div role="search" className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label={copy.policies.category}
          className="flex flex-wrap gap-1 rounded-[10px] border border-border bg-card p-1"
        >
          {(['ALL', ...POLICY_CATEGORIES] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
              className={cn(
                'h-9 rounded-md px-3.5 text-[13px] font-medium transition-colors duration-150',
                category === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-text-secondary hover:text-foreground',
              )}
            >
              {value === 'ALL' ? copy.policies.allCategories : copy.policies.categoryLabels[value]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="sr-only">{copy.policies.searchLabel}</span>
          <input
            ref={searchRef}
            type="search"
            aria-label={copy.policies.searchLabel}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.policies.searchPlaceholder}
            className="h-9 w-56 rounded-md border border-border bg-raised px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {copy.policies.sortLabel}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-9 rounded-md border border-border bg-raised px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="status">{copy.policies.sortStatus}</option>
            <option value="cost">{copy.policies.sortCost}</option>
            <option value="category">{copy.policies.sortCategory}</option>
          </select>
        </label>
      </div>

      {catalog.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          {copy.policies.noResults}
        </p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start gap-6">
          <ul aria-label={copy.policies.availableTitle} className="grid grid-cols-2 gap-4">
            {catalog.map((policy) => {
              const isSelected = policy.id === selected?.id;
              const rank = statusRank(state, policy);
              return (
                <li key={policy.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(policy.id)}
                    className={cn(
                      'flex w-full flex-col overflow-hidden rounded-[14px] bg-card text-left transition-[box-shadow,transform] duration-150 ease-standard hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
                      isSelected
                        ? 'shadow-[inset_0_0_0_2px_hsl(var(--primary))]'
                        : 'shadow-[inset_0_0_0_1px_hsl(var(--border))]',
                    )}
                  >
                    <span className="relative block">
                      <ArtImage
                        load={policyArt(policy.category)}
                        alt={copy.art.scenes[POLICY_CATEGORY_SCENE[policy.category]]}
                        className="h-[140px] w-full"
                      />
                      {pendingIds.has(policy.id) && (
                        <span className="absolute right-3 top-3 rounded-md bg-background px-2.5 py-1 text-xs font-medium text-primary">
                          {copy.policies.sentBadge}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col gap-1.5 p-4">
                      <span className="flex justify-between gap-2 text-xs text-text-secondary">
                        <span>{copy.policies.categoryLabels[policy.category]}</span>
                        <span>{copy.policies.statusLabels[rank]}</span>
                      </span>
                      <span className="font-serif text-[19px] leading-tight">{policy.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {copy.policies.cardMeta(
                          policy.apCost,
                          formatRupiahTriliun(policy.fiscalCostBillion),
                          policy.durationTurns,
                          policy.needsVote,
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="sticky top-24" aria-live="polite">
            {selected !== undefined && <PolicyDetail key={selected.id} policy={selected} />}
          </div>
        </div>
      )}
    </div>
  );
}
