import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { EventDefinition, PendingEvent } from '@republika/shared';

import { campaignQuarter, campaignYear } from '@/app/time';
import { useGameState } from '@/app/useGame';
import { eventArt } from '@/content/art';
import { definitions } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { gameController } from '@/store/controller';
import { ArtImage } from '@/ui/ArtImage';
import { cn } from '@/ui/lib/utils';
import { Stamp } from '@/ui/Stamp';

import { choiceConsequences, choiceImpact, stakeholders, type Stake } from './memo';

const STAKE_LABEL: Record<Stake, string> = {
  gain: copy.events.stakeGain,
  loss: copy.events.stakeLoss,
  waiting: copy.events.stakeWaiting,
  neutral: copy.events.stakeNeutral,
};

const inkButton =
  'inline-flex h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium text-paper transition-colors duration-150 ease-standard hover:bg-[#2E2A22] disabled:cursor-not-allowed disabled:opacity-40';

function Memo({
  pending,
  event,
  presidentName,
  turn,
}: {
  pending: PendingEvent;
  event: EventDefinition;
  presidentName: string;
  turn: number;
}) {
  const signedChoice = pending.resolvedChoiceId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(signedChoice);
  const signed = signedChoice !== null && !editing;
  const picked = signed ? signedChoice : draft;
  const pickedChoice = event.choices.find((choice) => choice.id === picked) ?? null;
  const year = campaignYear(turn, definitions.scenario.startYear);
  const quarter = campaignQuarter(turn);
  const titleId = `memo-${event.id}-title`;

  const sign = () => {
    if (pickedChoice === null) return;
    const result = gameController.dispatch({
      type: 'RESPOND_EVENT',
      commandId: gameController.newCommandId(),
      eventId: event.id,
      choiceId: pickedChoice.id,
    });
    if (result.ok) {
      setEditing(false);
      gameController.notify(copy.events.chosen(pickedChoice.label));
    }
  };

  const impact = pickedChoice === null ? [] : choiceImpact(pickedChoice);
  const parties = stakeholders(event, picked, definitions.factions);

  return (
    <div className="flex flex-wrap items-start justify-center gap-8">
      <article
        aria-labelledby={titleId}
        data-testid={`event-${event.id}`}
        className="relative min-w-0 max-w-[760px] flex-[1_1_600px] overflow-hidden rounded-lg bg-paper text-ink shadow-document"
      >
        <div className="flex justify-center px-10 pt-8">
          <ArtImage
            load={eventArt(event.id)}
            alt={copy.art.event(event.title)}
            className="aspect-[19/16] w-full max-w-[420px] border border-ink/10"
          />
        </div>

        <div className="relative flex flex-col gap-4 px-10 pb-10 pt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span
                className={cn('text-xs font-semibold', signed ? 'text-ink-muted' : 'text-urgent')}
              >
                {signed ? copy.events.memoKickerSigned : copy.events.memoKicker}
              </span>
              <span className="text-[13px] text-ink-muted">
                {copy.events.memoMeta(presidentName)}
              </span>
            </div>
            <div className="relative flex flex-col items-end">
              <span className="font-mono text-xs text-ink-muted">
                {copy.events.memoNumber(pending.arrivedTurn, year)}
              </span>
              <div className="pointer-events-none absolute right-0 top-6">
                <Stamp
                  label={copy.events.stamp}
                  visible={signed}
                  className="bg-paper/60 text-[22px]"
                />
                {signed && (
                  <span className="mt-1 block -rotate-[8deg] text-center font-mono text-[11px] text-stamp">
                    {copy.events.stampMeta(year, quarter)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <h2 id={titleId} className="font-serif text-[34px] font-medium leading-tight">
            {event.title}
          </h2>
          <p className="font-serif text-lg leading-[30px] text-[#3A352C]">{event.body}</p>

          <div className="my-2 h-px bg-ink/15" />
          <span className="text-[13px] font-medium text-[#4A443A]">
            {copy.events.optionsTitle} · {copy.events.apFree}
          </span>

          <div
            role="radiogroup"
            aria-label={copy.events.optionsAria}
            className="flex flex-col gap-2"
          >
            {event.choices.map((choice) => {
              const checked = picked === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={signed}
                  onClick={() => setDraft(choice.id)}
                  className={cn(
                    'flex w-full flex-col gap-2 rounded-[10px] p-4 text-left text-sm text-ink transition-colors duration-150 ease-standard focus-visible:outline-[#7A5A0A]',
                    checked
                      ? 'bg-paper-dark shadow-[inset_0_0_0_1.5px_hsl(var(--ink))]'
                      : 'shadow-[inset_0_0_0_1px_rgba(30,27,22,0.18)] enabled:hover:bg-paper-dark',
                    signed && !checked && 'opacity-60',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_1.5px_hsl(var(--ink))]"
                    >
                      <span className={cn('h-2 w-2 rounded-full', checked && 'bg-ink')} />
                    </span>
                    <span className="font-serif text-lg font-medium">{choice.label}</span>
                    {choice.neutral && (
                      <span className="text-xs text-ink-muted">{copy.events.neutral}</span>
                    )}
                  </span>
                  {choice.hint !== undefined && (
                    <span className="pl-[30px] text-sm leading-[22px] text-[#4A443A]">
                      {choice.hint}
                    </span>
                  )}
                  <span className="flex flex-wrap gap-1.5 pl-[30px]">
                    {choiceConsequences(choice).map((item) => (
                      <span
                        key={item.key}
                        className={cn(
                          'rounded-[4px] bg-ink/[0.06] px-2 py-0.5 font-mono text-xs',
                          item.good === true && 'text-[#17573A]',
                          item.good === false && 'text-stamp',
                          item.good === null && 'text-[#4A443A]',
                        )}
                      >
                        {item.text}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4">
            {signed ? (
              <>
                <Link to="/game/dashboard" className={inkButton}>
                  {copy.events.backToDesk}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(signedChoice);
                    setEditing(true);
                  }}
                  className="text-sm font-medium text-[#7A5A0A] underline underline-offset-2"
                >
                  {copy.events.changeDecision}
                </button>
                <span className="text-[13px] text-ink-muted">{copy.events.changeNote}</span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={inkButton}
                  disabled={pickedChoice === null}
                  onClick={sign}
                >
                  {copy.events.sign}
                </button>
                <span className="text-[13px] text-ink-muted">
                  {pickedChoice === null ? copy.events.signHintEmpty : copy.events.signHintReady}
                </span>
              </>
            )}
          </div>
        </div>
      </article>

      <aside className="flex min-w-[260px] flex-[0_1_320px] flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-sans text-[15px] font-medium tracking-normal">
            {copy.events.impactTitle}
          </h3>
          {impact.length === 0 ? (
            <p className="text-[13px] leading-5 text-muted-foreground">{copy.events.impactEmpty}</p>
          ) : (
            <dl className="flex flex-col gap-2">
              {impact.map((row) => (
                <div key={row.key} className="flex justify-between gap-3 text-sm">
                  <dt className="text-text-secondary">
                    {row.label}
                    {row.note !== undefined && (
                      <span className="ml-1 text-xs text-muted-foreground">· {row.note}</span>
                    )}
                  </dt>
                  <dd
                    className={cn(
                      'font-mono text-[13px]',
                      row.good === true && 'text-positive',
                      row.good === false && 'text-negative',
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <span className="text-xs leading-[18px] text-muted-foreground">
            {copy.events.impactNote}
          </span>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-sans text-[15px] font-medium tracking-normal">
            {copy.events.stakeholdersTitle}
          </h3>
          {parties.length === 0 ? (
            <p className="text-[13px] leading-5 text-muted-foreground">
              {copy.events.stakeholdersEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {parties.map((party) => (
                <li key={party.factionId} className="flex justify-between gap-3 text-sm">
                  <span>{party.name}</span>
                  <span
                    className={cn(
                      'text-text-secondary',
                      party.stake === 'gain' && 'text-positive',
                      party.stake === 'loss' && 'text-negative',
                    )}
                  >
                    {STAKE_LABEL[party.stake]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

export default function EventsPage() {
  const state = useGameState();
  const memos = state.pendingEvents.flatMap((pending) => {
    const event = definitions.events.find((item) => item.id === pending.eventId);
    return event === undefined ? [] : [{ pending, event }];
  });

  return (
    <div className="flex flex-col gap-10">
      {memos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          {copy.events.empty}
        </p>
      ) : (
        memos.map(({ pending, event }) => (
          <Memo
            key={`${event.id}-${pending.arrivedTurn}`}
            pending={pending}
            event={event}
            presidentName={state.presidentName}
            turn={state.turn}
          />
        ))
      )}
    </div>
  );
}
