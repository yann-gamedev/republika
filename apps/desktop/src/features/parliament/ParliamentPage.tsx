import { POLICY_CATEGORIES } from '@republika/shared';
import { predictVote } from '@republika/simulation';

import { PageHeader } from '@/app/PageHeader';
import { PREVIEW_COMMAND_ID, previewCommand, useGameState } from '@/app/useGame';
import { definitions, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import {
  formatIndicator,
  formatInteger,
  formatRupiahTriliun,
  formatSignedIndicator,
} from '@/format/formatters';
import { gameController } from '@/store/controller';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Progress } from '@/ui/components/progress';
import { Hemicycle } from '@/ui/charts/Hemicycle';
import { IconCoins, IconVote } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';

const COALITION_SUPPORT = 500;

/** Tren dukungan kuartal lalu: ikon + teks, tidak hanya warna. */
function TrendText({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  return (
    <span className={cn('ml-1.5 text-xs', delta > 0 ? 'text-emerald-300/85' : 'text-red-300/85')}>
      {delta > 0 ? '↑' : '↓'} {formatSignedIndicator(delta)}
      <span className="sr-only"> {copy.parliament.trendNote}</span>
    </span>
  );
}

export default function ParliamentPage() {
  const state = useGameState();
  const lastReport = useGameStore((store) => store.lastReport);
  const trendOf = (factionId: string): number | null => {
    const item = lastReport?.factionSupport.find((entry) => entry.factionId === factionId);
    return item === undefined ? null : item.afterTenths - item.beforeTenths;
  };

  // Tampilan diurutkan dari kursi terbanyak; urutan engine tetap per ID.
  const factionsBySeats = [...definitions.factions].sort(
    (left, right) => right.seats - left.seats || left.id.localeCompare(right.id),
  );
  const factions = factionsBySeats.map((faction) => {
    const factionState = state.factions.find((item) => item.factionId === faction.id);
    return {
      faction,
      supportTenths: factionState?.supportTenths ?? faction.initialSupportTenths,
    };
  });

  const coalitionSeats = factions.reduce(
    (total, item) => (item.supportTenths >= COALITION_SUPPORT ? total + item.faction.seats : total),
    0,
  );
  const totalSeats = factions.reduce((total, item) => total + item.faction.seats, 0);
  const lobbyCost = formatRupiahTriliun(definitions.scenario.lobbyCostBillion);
  const lobbyBonus = formatIndicator(definitions.scenario.lobbySupportBonusTenths);

  // Bonus lobi yang sudah diantrekan ikut dihitung dalam perkiraan voting.
  const lobbyBonuses = Object.fromEntries(
    state.pendingCommands.flatMap((command) =>
      command.type === 'LOBBY_FACTION'
        ? [[command.factionId, definitions.scenario.lobbySupportBonusTenths] as const]
        : [],
    ),
  );
  const lobbiedIds = new Set(Object.keys(lobbyBonuses));
  const queuedVotes = state.pendingCommands.flatMap((command) => {
    if (command.type !== 'ENACT_POLICY') return [];
    const policy = definitions.policies.find((item) => item.id === command.policyId);
    return policy?.needsVote === true
      ? [predictVote(state, command.policyId, definitions, lobbyBonuses)]
      : [];
  });

  const lobby = (factionId: string, name: string) => {
    const result = gameController.dispatch({
      type: 'LOBBY_FACTION',
      commandId: gameController.newCommandId(),
      factionId,
    });
    if (result.ok) gameController.notify(copy.parliament.lobbied(name));
  };

  return (
    <>
      <PageHeader
        kicker={copy.parliament.kicker}
        title={copy.parliament.title}
        subtitle={copy.parliament.subtitle}
        actions={<Badge variant="outline">{copy.parliament.thresholdValue}</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <p className="institutional-label">{copy.parliament.totalSeats}</p>
            <CardTitle className="mt-2">{copy.parliament.hemicycleAria}</CardTitle>
          </CardHeader>
          <CardContent>
            <Hemicycle
              ariaLabel={copy.parliament.hemicycleAria}
              centerValue={formatInteger(totalSeats)}
              centerLabel={copy.common.seats}
              groups={factionsBySeats.map((faction) => ({
                id: faction.id,
                label: faction.name,
                seats: faction.seats,
                color: faction.color,
              }))}
            />
            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="text-xs text-muted-foreground">{copy.parliament.coalition}</p>
                <p className="numeric mt-1 text-sm">
                  {copy.parliament.coalitionSeats(coalitionSeats)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{copy.parliament.opposition}</p>
                <p className="numeric mt-1 text-sm">
                  {copy.parliament.oppositionSeats(totalSeats - coalitionSeats)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{copy.parliament.threshold}</p>
                <p className="numeric mt-1 text-sm">{copy.parliament.thresholdValue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="institutional-label">{copy.parliament.support}</p>
            <CardTitle className="mt-2">{copy.parliament.totalSeats}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {factions.map((item) => (
              <div key={item.faction.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2"
                      style={{ backgroundColor: item.faction.color }}
                    />
                    {item.faction.shortName}
                  </span>
                  <span className="numeric text-xs">{formatIndicator(item.supportTenths)}</span>
                </div>
                <Progress
                  className="mt-1.5"
                  value={item.supportTenths / 10}
                  aria-label={copy.parliament.supportBar(item.faction.name)}
                />
              </div>
            ))}
            <p className="border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
              {copy.parliament.coalitionNote}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5" data-testid="vote-preview">
        <CardHeader>
          <p className="institutional-label">{copy.parliament.threshold}</p>
          <CardTitle className="mt-2">{copy.parliament.votePreviewTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queuedVotes.length === 0 && (
            <p className="text-sm text-muted-foreground">{copy.parliament.votePreviewEmpty}</p>
          )}
          {queuedVotes.map((vote) => (
            <div
              key={vote.policyId}
              className="border-t border-border/40 pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm">{policyName(vote.policyId)}</p>
                <Badge variant={vote.passed ? 'success' : 'destructive'}>
                  {copy.parliament.votePreviewRow(vote.yesSeats)}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {vote.byFaction.map((item) => {
                  const faction = definitions.factions.find((f) => f.id === item.factionId);
                  return (
                    <span
                      key={item.factionId}
                      className={cn(
                        'border px-1.5 py-0.5 text-xs',
                        item.vote === 'FOR'
                          ? 'border-emerald-800/50 text-emerald-300/85'
                          : 'border-maroon/50 text-red-300/80',
                      )}
                    >
                      {faction?.shortName ?? item.factionId} ·{' '}
                      {copy.parliament.scoreLabel(formatIndicator(item.scoreTenths))}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-serif text-xl leading-none">{copy.parliament.kicker}</h2>
          <span className="text-xs text-muted-foreground">
            {copy.parliament.lobbyCost(lobbyCost)} · {copy.parliament.lobbyBonus(lobbyBonus)}
          </span>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {factions.map(({ faction, supportTenths }) => {
            const lobbied = lobbiedIds.has(faction.id) || state.lobbyThisTurn.includes(faction.id);
            const blockedCode = previewCommand(state, {
              type: 'LOBBY_FACTION',
              commandId: PREVIEW_COMMAND_ID,
              factionId: faction.id,
            });
            const inCoalition = supportTenths >= COALITION_SUPPORT;
            const chair = faction.leadership.find((item) => item.role === 'CHAIR');
            return (
              <article
                key={faction.id}
                className={cn(
                  'border border-border/60 bg-card/35 p-5 transition-colors',
                  inCoalition
                    ? 'border-emerald-800/35 bg-emerald-950/10'
                    : 'hover:border-primary/30 hover:bg-card/55',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="inline-block h-3 w-3 shrink-0"
                        style={{ backgroundColor: faction.color }}
                      />
                      <h3 className="truncate font-serif text-lg leading-tight">{faction.name}</h3>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1" aria-label={copy.parliament.ideology}>
                      {faction.ideologyTags.map((tag) => (
                        <li
                          key={tag}
                          className="border border-border/60 px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          #{tag}
                        </li>
                      ))}
                    </ul>
                    {chair !== undefined && (
                      <p className="mt-2 text-xs text-foreground/85">
                        {copy.parliament.chairLine(chair.name)}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {faction.description}
                    </p>
                    {(faction.leadership.length > 0 || faction.members.length > 0) && (
                      <details className="group mt-2 text-xs">
                        <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
                          {copy.parliament.rosterToggle}
                        </summary>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          {faction.leadership.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {copy.parliament.rosterLeadership}
                              </p>
                              <dl className="mt-1 space-y-0.5">
                                {faction.leadership.map((item) => (
                                  <div key={item.role} className="flex gap-1.5">
                                    <dt className="text-muted-foreground">
                                      {copy.parliament.roles[item.role]}:
                                    </dt>
                                    <dd>{item.name}</dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          )}
                          {faction.members.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {copy.parliament.rosterMembers}
                              </p>
                              <ul className="mt-1 space-y-0.5">
                                {faction.members.map((name) => (
                                  <li key={name}>{name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                  <Badge variant={inCoalition ? 'success' : 'outline'}>
                    {inCoalition ? copy.parliament.coalition : copy.parliament.opposition}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-y border-border/40 py-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{copy.parliament.seats}</p>
                    <p className="numeric mt-0.5 text-sm">
                      {copy.parliament.seatShare(faction.seats)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{copy.parliament.support}</p>
                    <p className="numeric mt-0.5 text-sm">
                      {formatIndicator(supportTenths)}
                      <TrendText delta={trendOf(faction.id)} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{copy.parliament.lobby}</p>
                    <p className="numeric mt-0.5 text-sm">
                      {lobbied ? copy.parliament.lobbyPending : copy.common.available}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {copy.parliament.preferences} · {copy.parliament.preferenceScale}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {POLICY_CATEGORIES.map((category) => {
                        const value = faction.policyPreferences[category];
                        return (
                          <span
                            key={category}
                            className={cn(
                              'border px-1.5 py-0.5 text-xs',
                              value > 0
                                ? 'border-emerald-800/50 text-emerald-300/85'
                                : value < 0
                                  ? 'border-maroon/50 text-red-300/80'
                                  : 'border-border/60 text-muted-foreground',
                            )}
                          >
                            <span aria-hidden="true">
                              {value > 0 ? '▲ ' : value < 0 ? '▼ ' : '• '}
                            </span>
                            {copy.policies.categoryLabels[category]} {value > 0 ? '+' : ''}
                            {formatInteger(value)}
                            <span className="sr-only">
                              {' '}
                              {value > 0
                                ? copy.parliament.likes
                                : value < 0
                                  ? copy.parliament.dislikes
                                  : copy.parliament.neutralPref}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={blockedCode !== null ? 'outline' : 'default'}
                    disabled={blockedCode !== null}
                    title={blockedCode !== null ? copy.commandErrors[blockedCode] : undefined}
                    onClick={() => lobby(faction.id, faction.name)}
                  >
                    <IconVote className="h-3.5 w-3.5" />
                    {lobbied ? copy.parliament.lobbyDone : copy.parliament.lobby}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-border/50 bg-card/25 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <IconCoins className="h-4 w-4 text-primary/70" />
          {copy.parliament.lobbyCost(lobbyCost)} · {copy.parliament.lobbyBonus(lobbyBonus)}
        </span>
        <span>{copy.parliament.thresholdNote}</span>
      </div>
    </>
  );
}
