import { useState } from 'react';

import { PROVINCE_ACTIONS, type ProvinceAction } from '@republika/shared';
import { PROVINCE_RULES, provinceApCost, unrestFlag } from '@republika/simulation';

import { PREVIEW_COMMAND_ID, previewCommand, useGameState } from '@/app/useGame';
import { sceneArt } from '@/content/art';
import { definitions } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { formatIndicator, formatInteger, formatRupiahTriliun } from '@/format/formatters';
import { gameController } from '@/store/controller';
import { ArtImage } from '@/ui/ArtImage';
import { Button } from '@/ui/components/button';
import { cn } from '@/ui/lib/utils';

import {
  LEVEL_CLASS,
  SATISFACTION_LEVELS,
  satisfactionLevel,
  tileCode,
  type SatisfactionLevel,
} from './mapView';

const visitArt = sceneArt('map-visit');

function actionEffect(action: ProvinceAction): string {
  switch (action) {
    case 'VISIT':
      return copy.map.effectVisit(
        formatIndicator(PROVINCE_RULES.visit.localTenths),
        formatIndicator(PROVINCE_RULES.visit.approvalTenths),
      );
    case 'AID':
      return copy.map.effectAid(formatIndicator(PROVINCE_RULES.aid.localTenths));
    case 'HEAR':
      return copy.map.effectHear;
    case 'ENVOY':
      return copy.map.effectEnvoy(
        formatIndicator(PROVINCE_RULES.envoy.localTenths),
        formatInteger(Math.abs(PROVINCE_RULES.envoy.effectivenessDelta)),
      );
  }
}

function actionCost(action: ProvinceAction): string {
  if (action === 'AID') return formatRupiahTriliun(Math.abs(PROVINCE_RULES.aid.treasuryBillion));
  const ap = provinceApCost(action);
  return ap === 0 ? copy.map.free : copy.map.apCost(ap);
}

