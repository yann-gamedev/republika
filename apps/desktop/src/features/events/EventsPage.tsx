import { INDICATOR_DOMAINS, type EffectRule, type EventChoice } from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { isFavourable, useGameState } from '@/app/useGame';
import { definitions, factionName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { gameController } from '@/store/controller';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Seal } from '@/ui/Seal';
import { cn } from '@/ui/lib/utils';

interface Consequence {
  readonly key: string;
  readonly text: string;
  readonly good: boolean | null;
}

/** Konsekuensi kualitatif: arah perubahan tanpa angka pasti. */
function consequence(effect: EffectRule, index: number): Consequence | null {
  switch (effect.type) {
    case 'MODIFY_INDICATOR':
      return {
        key: `${index}`,
        text: copy.events.qualitative(
          INDICATOR_DOMAINS[effect.target].shortLabel,
          effect.deltaTenths >= 0,
          effect.timing === 'DELAYED',
        ),
        good: isFavourable(effect.target, effect.deltaTenths),
      };
    case 'MODIFY_TREASURY':
      return {
        key: `${index}`,
        text: copy.events.qualitative(copy.common.treasury, effect.deltaBillion >= 0, false),
        good: effect.deltaBillion > 0,
      };
    case 'CHANGE_FACTION_SUPPORT':
      return {
        key: `${index}`,
        text: copy.events.qualitative(
          effect.target.kind === 'faction'
            ? copy.events.supportOf(factionName(effect.target.factionId))
            : copy.events.supportOfTag(effect.target.ideologyTag),
          effect.deltaTenths >= 0,
          false,
        ),
        good: effect.deltaTenths > 0,
      };
    case 'MODIFY_MINISTRY_EFFECTIVENESS':
      return {
        key: `${index}`,
        text: copy.events.qualitative(copy.cabinet.effectiveness, effect.delta >= 0, false),
        good: effect.delta > 0,
      };
    case 'SET_FLAG':
    case 'CLEAR_FLAG':
      // Flag adalah mekanisme rantai peristiwa; tidak dibocorkan ke pemain.
      return null;
  }
}

function ChoiceConsequences({ choice }: { choice: EventChoice }) {
  const items = choice.effects.flatMap((effect, index) => {
    const item = consequence(effect, index);
    return item === null ? [] : [item];
  });
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item.key}
          className={cn(
            'border px-1.5 py-0.5 text-xs',
            item.good === true && 'border-emerald-800/40 text-emerald-800',
            item.good === false && 'border-maroon/40 text-maroon',
            item.good === null && 'border-ink/20 text-ink/75',
          )}
        >
          {item.text}
        </li>
      ))}
    </ul>
  );
}

export default function EventsPage() {
  const state = useGameState();
  const pendingEvents = state.pendingEvents.flatMap((pending) => {
    const definition = definitions.events.find((event) => event.id === pending.eventId);
    return definition === undefined ? [] : [{ pending, definition }];
  });
  const unanswered = pendingEvents.filter(
    ({ pending }) => pending.resolvedChoiceId === null,
  ).length;

  const respond = (eventId: string, choice: EventChoice) => {
    const result = gameController.dispatch({
      type: 'RESPOND_EVENT',
      commandId: gameController.newCommandId(),
      eventId,
      choiceId: choice.id,
    });
    if (result.ok) gameController.notify(copy.events.chosen(choice.label));
  };

  return (
    <>
      <PageHeader
        kicker={copy.events.kicker}
        title={copy.events.title}
        subtitle={copy.events.subtitle}
        actions={
          <Badge variant={unanswered > 0 ? 'maroon' : 'outline'}>
            {copy.events.pendingCount(unanswered)}
          </Badge>
        }
      />

      {unanswered > 0 && (
        <p
          role="note"
          className="mb-5 border border-maroon/50 bg-maroon/10 px-5 py-3 text-xs leading-relaxed text-red-100/90"
        >
          {copy.events.lockExplanation}
        </p>
      )}

      {pendingEvents.length === 0 ? (
        <div className="border border-dashed border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
          {copy.events.empty}
        </div>
      ) : (
        <div className="space-y-8">
          {pendingEvents.map(({ pending, definition }) => (
            <article
              key={definition.id}
              data-testid={`event-${definition.id}`}
              className="relative mx-auto max-w-[860px] bg-paper px-10 py-9 text-ink shadow-document"
            >
              <div className="flex items-start justify-between gap-6 border-b border-ink/20 pb-5">
                <div>
                  <p className="text-xs font-semibold text-ink/75">{copy.events.memoKicker}</p>
                  <p className="mt-1 text-xs text-ink/75">
                    {copy.events.memoMeta(state.presidentName, pending.arrivedTurn)}
                  </p>
                  <h2 className="mt-4 font-serif text-[1.8rem] leading-tight">
                    {definition.title}
                  </h2>
                </div>
                <Seal label={copy.menu.sealLabel} className="h-14 w-14 shrink-0 text-maroon/70" />
              </div>
              <p className="mt-5 font-serif text-base leading-relaxed text-ink/85">
                {definition.body}
              </p>

              <p className="mt-7 text-xs font-semibold text-ink/75">
                {copy.events.optionsTitle} · {copy.events.apFree}
              </p>
              <div className="mt-3 space-y-3">
                {definition.choices.map((choice) => {
                  const selected = pending.resolvedChoiceId === choice.id;
                  return (
                    <div
                      key={choice.id}
                      className={cn(
                        'flex flex-wrap items-start justify-between gap-4 border px-4 py-3',
                        selected ? 'border-maroon/60 bg-maroon/[0.06]' : 'border-ink/20',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-base leading-tight">
                          {choice.label}
                          {choice.neutral && (
                            <span className="ml-2 text-xs text-ink/75">{copy.events.neutral}</span>
                          )}
                        </p>
                        {choice.hint !== undefined && (
                          <p className="mt-1 text-xs italic leading-relaxed text-ink/75">
                            {choice.hint}
                          </p>
                        )}
                        <ChoiceConsequences choice={choice} />
                      </div>
                      <Button
                        size="sm"
                        variant={selected ? 'outline' : 'default'}
                        className={selected ? 'border-maroon/60 text-maroon' : ''}
                        disabled={selected}
                        onClick={() => respond(definition.id, choice)}
                      >
                        {selected ? copy.events.selected : copy.events.choose}
                      </Button>
                    </div>
                  );
                })}
              </div>
              {pending.resolvedChoiceId !== null && (
                <p className="mt-4 text-xs text-ink/75">{copy.events.changeNote}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
