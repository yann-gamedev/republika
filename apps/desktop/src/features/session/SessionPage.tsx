import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useGameState } from '@/app/useGame';
import { definitions, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/ui/components/button';
import { IconCheck } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';

import { CHAMBER, revealOrder, seatPositions, seatStates, tally } from './session';

/** Jeda antar fraksi saat kursi diumumkan (Lampiran A). */
export const REVEAL_DELAY_MS = 650;

const SEATS = seatPositions();

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function SessionPage() {
  const state = useGameState();
  const report = useGameStore((store) => store.lastReport);
  const navigate = useNavigate();
  const votes = report?.votes ?? [];
  const [index, setIndex] = useState(0);
  const vote = votes[index];
  const order = useMemo(
    () => (vote === undefined ? [] : revealOrder(vote, definitions.factions)),
    [vote],
  );
  const [step, setStep] = useState(() => (prefersReducedMotion() ? Number.MAX_SAFE_INTEGER : 0));
  const done = step >= order.length;

  // `setTimeout` berantai: satu timer per fraksi, dibersihkan saat unmount atau
  // saat sidang dilewati. Tidak ada interval yang berjalan saat idle.
  useEffect(() => {
    if (done || order.length === 0) return undefined;
    const timer = window.setTimeout(() => setStep((current) => current + 1), REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [step, done, order.length]);

  if (vote === undefined) {
    return <Navigate to={state.status === 'completed' ? '/game/final' : '/game/report'} replace />;
  }

  const seats = seatStates(order, step);
  const counts = tally(order, Math.min(step, order.length));
  const policy = definitions.policies.find((item) => item.id === vote.policyId);
  const isLast = index === votes.length - 1;
  const colorOf = (factionId: string) =>
    definitions.factions.find((faction) => faction.id === factionId)?.color ?? '#5A6070';

  const next = () => {
    if (!isLast) {
      setIndex(index + 1);
      setStep(prefersReducedMotion() ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    navigate(state.status === 'completed' ? '/game/final' : '/game/report');
  };

  return (
    <div className="flex flex-col gap-6" data-testid="session">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[13px] text-text-secondary">
            {copy.session.kicker}
            {votes.length > 1 && ` · ${copy.session.counter(index + 1, votes.length)}`}
          </span>
          <h2 className="mt-1.5 font-serif text-4xl font-normal leading-tight">
            {policyName(vote.policyId)}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {done ? (
            <Button size="lg" onClick={next}>
              {!isLast
                ? copy.session.next
                : state.status === 'completed'
                  ? copy.session.toFinal
                  : copy.session.toReport}
            </Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={() => setStep(order.length)}>
              {copy.session.skip}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
        <section
          aria-labelledby="session-chamber"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
        >
          <h3 id="session-chamber" className="font-sans text-base font-medium tracking-normal">
            {copy.session.chamber}
          </h3>
          <div className="relative">
            <svg
              viewBox={`0 0 ${CHAMBER.width} ${CHAMBER.height}`}
              className="block w-full"
              role="img"
              aria-label={copy.session.chamberAria(counts.yes, counts.no)}
            >
              {seats.map((seat, seatIndex) => {
                const point = SEATS[seatIndex];
                if (point === undefined) return null;
                return (
                  <circle
                    key={seatIndex}
                    cx={point.x.toFixed(1)}
                    cy={point.y.toFixed(1)}
                    r="9"
                    data-status={seat.status}
                    className="transition-[fill] duration-[260ms] ease-standard"
                    fill={
                      seat.status === 'FOR'
                        ? '#C9A227'
                        : seat.status === 'AGAINST'
                          ? '#E5484D'
                          : colorOf(seat.factionId)
                    }
                    fillOpacity={seat.status === 'pending' ? 0.55 : 1}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-1">
              <span className="numeric font-serif text-[56px] leading-none">{counts.yes}</span>
              <span className="text-[13px] text-text-secondary">
                {copy.session.tally(counts.no, counts.pending)}
              </span>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="relative flex h-2 overflow-hidden rounded bg-raised-hover"
          >
            <div
              className="bg-primary transition-[width] duration-[260ms] ease-standard"
              style={{ width: `${counts.yes}%` }}
            />
            <div className="flex-1" />
            <div
              className="bg-negative transition-[width] duration-[260ms] ease-standard"
              style={{ width: `${counts.no}%` }}
            />
            <div className="absolute inset-y-0 left-[51%] w-0.5 bg-foreground/70" />
          </div>
          <div className="flex justify-between font-mono text-xs text-muted-foreground">
            <span>{copy.session.scaleStart}</span>
            <span>{copy.session.scaleThreshold}</span>
            <span>{copy.session.scaleEnd}</span>
          </div>
          {done && (
            <div
              role="status"
              className={cn(
                'flex items-center gap-3 rounded-[10px] bg-raised px-4 py-3 text-sm',
                vote.passed
                  ? 'shadow-[inset_0_0_0_1px_rgba(76,195,138,0.35)]'
                  : 'shadow-[inset_0_0_0_1px_rgba(229,72,77,0.4)]',
              )}
            >
              {vote.passed && <IconCheck className="h-[18px] w-[18px] text-positive" />}
              <span>
                {vote.passed
                  ? copy.session.passed(vote.seatsFor, vote.seatsAgainst)
                  : copy.session.failed(vote.seatsFor, vote.seatsAgainst)}{' '}
                {vote.passed
                  ? copy.session.passedNote(policy?.durationTurns ?? 0)
                  : copy.session.failedNote}
              </span>
            </div>
          )}
        </section>

        <section
          aria-labelledby="session-factions"
          className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4"
        >
          <h3
            id="session-factions"
            className="px-3 pb-3 pt-2 font-sans text-base font-medium tracking-normal"
          >
            {copy.session.factions}
          </h3>
          <ol>
            {order.map((faction, factionIndex) => {
              const definition = definitions.factions.find((item) => item.id === faction.factionId);
              const voted = factionIndex < step;
              return (
                <li
                  key={faction.factionId}
                  data-testid={`session-faction-${faction.factionId}`}
                  className={cn(
                    'grid min-h-14 grid-cols-[10px_1fr_auto] items-center gap-3 rounded-md px-3 transition-colors duration-200',
                    factionIndex === step - 1 && !done && 'bg-raised',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{ backgroundColor: definition?.color }}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm">{definition?.name ?? faction.factionId}</span>
                    <span className="text-xs text-muted-foreground">
                      {copy.session.factionMeta(
                        faction.seats,
                        definition?.ideologyTags.join(', ') ?? '',
                      )}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs',
                      !voted && 'text-muted-foreground',
                      voted && faction.vote === 'FOR' && 'text-primary',
                      voted && faction.vote === 'AGAINST' && 'text-negative',
                    )}
                  >
                    {!voted
                      ? copy.session.votePending
                      : faction.vote === 'FOR'
                        ? copy.session.voteFor(faction.seats)
                        : copy.session.voteAgainst(faction.seats)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
