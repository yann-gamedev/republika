import { useEffect, useState } from 'react';

import {
  INDICATOR_DOMAINS,
  INDICATOR_KEYS,
  type IndicatorKey,
  type TurnReport,
} from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { displayIndicator, useGameState } from '@/app/useGame';
import { copy } from '@/copy/id';
import { ReportView } from '@/features/report/ReportView';
import { formatSignedIndicator } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { Badge } from '@/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { LineChart } from '@/ui/charts/LineChart';
import { deltaArrow } from '@/ui/components/term';
import { cn } from '@/ui/lib/utils';

export default function HistoryPage() {
  const state = useGameState();
  // History dimuat dari save hanya saat halaman ini dibuka (AGENT §5.17).
  const [reports, setReports] = useState<readonly TurnReport[] | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
  const [indicator, setIndicator] = useState<IndicatorKey>('approval');

  useEffect(() => {
    let alive = true;
    void gameController.loadHistory().then((history) => {
      if (!alive) return;
      setReports(history.reports);
      setSelectedTurn(history.reports.at(-1)?.turn ?? null);
    });
    return () => {
      alive = false;
    };
  }, [state.turn, state.status]);

  const selected = reports?.find((report) => report.turn === selectedTurn) ?? null;
  const first = reports?.[0];
  const series =
    reports === null || first === undefined
      ? []
      : [
          first.indicatorsBefore[indicator],
          ...reports.map((report) => report.indicatorsAfter[indicator]),
        ];
  const labels =
    reports === null || first === undefined
      ? []
      : [
          copy.dashboard.quarterTick(first.year, first.quarter),
          ...reports.map((report) => `${copy.dashboard.quarterTick(report.year, report.quarter)}+`),
        ];

  return (
    <>
      <PageHeader
        kicker={copy.history.kicker}
        title={copy.history.title}
        subtitle={copy.history.subtitle}
        actions={
          reports !== null && (
            <Badge variant="outline">{copy.history.reportCount(reports.length)}</Badge>
          )
        }
      />

      {reports === null ? (
        <div aria-busy="true" aria-label={copy.history.loading} className="space-y-4">
          <div className="h-64 animate-pulse bg-secondary/30 motion-reduce:animate-none" />
          <div className="h-40 animate-pulse bg-secondary/20 motion-reduce:animate-none" />
        </div>
      ) : reports.length === 0 ? (
        <div className="border border-dashed border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
          {copy.history.empty}
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
              <div>
                <p className="institutional-label">{copy.history.chartTitle}</p>
                <CardTitle className="mt-2">{INDICATOR_DOMAINS[indicator].label}</CardTitle>
              </div>
              <div
                role="group"
                aria-label={copy.history.selectIndicator}
                className="flex flex-wrap gap-1.5"
              >
                {INDICATOR_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={key === indicator}
                    onClick={() => setIndicator(key)}
                    className={cn(
                      'border px-2 py-1 text-[0.65rem] transition-colors',
                      key === indicator
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {INDICATOR_DOMAINS[key].shortLabel}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <LineChart
                ariaLabel={copy.history.chartSummary(
                  INDICATOR_DOMAINS[indicator].label,
                  displayIndicator(indicator, series[0] ?? 0),
                  displayIndicator(indicator, series.at(-1) ?? 0),
                  reports.length,
                )}
                labels={labels}
                series={[
                  {
                    id: indicator,
                    label: INDICATOR_DOMAINS[indicator].shortLabel,
                    color: 'hsl(41 42% 58%)',
                    values: series,
                  },
                ]}
                formatValue={(value) => displayIndicator(indicator, value)}
              />
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
            <nav aria-label={copy.history.timeline}>
              <p className="institutional-label mb-3">{copy.history.timeline}</p>
              <ol className="space-y-1">
                {reports.map((report) => (
                  <li key={report.turn}>
                    <button
                      type="button"
                      aria-current={report.turn === selectedTurn}
                      onClick={() => setSelectedTurn(report.turn)}
                      className={cn(
                        'w-full border-l-2 px-3 py-2 text-left text-sm transition-colors',
                        report.turn === selectedTurn
                          ? 'border-primary/80 bg-primary/[0.08]'
                          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                      )}
                    >
                      <span className="block">
                        {copy.history.turnTitle(report.year, report.quarter)}
                      </span>
                      <span className="numeric text-[0.62rem] text-muted-foreground">
                        {INDICATOR_DOMAINS[indicator].shortLabel}{' '}
                        {deltaArrow(report.indicatorDeltas[indicator])}{' '}
                        {formatSignedIndicator(report.indicatorDeltas[indicator])}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <div>
              {selected !== null && (
                <>
                  <h2 className="mb-4 font-serif text-xl">
                    {copy.report.reportTitle(selected.presidentName, selected.turn)}
                  </h2>
                  <ReportView report={selected} />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
