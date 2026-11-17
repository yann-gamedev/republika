import { useMemo, useState } from 'react';

import {
  INDICATOR_DOMAINS,
  INDICATOR_KEYS,
  type IndicatorKey,
  type TurnReport,
} from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { copy } from '@/copy/id';
import { createMockHistory, voteFactionName } from '@/features/mock/mockHistory';
import { mockDefinitions, mockPolicyName } from '@/features/mock/mockState';
import {
  formatIndicator,
  formatInteger,
  formatPercentTenths,
  formatRupiahTriliun,
  formatSignedIndicator,
  formatSignedRupiahTriliun,
} from '@/format/formatters';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Progress } from '@/ui/components/progress';
import { IconBook, IconClock, IconCoins, IconVote } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';

function indicatorValue(key: IndicatorKey, valueTenths: number): string {
  return INDICATOR_DOMAINS[key].unit === 'percent'
    ? formatPercentTenths(valueTenths)
    : formatIndicator(valueTenths);
}

function ledgerAmount(kind: string, amountBillion?: number, deltaTenths?: number): string | null {
  if (amountBillion !== undefined) return formatSignedRupiahTriliun(amountBillion);
  if (deltaTenths !== undefined) return formatSignedIndicator(deltaTenths);
  if (kind === 'SYSTEM') return null;
  return null;
}

function eventTitle(eventId: string): string {
  return mockDefinitions.events.find((event) => event.id === eventId)?.title ?? eventId;
}

function choiceLabel(eventId: string, choiceId: string): string {
  const event = mockDefinitions.events.find((item) => item.id === eventId);
  const choice = event?.choices.find((item) => item.id === choiceId);
  return choice?.label ?? choiceId;
}