export default function MapPage() {
  const state = useGameState();
  const provinces = definitions.provinces.map((province) => {
    const satisfaction =
      state.provinces[province.id]?.satisfactionTenths ?? province.baseSatisfactionTenths;
    return {
      province,
      satisfaction,
      level: satisfactionLevel(satisfaction),
      unrest: state.flags.includes(unrestFlag(province.id)),
      actions: state.provinces[province.id]?.actionsThisTurn ?? [],
    };
  });
  const [selectedId, setSelectedId] = useState<string | null>(provinces[0]?.province.id ?? null);
  const [filter, setFilter] = useState<SatisfactionLevel | null>(null);
  const selected = provinces.find((item) => item.province.id === selectedId) ?? provinces[0];

  const average =
    provinces.length === 0
      ? 0
      : provinces.reduce((sum, item) => sum + item.satisfaction, 0) / provinces.length;
  const high = provinces.filter((item) => item.satisfaction >= 700).length;
  const low = provinces.filter((item) => item.satisfaction < 400).length;

  const run = (provinceId: string, action: ProvinceAction) => {
    const result = gameController.dispatch({
      type: 'PROVINCE_ACTION',
      commandId: gameController.newCommandId(),
      provinceId,
      action,
    });
    if (result.ok) {
      const name = definitions.provinces.find((item) => item.id === provinceId)?.name ?? provinceId;
      gameController.notify(copy.map.queued(copy.map.actions[action], name));
    }
  };

  const cancel = (provinceId: string, action: ProvinceAction) => {
    const pending = state.pendingCommands.find(
      (command) =>
        command.type === 'PROVINCE_ACTION' &&
        command.provinceId === provinceId &&
        command.action === action,
    );
    if (pending === undefined) return;
    const result = gameController.dispatch({
      type: 'CANCEL_PENDING',
      commandId: gameController.newCommandId(),
      pendingCommandId: pending.commandId,
    });
    if (result.ok) gameController.notify(copy.dashboard.cancelled);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] font-normal leading-tight">{copy.map.title}</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {copy.map.subtitle(provinces.length)}
          </p>
        </div>
        <dl className="flex gap-8">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{copy.map.average}</dt>
            <dd className="numeric text-[22px]">{formatIndicator(Math.round(average))}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{copy.map.satisfied}</dt>
            <dd className="numeric text-[22px]">{formatInteger(high)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{copy.map.vulnerable}</dt>
            <dd className="numeric text-[22px] text-negative">{formatInteger(low)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6">
        <section
          aria-labelledby="map-title"
          className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-6"
        >
          <h2 id="map-title" className="sr-only">
            {copy.map.mapTitle}
          </h2>
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[700px] gap-1.5"
              style={{
                gridTemplateColumns: 'repeat(17, minmax(38px, 1fr))',
                gridTemplateRows: 'repeat(7, 52px)',
              }}
            >
              {provinces.map((item) => {
                const dimmed = filter !== null && item.level !== filter;
                return (
                  <button
                    key={item.province.id}
                    type="button"
                    data-testid={`tile-${item.province.id}`}
                    aria-pressed={item.province.id === selected?.province.id}
                    onClick={() => setSelectedId(item.province.id)}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-0.5 rounded-md text-[9px] font-medium leading-none transition-[opacity,box-shadow] duration-150',
                      LEVEL_CLASS[item.level],
                      dimmed && 'opacity-30',
                      item.province.id === selected?.province.id &&
                        'shadow-[0_0_0_2px_hsl(var(--foreground))]',
                    )}
                    style={{ gridColumn: item.province.col, gridRow: item.province.row }}
                  >
                    <span aria-hidden="true">{tileCode(item.province.id)}</span>
                    <span aria-hidden="true" className="font-mono text-[11px]">
                      {formatIndicator(item.satisfaction)}
                    </span>
                    <span className="sr-only" data-testid="tile-label">
                      {copy.map.tileLabel(
                        item.province.name,
                        formatIndicator(item.satisfaction),
                        item.unrest,
                      )}
                    </span>
                    {item.unrest && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card bg-negative"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-2 text-[13px] text-muted-foreground">{copy.map.legend}</span>
            {SATISFACTION_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={filter === level}
                onClick={() => setFilter(filter === level ? null : level)}
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs transition-colors',
                  filter === level
                    ? 'bg-raised-hover text-foreground'
                    : 'text-text-secondary hover:bg-raised',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('h-3.5 w-3.5 rounded-[4px]', LEVEL_CLASS[level])}
                />
                {copy.map.levels[level]}
              </button>
            ))}
            <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-muted-foreground">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-negative" />
              {copy.map.unrestLegend}
            </span>
          </div>
        </section>

        {selected !== undefined && (
          <aside
            aria-labelledby="province-title"
            data-testid="province-panel"
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
          >
            <ArtImage
              load={visitArt}
              alt={copy.art.scenes['map-visit']}
              className="h-[140px] w-full"
            />
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{selected.province.region}</span>
                  <h2 id="province-title" className="font-serif text-2xl font-normal leading-tight">
                    {selected.province.name}
                  </h2>
                </div>
                <span className="numeric font-serif text-4xl leading-none">
                  {formatIndicator(selected.satisfaction)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-2 rounded bg-raised-hover">
                  <div
                    className={cn('h-2 rounded', LEVEL_CLASS[selected.level])}
                    style={{ width: `${selected.satisfaction / 10}%` }}
                  />
                </div>
                <span className="text-[13px] text-text-secondary">
                  {copy.map.levels[selected.level]}
                  {selected.unrest && ` · ${copy.map.unrestLegend}`}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-[10px] bg-raised p-3">
                <span className="text-xs text-muted-foreground">{copy.map.issue}</span>
                <span className="text-sm leading-5">{selected.province.issue}</span>
              </div>
              <div className="flex flex-col gap-2">
                {PROVINCE_ACTIONS.map((action) => {
                  const queued = selected.actions.includes(action);
                  const blocked = queued
                    ? null
                    : previewCommand(state, {
                        type: 'PROVINCE_ACTION',
                        commandId: PREVIEW_COMMAND_ID,
                        provinceId: selected.province.id,
                        action,
                      });
                  return (
                    <div
                      key={action}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[10px] border border-border px-3 py-2.5"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{copy.map.actions[action]}</span>
                        <span className="text-xs text-muted-foreground">
                          {queued
                            ? copy.map.queuedNote
                            : blocked !== null
                              ? copy.commandErrors[blocked]
                              : actionEffect(action)}
                        </span>
                      </span>
                      {queued ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancel(selected.province.id, action)}
                        >
                          {copy.map.cancel}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={blocked !== null}
                          aria-label={`${copy.map.actions[action]} · ${actionCost(action)}`}
                          onClick={() => run(selected.province.id, action)}
                        >
                          {actionCost(action)}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
