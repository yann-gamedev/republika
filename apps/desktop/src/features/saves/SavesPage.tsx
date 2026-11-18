import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { SaveSlotId, SaveSlotInfo } from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { copy } from '@/copy/id';
import { formatIndicator } from '@/format/formatters';
import { isTauriRuntime, openSavesFolder } from '@/platform';
import { gameController } from '@/store/controller';
import type { ManualSlot } from '@/store/gameController';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { MigrationResult, importAndMigrate } from '@/features/migration/PreviousVersionFlow';
import type { MigrationOutcome } from '@/store/gameController';
import { ConfirmDialog } from '@/ui/components/dialog';
import { Input } from '@/ui/components/input';
import { IconFolder } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';

const ALL_SLOTS: readonly SaveSlotId[] = [
  'autosave',
  'slot-1',
  'slot-2',
  'slot-3',
  'slot-4',
  'slot-5',
];

const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

type Pending =
  | { readonly kind: 'overwrite'; readonly slot: ManualSlot }
  | { readonly kind: 'load'; readonly slot: SaveSlotId }
  | { readonly kind: 'delete'; readonly slot: ManualSlot };

export default function SavesPage() {
  const navigate = useNavigate();
  const state = useGameStore((store) => store.state);
  const toast = useGameStore((store) => store.toast);
  const [slots, setSlots] = useState<readonly SaveSlotInfo[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [renaming, setRenaming] = useState<{ slot: ManualSlot; label: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imported, setImported] = useState<readonly MigrationOutcome[] | null>(null);

  const refresh = useCallback(() => {
    void gameController.listSlots().then(setSlots);
  }, []);
  useEffect(refresh, [refresh]);

  const infoFor = (slot: SaveSlotId) => slots?.find((item) => item.slot === slot);

  const doSave = async (slot: ManualSlot) => {
    await gameController.saveToSlot(slot);
    refresh();
  };
  const doLoad = async (slot: SaveSlotId) => {
    const result = await gameController.loadSlot(slot);
    if (result.status === 'loaded') navigate('/game/dashboard');
    else if (result.status === 'incompatible') setNotice(result.message);
    else setNotice(copy.saves.slotUnreadable);
  };
  const doDelete = async (slot: ManualSlot) => {
    await gameController.deleteSlot(slot);
    refresh();
  };

  const confirm = useCallback(() => {
    const current = pending;
    setPending(null);
    if (current === null) return;
    if (current.kind === 'overwrite') void doSave(current.slot);
    else if (current.kind === 'load') void doLoad(current.slot);
    else void doDelete(current.slot);
  }, [pending]);
  const cancel = useCallback(() => setPending(null), []);

  const requestSave = (slot: ManualSlot) => {
    if (infoFor(slot) !== undefined) setPending({ kind: 'overwrite', slot });
    else void doSave(slot);
  };
  const requestLoad = (slot: SaveSlotId) => {
    if (gameController.hasUnsavedChanges()) setPending({ kind: 'load', slot });
    else void doLoad(slot);
  };
  const submitRename = async () => {
    if (renaming === null) return;
    const result = await gameController.renameSlot(renaming.slot, renaming.label);
    if (result.ok) {
      setRenaming(null);
      refresh();
    }
  };
  const openFolder = () => {
    void openSavesFolder()
      .then((opened) => {
        if (!opened) setNotice(copy.saves.openFolderUnavailable);
      })
      .catch(() => setNotice(copy.saves.openFolderUnavailable));
  };

  const importPrevious = () => {
    if (!isTauriRuntime()) {
      setNotice(copy.migration.importUnavailable);
      return;
    }
    void importAndMigrate()
      .then((outcomes) => {
        if (outcomes !== null) setImported(outcomes);
        refresh();
      })
      .catch(() => setNotice(copy.migration.importUnavailable));
  };
  const closeImported = useCallback(() => setImported(null), []);

  const slotLabel = (slot: SaveSlotId) => copy.saves.slotName(slot);
  const dialogTitle =
    pending?.kind === 'overwrite'
      ? copy.saves.confirmOverwriteTitle
      : pending?.kind === 'load'
        ? copy.saves.confirmLoadTitle
        : copy.saves.confirmDeleteTitle;
  const dialogBody =
    pending === null
      ? ''
      : pending.kind === 'overwrite'
        ? copy.saves.confirmOverwriteBody(slotLabel(pending.slot))
        : pending.kind === 'load'
          ? copy.saves.confirmLoadBody
          : copy.saves.confirmDeleteBody(slotLabel(pending.slot));

  return (
    <main className="min-h-screen px-10 py-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-5">
          <Link
            to={state === null ? '/' : '/game/dashboard'}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {state === null ? copy.game.menu : copy.saves.back}
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={importPrevious}>
              {copy.migration.importFromPrevious}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={openFolder}
              title={isTauriRuntime() ? undefined : copy.saves.openFolderUnavailable}
            >
              <IconFolder className="h-3.5 w-3.5" />
              {copy.saves.openFolder}
            </Button>
          </div>
        </div>

        <div className="pt-8">
          <PageHeader
            kicker={copy.saves.kicker}
            title={copy.saves.title}
            subtitle={copy.saves.subtitle}
          />
        </div>

        {(notice !== null || state === null) && (
          <p
            role="status"
            className="mb-4 border border-border/60 bg-card/30 px-4 py-3 text-sm text-muted-foreground"
          >
            {notice ?? copy.saves.noCampaign}
          </p>
        )}

        {slots === null ? (
          <div aria-busy="true" className="space-y-3">
            {ALL_SLOTS.map((slot) => (
              <div
                key={slot}
                className="h-24 animate-pulse bg-secondary/25 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : (
          <ol className="space-y-3">
            {ALL_SLOTS.map((slot) => {
              const info = infoFor(slot);
              const manual = slot === 'autosave' ? null : (slot as ManualSlot);
              const isRenaming = renaming !== null && renaming.slot === slot;
              return (
                <li
                  key={slot}
                  data-testid={`save-${slot}`}
                  className={cn(
                    'grid gap-4 border px-5 py-4 md:grid-cols-[150px_minmax(0,1fr)_auto]',
                    info?.isCorrupt === true
                      ? 'border-maroon/60 bg-maroon/10'
                      : 'border-border/60 bg-card/30',
                  )}
                >
                  <div>
                    <p className="font-serif text-lg">{slotLabel(slot)}</p>
                    {info?.hasBackup === true && (
                      <Badge variant="outline" className="mt-1">
                        .bak
                      </Badge>
                    )}
                  </div>

                  <div className="min-w-0">
                    {info === undefined ? (
                      <p className="text-sm text-muted-foreground">{copy.saves.empty}</p>
                    ) : info.isCorrupt ? (
                      <p className="text-sm text-red-200">{copy.saves.corrupt}</p>
                    ) : isRenaming ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submitRename();
                        }}
                      >
                        <Input
                          autoFocus
                          aria-label={copy.saves.labelField(slotLabel(slot))}
                          value={renaming.label}
                          maxLength={80}
                          onChange={(event) =>
                            setRenaming({ slot: renaming.slot, label: event.target.value })
                          }
                        />
                        <Button size="sm" type="submit">
                          {copy.saves.renameSave}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => setRenaming(null)}
                        >
                          {copy.common.cancel}
                        </Button>
                      </form>
                    ) : (
                      <>
                        <p className="truncate text-sm">{info.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {info.savedAt !== undefined &&
                            copy.saves.savedAt(dateFormatter.format(new Date(info.savedAt)))}
                          {info.appVersion !== undefined &&
                            ` · ${copy.saves.version(info.appVersion)}`}
                          {info.turn !== undefined &&
                            info.maxTurns !== undefined &&
                            ` · ${info.completed === true ? copy.saves.completed : copy.saves.quarter(info.turn, info.maxTurns)}`}
                        </p>
                        {info.summary !== undefined && (
                          <p className="numeric mt-1 text-xs text-muted-foreground">
                            {copy.dashboard.approval} {formatIndicator(info.summary.approval)} ·
                            Fiskal {formatIndicator(info.summary.fiscalHealth)} ·{' '}
                            {copy.dashboard.trust} {formatIndicator(info.summary.trust)}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {manual !== null && state !== null && (
                      <Button size="sm" onClick={() => requestSave(manual)}>
                        {copy.saves.save}
                      </Button>
                    )}
                    {info !== undefined && !info.isCorrupt && (
                      <Button size="sm" variant="outline" onClick={() => requestLoad(slot)}>
                        {copy.saves.load}
                      </Button>
                    )}
                    {manual !== null && info !== undefined && !info.isCorrupt && !isRenaming && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRenaming({ slot: manual, label: info.label ?? '' })}
                      >
                        {copy.saves.rename}
                      </Button>
                    )}
                    {manual !== null && info !== undefined && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPending({ kind: 'delete', slot: manual })}
                      >
                        {copy.saves.delete}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <ConfirmDialog
        open={imported !== null}
        title={copy.migration.resultTitle}
        confirmLabel={copy.common.close}
        onConfirm={closeImported}
        onCancel={closeImported}
      >
        {imported !== null && <MigrationResult outcomes={imported} />}
      </ConfirmDialog>

      <ConfirmDialog
        open={pending !== null}
        title={dialogTitle}
        confirmLabel={
          pending?.kind === 'delete'
            ? copy.saves.delete
            : pending?.kind === 'load'
              ? copy.saves.load
              : copy.saves.save
        }
        cancelLabel={copy.common.cancel}
        onConfirm={confirm}
        onCancel={cancel}
      >
        {dialogBody}
      </ConfirmDialog>

      {toast !== null && (
        <p
          role="status"
          className="fixed bottom-6 right-6 z-50 max-w-sm border border-primary/40 bg-card/95 p-4 text-sm shadow-document"
        >
          {toast.message}
        </p>
      )}
    </main>
  );
}
