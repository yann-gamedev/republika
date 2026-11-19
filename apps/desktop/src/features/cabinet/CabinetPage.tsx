import { useCallback, useEffect, useState } from 'react';

import type { CandidateDefinition, LedgerEntry } from '@republika/shared';
import { RESHUFFLE_OLD_FACTION_PENALTY_TENTHS, ministryMultiplier } from '@republika/simulation';

import { PREVIEW_COMMAND_ID, previewCommand, useGameState } from '@/app/useGame';
import { sceneArt } from '@/content/art';
import { candidateName, definitions, factionName, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { reasonText } from '@/features/report/reasonText';
import {
  formatDecimal,
  formatInteger,
  formatSignedIndicator,
  formatSignedInteger,
} from '@/format/formatters';
import { gameController } from '@/store/controller';
import { ArtImage } from '@/ui/ArtImage';
import { Button } from '@/ui/components/button';
import { Drawer } from '@/ui/Drawer';
import { cn } from '@/ui/lib/utils';
import { Portrait } from '@/ui/Portrait';

const HISTORY_LIMIT = 8;
const BAND = '#2A2C44';
const cabinetArt = sceneArt('cabinet-briefing');

interface Office {
  readonly roleId: string;
  readonly title: string;
  readonly kind: 'ministry' | 'leader';
  readonly replaceable: boolean;
  readonly holder: CandidateDefinition | undefined;
  /** Efektivitas kementerian (hanya menteri). */
  readonly effectiveness: number | null;
}

/** Rekam jejak per jabatan dari ledger history (dimuat saat halaman dibuka). */
function useRoleHistory(turn: number): ReadonlyMap<string, readonly LedgerEntry[]> | null {
  const [history, setHistory] = useState<ReadonlyMap<string, readonly LedgerEntry[]> | null>(null);
  useEffect(() => {
    let alive = true;
    void gameController.loadHistory().then((loaded) => {
      if (!alive) return;
      const byRole = new Map<string, LedgerEntry[]>();
      for (const report of loaded.reports) {
        for (const entry of report.ledger) {
          const relevant =
            (entry.kind === 'MINISTRY' && entry.delta !== undefined) ||
            (entry.kind === 'CABINET' && entry.reasonCode === 'RESHUFFLE') ||
            (entry.sourceType === 'RESHUFFLE' && entry.kind === 'INDICATOR');
          const roleId = entry.kind === 'MINISTRY' ? entry.target : entry.sourceId;
          if (!relevant || roleId === undefined) continue;
          byRole.set(roleId, [...(byRole.get(roleId) ?? []), entry]);
        }
      }
      setHistory(byRole);
    });
    return () => {
      alive = false;
    };
  }, [turn]);
  return history;
}

function Meter({ label, value, ariaLabel }: { label: string; value: number; ariaLabel: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-text-secondary">
        <span>{label}</span>
        <span className="font-mono text-foreground">{formatInteger(value)}</span>
      </div>
      <div
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-1 rounded-sm bg-raised-hover"
      >
        <div
          className={cn(
            'h-1 rounded-sm',
            value >= 70 ? 'bg-positive' : value >= 55 ? 'bg-primary' : 'bg-negative',
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function holderPortrait(holder: CandidateDefinition | undefined, size: number) {
  return holder === undefined ? (
    <Portrait head="botak" bg={BAND} size={size} className="rounded-none" />
  ) : (
    <Portrait {...holder.appearance} bg={BAND} size={size} className="rounded-none" />
  );
}

/** Ringkasan dampak bila calon dilantik (angka sama dengan engine, §6B.3). */
function candidateImpact(office: Office, candidate: CandidateDefinition): string[] {
  const lines: string[] = [];
  if (office.kind === 'ministry') {
    if (candidate.baseEffectiveness !== null && office.effectiveness !== null) {
      lines.push(
        copy.cabinet.impactEffectiveness(
          formatInteger(office.effectiveness),
          formatInteger(Math.min(90, Math.max(40, candidate.baseEffectiveness))),
        ),
      );
    }
    if (candidate.factionId !== null && candidate.supportGainTenths !== 0) {
      lines.push(
        copy.cabinet.impactSupport(
          factionName(candidate.factionId),
          formatSignedIndicator(candidate.supportGainTenths),
        ),
      );
    }
    if (office.holder?.factionId !== null && office.holder?.factionId !== undefined) {
      lines.push(
        copy.cabinet.impactSupport(
          factionName(office.holder.factionId),
          formatSignedIndicator(RESHUFFLE_OLD_FACTION_PENALTY_TENTHS),
        ),
      );
    }
  } else {
    const delta = candidate.integrity - (office.holder?.integrity ?? candidate.integrity);
    lines.push(copy.cabinet.impactTrust(formatSignedIndicator(delta)));
  }
  return lines;
}

export default function CabinetPage() {
  const state = useGameState();
  const history = useRoleHistory(state.turn);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [reshuffleId, setReshuffleId] = useState<string | null>(null);
  const closeProfile = useCallback(() => setProfileId(null), []);
  const closeReshuffle = useCallback(() => setReshuffleId(null), []);

  const candidateById = (id: string | undefined) =>
    definitions.candidates.find((candidate) => candidate.id === id);

  const ministers: Office[] = state.ministries.flatMap((ministryState) => {
    const definition = definitions.ministries.find((item) => item.id === ministryState.ministryId);
    return definition === undefined
      ? []
      : [
          {
            roleId: definition.id,
            title: definition.name,
            kind: 'ministry' as const,
            replaceable: true,
            holder: candidateById(state.cabinet[definition.id]?.holderId),
            effectiveness: ministryState.effectiveness,
          },
        ];
  });
  const leaders: Office[] = definitions.leaders.map((leader) => ({
    roleId: leader.id,
    title: leader.title,
    kind: 'leader' as const,
    replaceable: leader.replaceable,
    holder: candidateById(state.leaders[leader.id]?.holderId),
    effectiveness: null,
  }));
  const offices = [...leaders, ...ministers];
  const profile = offices.find((office) => office.roleId === profileId) ?? null;
  const reshuffleOffice = offices.find((office) => office.roleId === reshuffleId) ?? null;
  const queued = state.pendingCommands.find((command) => command.type === 'RESHUFFLE');
  const quotaLeft = queued === undefined && state.reshuffleUsedTurn !== state.turn ? 1 : 0;

  const average =
    state.ministries.length === 0
      ? 0
      : state.ministries.reduce((total, ministry) => total + ministry.effectiveness, 0) /
        state.ministries.length;
  const parties = new Set(
    offices.flatMap((office) =>
      office.holder?.factionId === null || office.holder === undefined
        ? []
        : [office.holder.factionId],
    ),
  );

  const appoint = (office: Office, candidate: CandidateDefinition) => {
    const result = gameController.dispatch({
      type: 'RESHUFFLE',
      commandId: gameController.newCommandId(),
      roleId: office.roleId,
      candidateId: candidate.id,
    });
    if (result.ok) {
      gameController.notify(copy.cabinet.reshuffleQueued(office.title, candidate.name));
      setReshuffleId(null);
    }
  };

  const cancelQueued = () => {
    if (queued === undefined) return;
    const result = gameController.dispatch({
      type: 'CANCEL_PENDING',
      commandId: gameController.newCommandId(),
      pendingCommandId: queued.commandId,
    });
    if (result.ok) gameController.notify(copy.dashboard.cancelled);
  };

  const card = (office: Office) => {
    const isQueued = queued?.type === 'RESHUFFLE' && queued.roleId === office.roleId;
    return (
      <article
        key={office.roleId}
        data-testid={`office-${office.roleId}`}
        className="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card"
      >
        <div className="flex justify-center pt-4" style={{ backgroundColor: BAND }}>
          {holderPortrait(office.holder, 120)}
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <span className="text-xs text-text-secondary">{office.title}</span>
          <span className="font-serif text-[19px] leading-tight">
            {office.holder?.name ?? copy.cabinet.vacant}
          </span>
          <span className="text-xs text-muted-foreground">
            {office.holder?.factionId === null || office.holder === undefined
              ? copy.cabinet.nonPartisan
              : factionName(office.holder.factionId)}
          </span>
          {office.effectiveness !== null ? (
            <Meter
              label={copy.cabinet.effectiveness}
              value={office.effectiveness}
              ariaLabel={`${office.title} · ${copy.common.effectiveness}`}
            />
          ) : (
            <Meter
              label={copy.cabinet.integrity}
              value={office.holder?.integrity ?? 0}
              ariaLabel={`${office.title} · ${copy.cabinet.integrity}`}
            />
          )}
          {isQueued && queued?.type === 'RESHUFFLE' && (
            <span className="text-xs text-primary">
              {copy.cabinet.queuedFor(candidateName(queued.candidateId))}
            </span>
          )}
          <div className="mt-auto flex gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              aria-haspopup="dialog"
              onClick={() => setProfileId(office.roleId)}
            >
              {copy.cabinet.profile}
            </Button>
            {isQueued ? (
              <Button size="sm" variant="outline" className="flex-1" onClick={cancelQueued}>
                {copy.cabinet.cancelReshuffle}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                aria-haspopup="dialog"
                disabled={!office.replaceable || quotaLeft === 0 || state.status === 'completed'}
                title={
                  !office.replaceable
                    ? copy.cabinet.roleLocked
                    : quotaLeft === 0
                      ? copy.commandErrors.RESHUFFLE_LIMIT
                      : undefined
                }
                onClick={() => setReshuffleId(office.roleId)}
              >
                {copy.cabinet.reshuffle}
              </Button>
            )}
          </div>
          {!office.replaceable && (
            <span className="text-xs text-muted-foreground">{copy.cabinet.roleLocked}</span>
          )}
        </div>
      </article>
    );
  };

  const entries = profile === null ? [] : (history?.get(profile.roleId) ?? []);

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
              <dt className="text-xs text-muted-foreground">{copy.cabinet.partiesInCabinet}</dt>
              <dd className="numeric text-[22px]">
                {copy.cabinet.partiesValue(parties.size, definitions.factions.length)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{copy.cabinet.reshuffleQuota}</dt>
              <dd className="numeric text-[22px]">{copy.cabinet.reshuffleQuotaValue(quotaLeft)}</dd>
            </div>
          </dl>
        </div>
        <ArtImage
          load={cabinetArt}
          alt={copy.art.scenes['cabinet-briefing']}
          className="h-[220px] w-full"
        />
      </div>

      {leaders.length > 0 && (
        <section aria-labelledby="cabinet-leaders" className="flex flex-col gap-4">
          <h2 id="cabinet-leaders" className="font-sans text-[17px] font-medium tracking-normal">
            {copy.cabinet.leadersTitle}
          </h2>
          <div className="grid grid-cols-4 gap-4">{leaders.map(card)}</div>
        </section>
      )}

      <section aria-labelledby="cabinet-ministers" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="cabinet-ministers" className="font-sans text-[17px] font-medium tracking-normal">
            {copy.cabinet.ministersTitle}
          </h2>
          <span className="text-[13px] text-muted-foreground">{copy.cabinet.ministersNote}</span>
        </div>
        <div className="grid grid-cols-4 gap-4">{ministers.map(card)}</div>
        <p className="text-xs text-muted-foreground">{copy.cabinet.note}</p>
      </section>

      <Drawer
        open={profile !== null}
        label={
          profile === null ? '' : copy.cabinet.profileOf(profile.holder?.name ?? profile.title)
        }
        onClose={closeProfile}
      >
        {profile !== null && (
          <>
            <div className="relative flex justify-center pt-8" style={{ backgroundColor: BAND }}>
              {holderPortrait(profile.holder, 200)}
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
                <span className="text-[13px] text-text-secondary">{profile.title}</span>
                <span className="font-serif text-[28px] leading-tight">
                  {profile.holder?.name ?? copy.cabinet.vacant}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {profile.holder?.factionId === null || profile.holder === undefined
                    ? copy.cabinet.nonPartisan
                    : factionName(profile.holder.factionId)}
                </span>
              </div>
              <p className="text-sm leading-[22px] text-text-secondary">
                {profile.holder?.bio ?? ''}
              </p>
              <dl className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 rounded-[10px] bg-raised p-3">
                  <dt className="text-xs text-muted-foreground">
                    {profile.effectiveness !== null
                      ? copy.cabinet.effectiveness
                      : copy.cabinet.integrity}
                  </dt>
                  <dd className="numeric text-xl">
                    {formatInteger(profile.effectiveness ?? profile.holder?.integrity ?? 0)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 rounded-[10px] bg-raised p-3">
                  <dt className="text-xs text-muted-foreground">{copy.cabinet.integrity}</dt>
                  <dd className="numeric text-xl">
                    {formatInteger(profile.holder?.integrity ?? 0)}
                  </dd>
                </div>
              </dl>
              {profile.kind === 'ministry' && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{copy.cabinet.activePolicies}</span>
                  {state.activePolicies
                    .filter((active) => {
                      const policy = definitions.policies.find(
                        (item) => item.id === active.policyId,
                      );
                      const ministry = definitions.ministries.find(
                        (item) => item.id === profile.roleId,
                      );
                      return (
                        policy !== undefined &&
                        ministry !== undefined &&
                        ministry.categories.includes(policy.category)
                      );
                    })
                    .map((active) => (
                      <div key={active.policyId} className="flex justify-between gap-3 text-[13px]">
                        <span>{policyName(active.policyId)}</span>
                        <span className="font-mono text-xs text-text-secondary">
                          {copy.policies.activeUntil(active.remainingTurns)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{copy.cabinet.recordTitle}</span>
                {history === null ? (
                  <div className="h-10 animate-pulse rounded-md bg-raised motion-reduce:animate-none" />
                ) : entries.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">
                    {copy.cabinet.historyEmpty}
                  </span>
                ) : (
                  [...entries]
                    .slice(-HISTORY_LIMIT)
                    .reverse()
                    .map((entry) => (
                      <div key={entry.id} className="flex justify-between gap-3 text-[13px]">
                        <span className="text-text-secondary">
                          {copy.cabinet.historyTurn(entry.turn)} ·{' '}
                          {entry.kind === 'CABINET'
                            ? (entry.message ?? reasonText(entry.reasonCode))
                            : reasonText(entry.reasonCode, entry.sourceId)}
                        </span>
                        {entry.delta !== undefined && (
                          <span className="shrink-0 font-mono text-xs">
                            {formatSignedInteger(entry.delta)}
                          </span>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </>
        )}
      </Drawer>

      <Drawer
        open={reshuffleOffice !== null}
        label={reshuffleOffice === null ? '' : copy.cabinet.reshuffleTitle(reshuffleOffice.title)}
        onClose={closeReshuffle}
      >
        {reshuffleOffice !== null && (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-text-secondary">{copy.cabinet.reshuffle}</span>
                <h2 className="font-serif text-2xl font-normal">{reshuffleOffice.title}</h2>
                <p className="text-[13px] text-muted-foreground">{copy.cabinet.reshuffleIntro}</p>
              </div>
              <Button
                size="icon"
                variant="secondary"
                aria-label={copy.common.close}
                onClick={closeReshuffle}
              >
                ✕
              </Button>
            </div>
            {definitions.candidates
              .filter(
                (candidate) =>
                  candidate.roleId === reshuffleOffice.roleId &&
                  candidate.id !== reshuffleOffice.holder?.id,
              )
              .map((candidate) => {
                const blocked = previewCommand(state, {
                  type: 'RESHUFFLE',
                  commandId: PREVIEW_COMMAND_ID,
                  roleId: reshuffleOffice.roleId,
                  candidateId: candidate.id,
                });
                return (
                  <article
                    key={candidate.id}
                    data-testid={`candidate-${candidate.id}`}
                    className="flex gap-4 rounded-[12px] border border-border bg-raised p-4"
                  >
                    <Portrait {...candidate.appearance} bg={BAND} size={72} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="font-serif text-lg leading-tight">{candidate.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {candidate.factionId === null
                          ? copy.cabinet.nonPartisan
                          : factionName(candidate.factionId)}{' '}
                        · {copy.cabinet.integrity} {formatInteger(candidate.integrity)}
                      </span>
                      <ul className="flex flex-col gap-0.5 text-xs text-text-secondary">
                        {candidateImpact(reshuffleOffice, candidate).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        className="mt-1 self-start"
                        disabled={blocked !== null}
                        title={blocked === null ? undefined : copy.commandErrors[blocked]}
                        onClick={() => appoint(reshuffleOffice, candidate)}
                      >
                        {copy.cabinet.appoint}
                      </Button>
                    </div>
                  </article>
                );
              })}
          </div>
        )}
      </Drawer>
    </div>
  );
}
