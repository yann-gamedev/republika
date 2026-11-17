import { useEffect, useState } from 'react';

import type { LedgerEntry } from '@republika/shared';
import { ministryMultiplier } from '@republika/simulation';

import { PageHeader } from '@/app/PageHeader';
import { useGameState } from '@/app/useGame';
import { definitions, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { reasonText } from '@/features/report/reasonText';
import { formatDecimal, formatInteger, formatSignedInteger } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { Badge } from '@/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Progress } from '@/ui/components/progress';
import { Term } from '@/ui/components/term';
import { IconCabinet } from '@/ui/icons';

const HISTORY_LIMIT = 6;

/** Perubahan effectiveness per kementerian dari ledger history (dimuat saat halaman dibuka). */
function useMinistryHistory(turn: number): ReadonlyMap<string, readonly LedgerEntry[]> | null {
  const [history, setHistory] = useState<ReadonlyMap<string, readonly LedgerEntry[]> | null>(null);
  useEffect(() => {
    let alive = true;
    void gameController.loadHistory().then((loaded) => {
      if (!alive) return;
      const byMinistry = new Map<string, LedgerEntry[]>();
      for (const report of loaded.reports) {
        for (const entry of report.ledger) {
          if (
            entry.kind !== 'MINISTRY' ||
            entry.target === undefined ||
            entry.delta === undefined
          ) {
            continue;
          }
          byMinistry.set(entry.target, [...(byMinistry.get(entry.target) ?? []), entry]);
        }
      }
      setHistory(byMinistry);
    });
    return () => {
      alive = false;
    };
  }, [turn]);
  return history;
}

export default function CabinetPage() {
  const state = useGameState();
  const history = useMinistryHistory(state.turn);

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
          <Term explanation={copy.glossary.effectiveness}>{copy.cabinet.effectiveness}</Term>
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
          const definition = definitions.ministries.find(
            (ministry) => ministry.id === ministryState.ministryId,
          );
          if (definition === undefined) return null;

          const activePolicies = state.activePolicies.filter((active) => {
            const policy = definitions.policies.find((item) => item.id === active.policyId);
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
                <Progress
                  className="mt-2"
                  value={ministryState.effectiveness}
                  aria-label={`${definition.name} · ${copy.common.effectiveness}`}
                />

                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                  <div>
                    <dt className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                      {copy.cabinet.domain}
                    </dt>
                    <dd className="mt-1 font-serif text-base">
                      {definition.categories
                        .map((category) => copy.policies.categoryLabels[category])
                        .join(', ')}
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
                            {policyName(active.policyId)}
                          </span>
                          <span className="numeric text-muted-foreground">
                            {copy.policies.activeUntil(active.remainingTurns)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4 border-t border-border/40 pt-4">
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                    {copy.cabinet.historyTitle}
                  </p>
                  {history === null ? (
                    <div className="mt-2 h-10 animate-pulse bg-secondary/30 motion-reduce:animate-none" />
                  ) : (history.get(definition.id) ?? []).length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {copy.cabinet.historyEmpty}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs">
                      {(history.get(definition.id) ?? [])
                        .slice(-HISTORY_LIMIT)
                        .reverse()
                        .map((entry) => (
                          <li key={entry.id} className="flex justify-between gap-3">
                            <span className="text-muted-foreground">
                              {copy.cabinet.historyTurn(entry.turn)} ·{' '}
                              {reasonText(entry.reasonCode, entry.sourceId)}
                            </span>
                            <span className="numeric">
                              {formatSignedInteger(entry.delta ?? 0)} →{' '}
                              {formatInteger(entry.after ?? 0)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
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
