import { useCallback, useEffect, useState } from 'react';

import type { LedgerEntry, MinistryDefinition } from '@republika/shared';
import { ministryMultiplier } from '@republika/simulation';

import { useGameState } from '@/app/useGame';
import { sceneArt } from '@/content/art';
import { ministerLook } from '@/content/cabinetLooks';
import { definitions, factionName, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { reasonText } from '@/features/report/reasonText';
import { formatDecimal, formatInteger, formatSignedInteger } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { ArtImage } from '@/ui/ArtImage';
import { Button } from '@/ui/components/button';
import { Drawer } from '@/ui/Drawer';
import { cn } from '@/ui/lib/utils';
import { Portrait } from '@/ui/Portrait';

const HISTORY_LIMIT = 6;
const cabinetArt = sceneArt('cabinet-briefing');

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
          if (entry.kind !== 'MINISTRY' || entry.target === undefined || entry.delta === undefined)
            continue;
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

function effectivenessColor(value: number): string {
  if (value >= 70) return 'bg-positive';
  if (value >= 55) return 'bg-primary';
  return 'bg-negative';
}

function EffectivenessBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-text-secondary">
        <span>{copy.cabinet.effectiveness}</span>
        <span className="font-mono text-foreground">{formatInteger(value)}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={40}
        aria-valuemax={90}
        aria-valuenow={value}
        className="h-1 rounded-sm bg-raised-hover"
      >
        <div
          className={cn('h-1 rounded-sm', effectivenessColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function CabinetPage() {
  const state = useGameState();
  const history = useMinistryHistory(state.turn);
  const [profileId, setProfileId] = useState<string | null>(null);
  const closeProfile = useCallback(() => setProfileId(null), []);

  const average =
    state.ministries.length === 0
      ? 0
      : state.ministries.reduce((total, ministry) => total + ministry.effectiveness, 0) /
        state.ministries.length;

  const ministries = state.ministries.flatMap((ministryState) => {
    const definition = definitions.ministries.find((item) => item.id === ministryState.ministryId);
    return definition === undefined
      ? []
      : [{ definition, effectiveness: ministryState.effectiveness }];
  });
  const profile = ministries.find((item) => item.definition.id === profileId) ?? null;

  const activeIn = (definition: MinistryDefinition) =>
    state.activePolicies.filter((active) => {
      const policy = definitions.policies.find((item) => item.id === active.policyId);
      return policy !== undefined && definition.categories.includes(policy.category);
    });

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-[minmax(0,1fr)_320px] overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col justify-center gap-4 p-7">
          <h1 className="font-sans text-[13px] font-normal tracking-normal text-text-secondary">
            {copy.cabinet.title}
          </h1>
          <p className="font-serif text-4xl font-normal leading-tight">
            {state.cabinetName ?? copy.cabinet.unnamedCabinet}
          </p>
          <dl className="flex flex-wrap gap-8">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{copy.cabinet.averageEffectiveness}</dt>
              <dd className="numeric text-[22px]">
                {formatInteger(average)}{' '}
                <span className="font-mono text-xs text-muted-foreground">
                  {copy.cabinet.multiplierValue(formatDecimal(ministryMultiplier(average)))}
                </span>
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{copy.cabinet.activePolicyTotal}</dt>
              <dd className="numeric text-[22px]">{formatInteger(state.activePolicies.length)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{copy.cabinet.reshuffleQuota}</dt>
              <dd className="text-[22px] text-text-secondary">
                {copy.cabinet.reshuffleQuotaValue}
              </dd>
            </div>
          </dl>
        </div>
        <ArtImage
          load={cabinetArt}
          alt={copy.art.scenes['cabinet-briefing']}
          className="h-[220px] w-full"
        />
      </div>

      <section aria-labelledby="cabinet-ministers" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="cabinet-ministers" className="font-sans text-[17px] font-medium tracking-normal">
            {copy.cabinet.ministersTitle}
          </h2>
          <span className="text-[13px] text-muted-foreground">{copy.cabinet.ministersNote}</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {ministries.map(({ definition, effectiveness }) => {
            const minister = ministerLook(definition.id);
            return (
              <article
                key={definition.id}
                data-testid={`minister-${definition.id}`}
                className="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card"
              >
                <div
                  className="flex justify-center pt-4"
                  style={{ backgroundColor: minister.look.bg }}
                >
                  <Portrait {...minister.look} size={120} className="rounded-none" />
                </div>
                <div className="flex flex-1 flex-col gap-2.5 p-4">
                  <span className="text-xs text-text-secondary">{definition.name}</span>
                  <span className="font-serif text-[19px] leading-tight">{minister.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {minister.factionId === null ? '—' : factionName(minister.factionId)}
                  </span>
                  <EffectivenessBar
                    value={effectiveness}
                    label={`${definition.name} · ${copy.common.effectiveness}`}
                  />
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      aria-haspopup="dialog"
                      onClick={() => setProfileId(definition.id)}
                    >
                      {copy.cabinet.profile}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled
                      title={copy.cabinet.reshuffleLocked}
                      aria-describedby={`reshuffle-locked-${definition.id}`}
                    >
                      {copy.cabinet.reshuffle}
                    </Button>
                  </div>
                  <span
                    id={`reshuffle-locked-${definition.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {copy.cabinet.reshuffleLocked}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{copy.cabinet.note}</p>
      </section>

      <Drawer
        open={profile !== null}
        label={
          profile === null ? '' : copy.cabinet.profileOf(ministerLook(profile.definition.id).name)
        }
        onClose={closeProfile}
      >
        {profile !== null && (
          <>
            <div
              className="relative flex justify-center pt-8"
              style={{ backgroundColor: ministerLook(profile.definition.id).look.bg }}
            >
              <Portrait
                {...ministerLook(profile.definition.id).look}
                size={200}
                className="rounded-none"
              />
              <Button
                size="icon"
                variant="secondary"
                aria-label={copy.cabinet.closeProfile}
                onClick={closeProfile}
                className="absolute right-4 top-4"
              >
                ✕
              </Button>
            </div>
            <div className="flex flex-col gap-5 p-6">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-text-secondary">{profile.definition.name}</span>
                <span className="font-serif text-[28px] leading-tight">
                  {ministerLook(profile.definition.id).name}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {(() => {
                    const factionId = ministerLook(profile.definition.id).factionId;
                    return factionId === null ? '—' : factionName(factionId);
                  })()}{' '}
                  · {copy.cabinet.sinceStart(definitions.scenario.startYear)}
                </span>
              </div>
              <p className="text-sm leading-[22px] text-text-secondary">
                {copy.cabinet.bioPlaceholder}
              </p>
              <dl className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 rounded-[10px] bg-raised p-3">
                  <dt className="text-xs text-muted-foreground">{copy.cabinet.effectiveness}</dt>
                  <dd className="numeric text-xl">{formatInteger(profile.effectiveness)}</dd>
                </div>
                <div className="flex flex-col gap-1 rounded-[10px] bg-raised p-3">
                  <dt className="text-xs text-muted-foreground">{copy.cabinet.multiplier}</dt>
                  <dd className="font-mono text-xl">
                    {copy.cabinet.multiplierValue(
                      formatDecimal(ministryMultiplier(profile.effectiveness)),
                    )}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{copy.cabinet.activePolicies}</span>
                {activeIn(profile.definition).length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">{copy.policies.empty}</span>
                ) : (
                  activeIn(profile.definition).map((active) => (
                    <div key={active.policyId} className="flex justify-between gap-3 text-[13px]">
                      <span>{policyName(active.policyId)}</span>
                      <span className="font-mono text-xs text-text-secondary">
                        {copy.policies.activeUntil(active.remainingTurns)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{copy.cabinet.historyTitle}</span>
                {history === null ? (
                  <div className="h-10 animate-pulse rounded-md bg-raised motion-reduce:animate-none" />
                ) : (history.get(profile.definition.id) ?? []).length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">
                    {copy.cabinet.historyEmpty}
                  </span>
                ) : (
                  (history.get(profile.definition.id) ?? [])
                    .slice(-HISTORY_LIMIT)
                    .reverse()
                    .map((entry) => (
                      <div key={entry.id} className="flex justify-between gap-3 text-[13px]">
                        <span className="text-text-secondary">
                          {copy.cabinet.historyTurn(entry.turn)} ·{' '}
                          {reasonText(entry.reasonCode, entry.sourceId)}
                        </span>
                        <span className="shrink-0 font-mono text-xs">
                          {formatSignedInteger(entry.delta ?? 0)} →{' '}
                          {formatInteger(entry.after ?? 0)}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
