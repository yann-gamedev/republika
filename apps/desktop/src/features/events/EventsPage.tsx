import { PageHeader } from '@/app/PageHeader';
import { copy } from '@/copy/id';
import { effectText, requirementText } from '@/features/content/effectText';
import { mockContentNames, mockDefinitions } from '@/features/mock/mockState';
import { formatInteger } from '@/format/formatters';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { cn } from '@/ui/lib/utils';

export default function EventsPage() {
  const state = useAppStore((store) => store.gameState);
  const mockSelections = useAppStore((store) => store.mockSelections);
  const selectEventChoice = useAppStore((store) => store.selectEventChoice);

  const pendingEvents = state.pendingEvents.flatMap((pending) => {
    const definition = mockDefinitions.events.find((event) => event.id === pending.eventId);
    return definition === undefined ? [] : [{ pending, definition }];
  });

  const resolvedEvents = Object.entries(mockSelections).flatMap(([eventId, choiceId]) => {
    const definition = mockDefinitions.events.find((event) => event.id === eventId);
    if (definition === undefined) return [];
    const choice = definition.choices.find((item) => item.id === choiceId);
    if (choice === undefined) return [];
    return [{ definition, choice }];
  });

  const otherEvents = mockDefinitions.events.filter(
    (event) => !state.pendingEvents.some((pending) => pending.eventId === event.id),
  );

  return (
    <>
      <PageHeader
        kicker={copy.events.kicker}
        title={copy.events.title}
        subtitle={copy.events.subtitle}
        actions={
          <Badge variant={pendingEvents.length > 0 ? 'maroon' : 'outline'}>
            {copy.events.pendingCount(state.pendingEvents.length)}
          </Badge>
        }
      />

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-serif text-xl leading-none">{copy.events.pending}</h2>
          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            {copy.events.apFree}
          </span>
        </div>

        {pendingEvents.length === 0 ? (
          <div className="border border-dashed border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
            {copy.events.empty}
          </div>
        ) : (
          <div className="space-y-5">
            {pendingEvents.map(({ pending, definition }) => {
              const selectedChoiceId = mockSelections[definition.id];
              const selectedChoice = definition.choices.find(
                (choice) => choice.id === selectedChoiceId,
              );
              return (
                <Card key={definition.id} className="overflow-hidden">
                  <CardHeader className="border-b border-border/40 bg-maroon/[0.06]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="maroon">{copy.events.pending}</Badge>
                          <Badge variant="outline">{copy.events.apFree}</Badge>
                          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {copy.events.turnArrived(pending.arrivedTurn)}
                          </span>
                        </div>
                        <CardTitle className="mt-3 text-2xl">{definition.title}</CardTitle>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                          {copy.events.weight}
                        </p>
                        <p className="numeric mt-1 text-sm">
                          {formatInteger(definition.triggerWeight)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                      {definition.body}
                    </p>
                  </CardHeader>

                  <CardContent className="pt-5">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.62fr)]">
                      <div className="space-y-3">
                        {definition.choices.map((choice) => {
                          const isSelected = choice.id === selectedChoiceId;
                          return (
                            <div
                              key={choice.id}
                              className={cn(
                                'border p-4 transition-colors',
                                isSelected
                                  ? 'border-primary/50 bg-primary/[0.07]'
                                  : 'border-border/60 bg-card/30',
                              )}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-serif text-base leading-tight">
                                      {choice.label}
                                    </p>
                                    {choice.neutral && (
                                      <Badge variant="outline">{copy.events.neutral}</Badge>
                                    )}
                                    {isSelected && (
                                      <Badge variant="success">{copy.events.selected}</Badge>
                                    )}
                                  </div>
                                  {choice.hint !== undefined && (
                                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                      {copy.events.hint}: {choice.hint}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {choice.effects.length > 0 && (
                                <ul className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
                                  {choice.effects.map((effect, index) => (
                                    <li
                                      key={`${choice.id}-effect-${index}`}
                                      className="flex gap-2 text-[0.7rem] leading-relaxed text-muted-foreground"
                                    >
                                      <span
                                        className="mt-[0.42rem] h-px w-2.5 shrink-0 bg-primary/50"
                                        aria-hidden="true"
                                      />
                                      <span>{effectText(effect, mockContentNames)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              <div className="mt-3 flex justify-end">
                                <Button
                                  size="sm"
                                  variant={isSelected ? 'outline' : 'default'}
                                  disabled={selectedChoiceId !== undefined}
                                  onClick={() =>
                                    selectEventChoice(
                                      definition.id,
                                      choice.id,
                                      copy.events.chosenMock(choice.label),
                                    )
                                  }
                                >
                                  {isSelected ? copy.events.selected : copy.events.choose}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-4 border-l border-border/40 pl-5">
                        <div>
                          <p className="institutional-label">{copy.events.eligibility}</p>
                          {definition.eligibility.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {copy.policies.noRequirements}
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-1.5">
                              {definition.eligibility.map((requirement, index) => (
                                <li
                                  key={`${definition.id}-eligibility-${index}`}
                                  className="text-[0.7rem] leading-relaxed text-muted-foreground"
                                >
                                  {requirementText(requirement, mockContentNames)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <p className="institutional-label">{copy.events.chain}</p>
                          <p className="mt-2 text-[0.7rem] leading-relaxed text-muted-foreground">
                            {definition.uniquePerCampaign
                              ? copy.events.resolvedInHistory
                              : copy.events.resolvedEmpty}
                          </p>
                        </div>

                        {selectedChoice !== undefined && (
                          <div className="border-t border-border/40 pt-4">
                            <p className="institutional-label">{copy.events.selected}</p>
                            <p className="mt-2 font-serif text-sm">{selectedChoice.label}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-serif text-xl leading-none">{copy.events.resolved}</h2>
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              {formatInteger(resolvedEvents.length)}
            </span>
          </div>

          {resolvedEvents.length === 0 ? (
            <div className="border border-dashed border-border/60 px-5 py-7 text-center text-sm text-muted-foreground">
              {copy.events.resolvedEmpty}
            </div>
          ) : (
            <ul className="space-y-2">
              {resolvedEvents.map(({ definition, choice }) => (
                <li key={definition.id} className="border border-border/50 bg-card/25 px-4 py-3">
                  <p className="text-sm">{definition.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.history.resolvedChoice(choice.label)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-serif text-xl leading-none">{copy.events.chain}</h2>
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              {formatInteger(otherEvents.length)}
            </span>
          </div>
          <ul className="space-y-2">
            {otherEvents.map((event) => (
              <li key={event.id} className="border border-border/50 bg-card/25 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{event.title}</p>
                    <p className="mt-1 text-[0.68rem] text-muted-foreground">
                      {copy.events.weight} {formatInteger(event.triggerWeight)} ·{' '}
                      {copy.policies.durationValue(event.cooldownTurns)}
                    </p>
                  </div>
                  <Badge variant="outline">{copy.common.inactive}</Badge>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.65rem] leading-relaxed text-muted-foreground/70">
            {copy.events.resolvedInHistory}
          </p>
        </div>
      </section>
    </>
  );
}
