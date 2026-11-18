import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { INDICATOR_DOMAINS, INDICATOR_KEYS, type TurnReport } from '@republika/shared';
import { chronology, topDecisions } from '@republika/simulation';

import { PageHeader } from '@/app/PageHeader';
import { displayIndicator, useGameState } from '@/app/useGame';
import { definitions, eventTitle, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { sourceName } from '@/features/report/reasonText';
import { formatSignedIndicator } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { LineChart } from '@/ui/charts/LineChart';

function choiceLabel(eventId: string, choiceId: string): string {
  const event = definitions.events.find((item) => item.id === eventId);
  return event?.choices.find((choice) => choice.id === choiceId)?.label ?? choiceId;
}

/**
 * Laporan Akhir Masa Jabatan (AGENT §5.11): arketipe, grafik 8 indikator,
 * 5 keputusan paling berdampak, dan kronologi. Tanpa skor tunggal dan tanpa
 * label baik/buruk — warna netral untuk semua perubahan.
 */
export default function FinalReportPage() {
  const state = useGameState();
  const [reports, setReports] = useState<readonly TurnReport[] | null>(null);

  useEffect(() => {
    let alive = true;
    void gameController.loadHistory().then((history) => {
      if (alive) setReports(history.reports);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state.status !== 'completed') {
    return (
      <>
        <PageHeader
          kicker={copy.final.kicker}
          title={copy.final.notYetTitle}
          subtitle={copy.final.notYetBody}
        />
        <Button asChild size="sm">
          <Link to="/game/dashboard">{copy.report.continue}</Link>
        </Button>
      </>
    );
  }

  const archetype = definitions.archetypes.find((item) => item.id === state.archetypeId);
  const first = reports?.[0];
  const last = reports?.at(-1);
  const startYear = first?.year ?? definitions.scenario.startYear;
  const endYear = last?.year ?? startYear;

  return (
    <>
      <PageHeader
        kicker={copy.final.kicker}
        title={copy.final.title(state.presidentName, state.cabinetName, startYear, endYear)}
        subtitle={copy.final.subtitle}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/">{copy.game.menu}</Link>
          </Button>
        }
      />

      <Card className="border-primary/40" data-testid="final-archetype">
        <CardHeader>
          <p className="institutional-label">{copy.final.archetype}</p>
          <CardTitle className="mt-2 text-3xl">
            {archetype?.name ?? copy.final.noArchetype}
          </CardTitle>
        </CardHeader>
        {archetype !== undefined && (
          <CardContent>
            <p className="max-w-3xl font-serif text-base leading-relaxed text-foreground/85">
              {archetype.description}
            </p>
          </CardContent>
        )}
      </Card>

      {reports === null ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {INDICATOR_KEYS.map((key) => (
            <div
              key={key}
              className="h-40 animate-pulse bg-secondary/30 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : (
        <>
          <section className="mt-6" aria-label={copy.final.chartsTitle}>
            <h2 className="mb-4 font-serif text-xl">{copy.final.chartsTitle}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {INDICATOR_KEYS.map((key) => {
                const values =
                  first === undefined
                    ? []
                    : [
                        first.indicatorsBefore[key],
                        ...reports.map((report) => report.indicatorsAfter[key]),
                      ];
                const labels = values.map((_, index) =>
                  index === 0 ? copy.final.start : `K${index}`,
                );
                const startValue = values[0] ?? state.indicators[key];
                return (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <p className="institutional-label">{INDICATOR_DOMAINS[key].shortLabel}</p>
                      <p className="numeric mt-1 text-sm text-muted-foreground">
                        {displayIndicator(key, startValue)} →{' '}
                        {displayIndicator(key, state.indicators[key])}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <LineChart
                        ariaLabel={copy.final.chartAria(
                          INDICATOR_DOMAINS[key].label,
                          displayIndicator(key, startValue),
                          displayIndicator(key, state.indicators[key]),
                        )}
                        labels={labels}
                        height={140}
                        series={[
                          {
                            id: key,
                            label: INDICATOR_DOMAINS[key].shortLabel,
                            color: 'hsl(41 42% 58%)',
                            values,
                          },
                        ]}
                        formatValue={(value) => displayIndicator(key, value)}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <Card data-testid="final-decisions">
              <CardHeader>
                <p className="institutional-label">{copy.final.decisionsKicker}</p>
                <CardTitle className="mt-2">{copy.final.decisionsTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                {topDecisions(reports).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{copy.final.noDecisions}</p>
                ) : (
                  <ol className="space-y-3">
                    {topDecisions(reports).map((decision, index) => (
                      <li
                        key={`${decision.sourceType}-${decision.sourceId}`}
                        className="flex gap-3"
                      >
                        <span className="numeric font-serif text-lg text-primary/80">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm">
                            {sourceName(decision.sourceId) ?? decision.sourceId}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {decision.sourceType === 'POLICY'
                                ? copy.final.policy
                                : copy.final.event}{' '}
                              · K{decision.firstTurn}
                            </span>
                          </p>
                          <p className="numeric mt-1 text-xs text-muted-foreground">
                            {decision.indicatorDeltas
                              .slice(0, 3)
                              .map(
                                (item) =>
                                  `${INDICATOR_DOMAINS[item.indicator].shortLabel} ${formatSignedIndicator(item.deltaTenths)}`,
                              )
                              .join(' · ')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {copy.final.decisionsNote}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <p className="institutional-label">{copy.final.chronologyKicker}</p>
                <CardTitle className="mt-2">{copy.final.chronologyTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {chronology(reports).map((entry) => (
                    <li
                      key={entry.turn}
                      className="grid grid-cols-[132px_minmax(0,1fr)] gap-3 border-t border-border/30 pt-2 first:border-t-0 first:pt-0"
                    >
                      <span className="text-xs text-muted-foreground">
                        {copy.history.turnTitle(entry.year, entry.quarter)}
                      </span>
                      <span className="text-xs leading-relaxed">
                        {[
                          ...entry.policiesPassed.map((id) => copy.final.enacted(policyName(id))),
                          ...entry.policiesFailed.map((id) => copy.final.rejected(policyName(id))),
                          ...entry.events.map((event) =>
                            copy.final.answered(
                              eventTitle(event.eventId),
                              choiceLabel(event.eventId, event.choiceId),
                            ),
                          ),
                        ].join(' · ') || copy.final.quiet}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
