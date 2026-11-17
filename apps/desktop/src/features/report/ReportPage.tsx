import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { INDICATOR_DOMAINS, INDICATOR_KEYS, type TurnReport } from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { displayIndicator, isFavourable, useGameState } from '@/app/useGame';
import { copy } from '@/copy/id';
import { formatInteger, formatRupiahTriliun, formatSignedIndicator } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { cn } from '@/ui/lib/utils';

import { ReportView } from './ReportView';

/** Ringkasan akhir slice: awal vs akhir masa jabatan (arketipe menyusul di Tahap 4). */
function CampaignSummary() {
  const state = useGameState();
  const [first, setFirst] = useState<TurnReport | null>(null);

  useEffect(() => {
    let alive = true;
    void gameController.loadHistory().then((history) => {
      if (alive) setFirst(history.reports[0] ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const stats = state.campaignStats;
  return (
    <Card className="mb-6 border-primary/40" data-testid="campaign-summary">
      <CardHeader>
        <p className="institutional-label">{copy.report.summaryKicker}</p>
        <CardTitle className="mt-2 text-2xl">
          {copy.report.summaryTitle(state.presidentName)}
        </CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">{copy.report.summaryNote}</p>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <table className="w-full text-left text-sm">
          <thead className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="py-2 pr-3 font-medium">{copy.history.indicators}</th>
              <th className="px-3 py-2 text-right font-medium">{copy.report.start}</th>
              <th className="px-3 py-2 text-right font-medium">{copy.report.end}</th>
              <th className="py-2 pl-3 text-right font-medium">{copy.history.ledgerDelta}</th>
            </tr>
          </thead>
          <tbody>
            {INDICATOR_KEYS.map((key) => {
              const start = first?.indicatorsBefore[key] ?? state.indicators[key];
              const delta = state.indicators[key] - start;
              return (
                <tr key={key} className="border-b border-border/30 last:border-b-0">
                  <td className="py-2 pr-3">{INDICATOR_DOMAINS[key].shortLabel}</td>
                  <td className="numeric px-3 py-2 text-right text-muted-foreground">
                    {displayIndicator(key, start)}
                  </td>
                  <td className="numeric px-3 py-2 text-right">
                    {displayIndicator(key, state.indicators[key])}
                  </td>
                  <td
                    className={cn(
                      'numeric py-2 pl-3 text-right',
                      delta === 0
                        ? 'text-muted-foreground'
                        : isFavourable(key, delta)
                          ? 'text-emerald-300/85'
                          : 'text-red-300/85',
                    )}
                  >
                    {formatSignedIndicator(delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <dl className="grid grid-cols-2 content-start gap-4 text-sm">
          {[
            [copy.report.statPolicies, formatInteger(stats.policiesEnacted)],
            [
              copy.report.statVotes,
              `${formatInteger(stats.votesHeld - stats.votesFailed)}/${formatInteger(stats.votesHeld)}`,
            ],
            [copy.report.statLobbies, formatInteger(stats.lobbies)],
            [copy.report.statEvents, formatInteger(stats.eventsResolved)],
            [copy.report.statTreasury, formatRupiahTriliun(state.treasuryBillion)],
          ].map(([label, value]) => (
            <div key={label} className="border-l border-primary/40 pl-3">
              <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
                {label}
              </dt>
              <dd className="numeric mt-1 font-serif text-xl">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export default function ReportPage() {
  const state = useGameState();
  const report = useGameStore((store) => store.lastReport);

  return (
    <>
      <PageHeader
        kicker={copy.report.kicker}
        title={
          report === null
            ? copy.report.title
            : copy.report.reportTitle(report.presidentName, report.turn)
        }
        subtitle={copy.report.subtitle}
        actions={
          <Button asChild size="sm">
            <Link to="/game/dashboard">{copy.report.continue}</Link>
          </Button>
        }
      />
      {state.status === 'completed' && <CampaignSummary />}
      {report === null ? (
        <p className="text-sm text-muted-foreground">{copy.dashboard.noReport}</p>
      ) : (
        <ReportView report={report} />
      )}
    </>
  );
}
