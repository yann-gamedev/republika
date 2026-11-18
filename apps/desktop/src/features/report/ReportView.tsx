import { INDICATOR_DOMAINS, INDICATOR_KEYS, type TurnReport } from '@republika/shared';

import { displayIndicator, isFavourable } from '@/app/useGame';
import { definitions, eventTitle, factionName, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import {
  formatIndicator,
  formatInteger,
  formatRupiahTriliun,
  formatSignedIndicator,
  formatSignedRupiahTriliun,
} from '@/format/formatters';
import { Badge } from '@/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { deltaArrow } from '@/ui/components/term';
import { cn } from '@/ui/lib/utils';

import { reasonText } from './reasonText';

function choiceLabel(eventId: string, choiceId: string): string {
  const event = definitions.events.find((item) => item.id === eventId);
  return event?.choices.find((choice) => choice.id === choiceId)?.label ?? choiceId;
}

/** Penyebab perubahan kas, dijumlah per (reasonCode, sumber), terbesar dulu. */
function treasuryCauses(report: TurnReport) {
  const groups = new Map<string, { reasonCode: string; sourceId?: string; delta: number }>();
  for (const entry of report.ledger) {
    if (entry.kind !== 'TREASURY' || entry.delta === undefined) continue;
    const key = `${entry.reasonCode}|${entry.sourceId ?? ''}`;
    const existing = groups.get(key);
    if (existing !== undefined) existing.delta += entry.delta;
    else
      groups.set(key, {
        reasonCode: entry.reasonCode,
        ...(entry.sourceId !== undefined ? { sourceId: entry.sourceId } : {}),
        delta: entry.delta,
      });
  }
  return [...groups.values()].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function ReportView({ report }: { report: TurnReport }) {
  return (
    <div className="space-y-5" data-testid={`report-${report.turn}`}>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <p className="institutional-label">{copy.history.indicators}</p>
            <CardTitle className="mt-2">{copy.report.whyTitle}</CardTitle>
          </div>
          <Badge variant="outline">
            {copy.history.reportMeta(report.turn, report.year, report.quarter)}
          </Badge>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/50">
                <th className="py-2 pr-3 font-medium">{copy.history.indicators}</th>
                <th className="px-3 py-2 text-right font-medium">{copy.history.before}</th>
                <th className="px-3 py-2 text-right font-medium">{copy.history.after}</th>
                <th className="px-3 py-2 text-right font-medium">{copy.history.ledgerDelta}</th>
                <th className="py-2 pl-3 font-medium">{copy.report.causes}</th>
              </tr>
            </thead>
            <tbody>
              {INDICATOR_KEYS.map((key) => {
                const delta = report.indicatorDeltas[key];
                return (
                  <tr key={key} className="border-b border-border/30 align-top last:border-b-0">
                    <td className="py-2.5 pr-3">{INDICATOR_DOMAINS[key].shortLabel}</td>
                    <td className="numeric px-3 py-2.5 text-right text-muted-foreground">
                      {displayIndicator(key, report.indicatorsBefore[key])}
                    </td>
                    <td className="numeric px-3 py-2.5 text-right">
                      {displayIndicator(key, report.indicatorsAfter[key])}
                    </td>
                    <td
                      className={cn(
                        'numeric px-3 py-2.5 text-right',
                        delta === 0
                          ? 'text-muted-foreground'
                          : isFavourable(key, delta)
                            ? 'text-emerald-300/85'
                            : 'text-red-300/85',
                      )}
                    >
                      <span aria-hidden="true">{deltaArrow(delta)} </span>
                      {formatSignedIndicator(delta)}
                    </td>
                    <td className="py-2.5 pl-3">
                      {report.topCauses[key].length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {report.topCauses[key].map((cause) => (
                            <li key={`${cause.reasonCode}-${cause.sourceId ?? ''}`}>
                              <span className="numeric text-foreground/80">
                                {formatSignedIndicator(cause.deltaTenths)}
                              </span>{' '}
                              {reasonText(cause.reasonCode, cause.sourceId)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="institutional-label">{copy.history.treasury}</p>
            <CardTitle className="numeric mt-2">
              {formatRupiahTriliun(report.treasuryBeforeBillion)} →{' '}
              {formatRupiahTriliun(report.treasuryAfterBillion)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'numeric text-sm',
                report.treasuryDeltaBillion >= 0 ? 'text-emerald-300/85' : 'text-red-300/85',
              )}
            >
              {formatSignedRupiahTriliun(report.treasuryDeltaBillion)}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {treasuryCauses(report).map((cause) => (
                <li
                  key={`${cause.reasonCode}-${cause.sourceId ?? ''}`}
                  className="flex justify-between gap-3"
                >
                  <span>{reasonText(cause.reasonCode, cause.sourceId)}</span>
                  <span className="numeric text-foreground/80">
                    {formatSignedRupiahTriliun(cause.delta)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="institutional-label">{copy.history.votes}</p>
            <CardTitle className="mt-2">{copy.report.decisionsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {report.policiesPassed.length === 0 && report.policiesFailed.length === 0 && (
              <p className="text-muted-foreground">{copy.report.noDecisions}</p>
            )}
            {report.policiesPassed.map((policyId) => (
              <p key={policyId} className="flex items-center justify-between gap-3">
                <span>{policyName(policyId)}</span>
                <Badge variant="success">{copy.report.passed}</Badge>
              </p>
            ))}
            {report.policiesFailed.map((policyId) => (
              <p key={policyId} className="flex items-center justify-between gap-3">
                <span>{policyName(policyId)}</span>
                <Badge variant="destructive">{copy.history.voteFailed}</Badge>
              </p>
            ))}
            {report.votes.map((vote) => (
              <div key={vote.policyId} className="border-t border-border/40 pt-3">
                <p className="text-xs text-muted-foreground">
                  {policyName(vote.policyId)} · {copy.history.seatsFor(vote.seatsFor)} ·{' '}
                  {copy.history.seatsAgainst(vote.seatsAgainst)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {vote.factionVotes.map((item) => (
                    <span
                      key={item.factionId}
                      className={cn(
                        'border px-1.5 py-0.5 text-xs',
                        item.vote === 'FOR'
                          ? 'border-emerald-800/50 text-emerald-300/85'
                          : 'border-maroon/50 text-red-300/80',
                      )}
                    >
                      {factionName(item.factionId)} ·{' '}
                      {copy.history.voteScore(formatIndicator(item.score))}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="institutional-label">{copy.history.event}</p>
          <CardTitle className="mt-2">{copy.report.eventsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{copy.report.eventsAnswered}</p>
            {report.resolvedEvents.length === 0 ? (
              <p className="mt-2 text-muted-foreground">{copy.history.noEvents}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {report.resolvedEvents.map((event) => (
                  <li key={event.eventId}>
                    {eventTitle(event.eventId)} —{' '}
                    <span className="text-muted-foreground">
                      {copy.history.resolvedChoice(choiceLabel(event.eventId, event.choiceId))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{copy.report.eventsNext}</p>
            {report.nextEventIds.length === 0 ? (
              <p className="mt-2 text-muted-foreground">{copy.report.noNextEvents}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {report.nextEventIds.map((eventId) => (
                  <li key={eventId} className="text-red-200/90">
                    {eventTitle(eventId)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {copy.report.ledgerCount(formatInteger(report.ledger.length))}
      </p>
    </div>
  );
}