function ReportDetail({ report }: { report: TurnReport }) {
  const treasuryDelta = report.treasuryAfterBillion - report.treasuryBeforeBillion;
  const passedVotes = report.votes.filter((vote) => vote.passed).length;

  return (
    <Card>
      <CardHeader className="border-b border-border/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="institutional-label">
              {copy.history.reportMeta(report.turn, report.year, report.quarter)}
            </p>
            <CardTitle className="mt-2 text-2xl">
              {copy.history.reportFor(report.presidentName)}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">
              {copy.common.turn} {formatInteger(report.turn)}
            </Badge>
            <Badge variant={passedVotes > 0 ? 'success' : 'outline'}>
              {copy.history.votes} {formatInteger(report.votes.length)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <section>
          <p className="institutional-label">{copy.history.summary}</p>
          <ul className="mt-2.5 space-y-1.5">
            {report.summary.map((line, index) => (
              <li
                key={`${report.turn}-summary-${index}`}
                className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
              >
                <span className="mt-[0.45rem] h-px w-3 shrink-0 bg-primary/50" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="border border-border/50 bg-card/25 p-4">
            <p className="institutional-label">{copy.history.treasury}</p>
            <p className="numeric mt-2 text-lg">
              {formatRupiahTriliun(report.treasuryBeforeBillion)}
            </p>
            <p className="numeric mt-1 text-xs text-muted-foreground">
              → {formatRupiahTriliun(report.treasuryAfterBillion)} ·{' '}
              <span className={treasuryDelta < 0 ? 'text-red-300/85' : 'text-emerald-300/85'}>
                {formatSignedRupiahTriliun(treasuryDelta)}
              </span>
            </p>
          </div>
          <div className="border border-border/50 bg-card/25 p-4">
            <p className="institutional-label">{copy.history.indicators}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {copy.history.before} → {copy.history.after}
            </p>
            <p className="numeric mt-1 text-lg">
              {formatIndicator(report.indicatorsAfter.approval)}
            </p>
          </div>
        </div>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="institutional-label">{copy.history.indicators}</p>
            <span className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground/60">
              {copy.history.fixedPoint}
            </span>
          </div>
          <div className="mt-2 overflow-hidden border border-border/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{copy.history.indicators}</th>
                  <th className="px-3 py-2 text-right font-medium">{copy.history.before}</th>
                  <th className="px-3 py-2 text-right font-medium">{copy.history.after}</th>
                  <th className="px-3 py-2 text-right font-medium">{copy.history.ledgerDelta}</th>
                </tr>
              </thead>
              <tbody>
                {INDICATOR_KEYS.map((key) => {
                  const before = report.indicatorsBefore[key];
                  const after = report.indicatorsAfter[key];
                  const delta = after - before;
                  return (
                    <tr key={key} className="border-t border-border/40">
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {INDICATOR_DOMAINS[key].shortLabel}
                      </td>
                      <td className="numeric px-3 py-1.5 text-right text-muted-foreground">
                        {indicatorValue(key, before)}
                      </td>
                      <td className="numeric px-3 py-1.5 text-right">
                        {indicatorValue(key, after)}
                      </td>
                      <td
                        className={cn(
                          'numeric px-3 py-1.5 text-right',
                          delta === 0
                            ? 'text-muted-foreground/60'
                            : (key === 'inflationPct' || key === 'unemploymentPct') === delta < 0
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
          </div>
        </section>

        <section className="mt-6">
          <p className="institutional-label">{copy.history.votes}</p>
          {report.votes.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">{copy.history.noVotes}</p>
          ) : (
            <div className="mt-2 space-y-3">
              {report.votes.map((vote) => (
                <div key={vote.policyId} className="border border-border/50 bg-card/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">{mockPolicyName(vote.policyId)}</p>
                    <Badge variant={vote.passed ? 'success' : 'destructive'}>
                      {vote.passed ? copy.history.votePassed : copy.history.voteFailed}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[0.65rem] text-muted-foreground">
                    <span>{copy.history.seatsFor(vote.seatsFor)}</span>
                    <span>{copy.history.seatsAgainst(vote.seatsAgainst)}</span>
                  </div>
                  <Progress className="mt-1.5" value={vote.seatsFor} />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.62rem] text-muted-foreground">
                    {vote.factionVotes.map((factionVote) => (
                      <span key={factionVote.factionId}>
                        {voteFactionName(factionVote.factionId)} ·{' '}
                        {copy.history.voteScore(factionVote.score)} ·{' '}
                        {factionVote.vote === 'FOR' ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <p className="institutional-label">{copy.history.ledger}</p>
          {report.ledger.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">{copy.history.noLedger}</p>
          ) : (
            <ul className="mt-2 divide-y divide-border/40 border border-border/50">
              {report.ledger.map((entry) => {
                const amount = ledgerAmount(entry.kind, entry.amountBillion, entry.deltaTenths);
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge variant="outline">{copy.history.ledgerKinds[entry.kind]}</Badge>
                      <span className="truncate text-muted-foreground">
                        {entry.message ?? entry.reasonCode}
                      </span>
                    </div>
                    {amount !== null && (
                      <span className="numeric shrink-0 text-foreground">{amount}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {report.resolvedEvents.length > 0 && (
          <section className="mt-6">
            <p className="institutional-label">{copy.history.event}</p>
            <ul className="mt-2 space-y-1.5">
              {report.resolvedEvents.map((event) => (
                <li key={event.eventId} className="text-xs text-muted-foreground">
                  {eventTitle(event.eventId)} ·{' '}
                  {copy.history.resolvedChoice(choiceLabel(event.eventId, event.choiceId))}
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const presidentName = useAppStore((store) => store.gameState.presidentName);
  const reports = useMemo(() => createMockHistory(presidentName), [presidentName]);
  const [selectedTurn, setSelectedTurn] = useState(() => Math.max(reports.length - 1, 0));

  const selected = reports[selectedTurn] ?? reports[reports.length - 1];
  const voteCount = reports.reduce((total, report) => total + report.votes.length, 0);
  const resolvedCount = reports.reduce((total, report) => total + report.resolvedEvents.length, 0);

  return (
    <>
      <PageHeader
        kicker={copy.history.kicker}
        title={copy.history.title}
        subtitle={copy.history.subtitle}
        actions={<Badge variant="outline">{copy.history.reportCount(reports.length)}</Badge>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="border border-border/50 bg-card/30 px-4 py-3">
          <p className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
            <IconBook className="h-3.5 w-3.5" /> {copy.common.turn}
          </p>
          <p className="numeric mt-1.5 font-serif text-xl">
            {reports.length === 0 ? copy.common.none : formatInteger(reports.length)}
          </p>
        </div>
        <div className="border border-border/50 bg-card/30 px-4 py-3">
          <p className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
            <IconVote className="h-3.5 w-3.5" /> {copy.history.votes}
          </p>
          <p className="numeric mt-1.5 font-serif text-xl">{formatInteger(voteCount)}</p>
        </div>
        <div className="border border-border/50 bg-card/30 px-4 py-3">
          <p className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
            <IconClock className="h-3.5 w-3.5" /> {copy.history.event}
          </p>
          <p className="numeric mt-1.5 font-serif text-xl">{formatInteger(resolvedCount)}</p>
        </div>
        <div className="border border-border/50 bg-card/30 px-4 py-3">
          <p className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
            <IconCoins className="h-3.5 w-3.5" /> {copy.history.treasury}
          </p>
          <p className="numeric mt-1.5 font-serif text-xl">
            {selected === undefined
              ? copy.common.none
              : formatRupiahTriliun(selected.treasuryAfterBillion)}
          </p>
        </div>
      </div>

      {reports.length === 0 || selected === undefined ? (
        <div className="border border-dashed border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
          {copy.history.empty}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside>
            <p className="institutional-label mb-3">{copy.history.reportCount(reports.length)}</p>
            <div className="space-y-1.5">
              {reports.map((report, index) => {
                const active = index === selectedTurn;
                return (
                  <button
                    key={report.turn}
                    type="button"
                    onClick={() => setSelectedTurn(index)}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 border px-3 py-2.5 text-left text-xs transition-colors',
                      active
                        ? 'border-primary/50 bg-primary/[0.08] text-foreground'
                        : 'border-border/50 bg-card/25 text-muted-foreground hover:border-primary/30 hover:bg-card/50',
                    )}
                  >
                    <span>{copy.history.turnTitle(report.year, report.quarter)}</span>
                    <span className="numeric text-[0.6rem] uppercase tracking-[0.12em] opacity-70">
                      K{report.turn}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <ReportDetail report={selected} />
        </div>
      )}

      <p className="mt-5 text-[0.65rem] leading-relaxed text-muted-foreground/70">
        {copy.history.subtitle}
      </p>
    </>
  );
}
