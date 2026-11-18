import { useState, type ReactNode } from 'react';

import {
  INDICATOR_DOMAINS,
  INDICATOR_KEYS,
  type IndicatorKey,
  type TurnReport,
} from '@republika/shared';

import { displayIndicator, isFavourable } from '@/app/useGame';
import { eventArt, sceneArt } from '@/content/art';
import { definitions, eventTitle, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import {
  formatInteger,
  formatRupiahTriliun,
  formatSignedIndicator,
  formatSignedRupiahTriliun,
} from '@/format/formatters';
import { ArtImage } from '@/ui/ArtImage';
import { IconChevronRight } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';
import { PaperSheet } from '@/ui/PaperSheet';

import { biggestMove, headline } from './news';
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

function deltaTone(key: IndicatorKey, delta: number): string {
  if (delta === 0) return 'text-ink-muted';
  return isFavourable(key, delta) ? 'text-[#17573A]' : 'text-stamp';
}

interface ReportViewProps {
  readonly report: TurnReport;
  readonly maxTurns: number;
  /** Laporan kuartal memakai `h1`; Riwayat sudah punya judul sendiri. */
  readonly titleAs?: 'h1' | 'p';
  readonly footer?: ReactNode;
}

/** Warta pagi: laporan kuartal dalam bentuk koran (TAHAP-6 §6A.4). */
export function ReportView({ report, maxTurns, titleAs = 'p', footer }: ReportViewProps) {
  const [open, setOpen] = useState<IndicatorKey | null>(() => biggestMove(report));
  const Title = titleAs;
  const news = headline(report, {
    delta: formatSignedRupiahTriliun(report.treasuryDeltaBillion),
    after: formatRupiahTriliun(report.treasuryAfterBillion),
  });
  const sideEvent = report.resolvedEvents[report.resolvedEvents.length - 1];

  return (
    <PaperSheet
      tone="note"
      data-testid={`report-${report.turn}`}
      className="mx-auto flex w-full max-w-[1080px] flex-col gap-7 px-12 pb-12 pt-10"
    >
      <header className="flex flex-col items-center gap-2 border-b-[3px] border-double border-ink/60 pb-4">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] gap-4 font-mono text-xs text-ink-muted">
          <span>{copy.report.edition(report.year, report.quarter)}</span>
          <Title className="text-center font-mono text-xs font-normal tracking-normal text-ink-muted">
            {copy.report.reportTitle(report.presidentName, report.turn)}
          </Title>
          <span className="text-right">{copy.report.number(report.turn, maxTurns)}</span>
        </div>
        <span className="font-serif text-[56px] font-semibold leading-none">
          {copy.report.masthead}
        </span>
      </header>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-8">
        <section className="flex flex-col gap-3">
          <ArtImage
            load={sceneArt(news.scene)}
            alt={copy.art.scenes[news.scene]}
            className="h-[280px] w-full rounded-[4px]"
          />
          <h2 className="mt-1 font-serif text-[38px] font-semibold leading-[1.12]">{news.title}</h2>
          <p className="font-serif text-[17px] leading-7 text-[#3A352C]">{news.lead.join(' ')}</p>
        </section>

        <section className="flex flex-col gap-2.5 border-l border-ink/15 pl-8">
          {sideEvent === undefined ? (
            <>
              <ArtImage
                load={sceneArt('market')}
                alt={copy.art.scenes.market}
                className="h-[220px] w-full rounded-[4px]"
              />
              <span className="text-xs font-semibold text-urgent">{copy.report.sideKicker}</span>
              <h3 className="font-serif text-[22px] font-semibold leading-tight">
                {copy.report.sideNone}
              </h3>
              <p className="font-serif text-[15px] leading-6 text-[#3A352C]">
                {copy.report.sideNoneBody}
              </p>
            </>
          ) : (
            <>
              <ArtImage
                load={eventArt(sideEvent.eventId)}
                alt={copy.art.event(eventTitle(sideEvent.eventId))}
                className="h-[220px] w-full rounded-[4px]"
              />
              <span className="text-xs font-semibold text-urgent">{copy.report.sideKicker}</span>
              <h3 className="font-serif text-[22px] font-semibold leading-tight">
                {eventTitle(sideEvent.eventId)}
              </h3>
              <p className="font-serif text-[15px] leading-6 text-[#3A352C]">
                {copy.report.sideChoice(choiceLabel(sideEvent.eventId, sideEvent.choiceId))}
              </p>
            </>
          )}
        </section>
      </div>

      <section
        aria-labelledby={`numbers-${report.turn}`}
        className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-8 border-t border-ink/25 pt-6"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between px-3 pb-2">
            <h3 id={`numbers-${report.turn}`} className="font-serif text-[22px] font-semibold">
              {copy.report.numbersTitle}
            </h3>
            <span className="text-xs text-ink-muted">{copy.report.numbersHint}</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1.4fr)_80px_80px_80px_24px] gap-3 px-3 text-xs text-ink-muted">
            <span>{copy.report.indicator}</span>
            <span className="text-right">{copy.report.before}</span>
            <span className="text-right">{copy.report.after}</span>
            <span className="text-right">{copy.report.change}</span>
            <span />
          </div>
          {INDICATOR_KEYS.map((key) => {
            const delta = report.indicatorDeltas[key];
            const expanded = open === key;
            const causes = report.topCauses[key];
            const panelId = `causes-${report.turn}-${key}`;
            return (
              <div key={key} className="border-b border-ink/10">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : key)}
                  className="grid min-h-11 w-full grid-cols-[minmax(0,1.4fr)_80px_80px_80px_24px] items-center gap-3 rounded-sm px-3 text-left text-sm text-ink transition-colors duration-150 hover:bg-paper-dark focus-visible:outline-[#7A5A0A]"
                >
                  <span>{INDICATOR_DOMAINS[key].shortLabel}</span>
                  <span className="numeric text-right text-ink-muted">
                    {displayIndicator(key, report.indicatorsBefore[key])}
                  </span>
                  <span className="numeric text-right font-medium">
                    {displayIndicator(key, report.indicatorsAfter[key])}
                  </span>
                  <span className={cn('text-right font-mono text-[13px]', deltaTone(key, delta))}>
                    {formatSignedIndicator(delta)}
                  </span>
                  <IconChevronRight
                    className={cn(
                      'h-4 w-4 text-ink-muted transition-transform duration-150',
                      expanded ? '-rotate-90' : 'rotate-90',
                    )}
                  />
                </button>
                {expanded && (
                  <div id={panelId} className="flex flex-col gap-1 px-3 pb-3 pt-1">
                    <span className="text-xs font-semibold text-ink-muted">
                      {copy.report.causes}
                    </span>
                    {causes.length === 0 ? (
                      <span className="text-[13px] text-[#3A352C]">{copy.report.noCause}</span>
                    ) : (
                      causes.map((cause) => (
                        <span
                          key={`${cause.reasonCode}-${cause.sourceId ?? ''}`}
                          className="text-[13px] leading-5 text-[#3A352C]"
                        >
                          <span className="font-mono text-xs">
                            {formatSignedIndicator(cause.deltaTenths)}
                          </span>{' '}
                          {reasonText(cause.reasonCode, cause.sourceId)}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 border-l border-ink/15 pl-8">
          <h3 className="font-serif text-[22px] font-semibold">{copy.report.treasuryTitle}</h3>
          <div className="flex items-baseline gap-3">
            <span className="numeric font-serif text-[40px]">
              {formatRupiahTriliun(report.treasuryAfterBillion)}
            </span>
            <span
              className={cn(
                'font-mono text-[13px]',
                report.treasuryDeltaBillion >= 0 ? 'text-[#17573A]' : 'text-stamp',
              )}
            >
              {formatSignedRupiahTriliun(report.treasuryDeltaBillion)}
            </span>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {treasuryCauses(report).map((cause) => (
              <li
                key={`${cause.reasonCode}-${cause.sourceId ?? ''}`}
                className="flex justify-between gap-3"
              >
                <span className="text-[#4A443A]">
                  {reasonText(cause.reasonCode, cause.sourceId)}
                </span>
                <span className="numeric shrink-0">{formatSignedRupiahTriliun(cause.delta)}</span>
              </li>
            ))}
          </ul>

          <div className="h-px bg-ink/15" />
          <h4 className="text-sm font-semibold">{copy.report.decisionsTitle}</h4>
          {report.policiesPassed.length === 0 && report.policiesFailed.length === 0 ? (
            <span className="text-sm text-[#4A443A]">{copy.report.noDecisions}</span>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {report.policiesPassed.map((policyId) => (
                <li key={policyId} className="flex justify-between gap-3">
                  <span>{policyName(policyId)}</span>
                  <span className="text-[#17573A]">{copy.report.passed}</span>
                </li>
              ))}
              {report.policiesFailed.map((policyId) => (
                <li key={policyId} className="flex justify-between gap-3">
                  <span>{policyName(policyId)}</span>
                  <span className="text-stamp">{copy.report.failed}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="h-px bg-ink/15" />
          <h4 className="text-sm font-semibold">{copy.report.nextTitle}</h4>
          {report.nextEventIds.length === 0 ? (
            <span className="text-sm text-[#4A443A]">{copy.report.noNextEvents}</span>
          ) : (
            report.nextEventIds.map((eventId) => (
              <span key={eventId} className="font-serif text-[17px]">
                {eventTitle(eventId)}
              </span>
            ))
          )}
          {footer}
          <span className="font-mono text-xs text-ink-muted">
            {copy.report.ledgerCount(formatInteger(report.ledger.length))}
          </span>
        </div>
      </section>
    </PaperSheet>
  );
}
