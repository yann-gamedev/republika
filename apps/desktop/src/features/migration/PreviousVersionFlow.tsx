import { useCallback, useEffect, useState } from 'react';

import { APP_VERSION } from '@republika/shared';

import { copy } from '@/copy/id';
import { importSaveFile, isTauriRuntime } from '@/platform';
import { gameController } from '@/store/controller';
import type { MigrationOutcome, OldSaveFile } from '@/store/gameController';
import { useAppStore } from '@/store/useAppStore';
import { ConfirmDialog } from '@/ui/components/dialog';

type Step =
  | { readonly kind: 'idle' }
  | { readonly kind: 'offer'; readonly files: readonly OldSaveFile[] }
  | { readonly kind: 'ask' }
  | { readonly kind: 'busy' }
  | { readonly kind: 'result'; readonly outcomes: readonly MigrationOutcome[] };

/** Pemeriksaan hanya sekali per sesi aplikasi, bukan tiap kali menu dibuka. */
let checkedThisSession = false;

/**
 * Impor save lama lewat pemilih file (desktop), lalu migrasi. `null` bila batal
 * atau tidak di desktop.
 */
export async function importAndMigrate(): Promise<readonly MigrationOutcome[] | null> {
  const path = await importSaveFile();
  if (path === null) return null;
  return gameController.migrateSaveFiles([path]);
}

export function MigrationResult({ outcomes }: { outcomes: readonly MigrationOutcome[] }) {
  const ok = outcomes.filter((item) => item.ok).length;
  return (
    <div className="space-y-3" data-testid="migration-result">
      <p>{copy.migration.resultSummary(ok, outcomes.length - ok)}</p>
      <ul className="space-y-2 text-xs">
        {outcomes.map((item) => {
          const file = item.path.split('/').at(-1) ?? item.path;
          return (
            <li key={item.path} className="border-l border-border pl-3">
              <p className={item.ok ? 'text-foreground' : 'text-red-200'}>
                {item.ok
                  ? copy.migration.resultOk(
                      file,
                      copy.saves.slotName(item.targetSlot ?? 'autosave'),
                    )
                  : copy.migration.resultFailed(file, item.reason ?? '')}
              </p>
              {item.continuedWithRuleset !== undefined && (
                <p className="text-muted-foreground">
                  {copy.migration.continuedWith(item.continuedWithRuleset)}
                </p>
              )}
              <p className="text-muted-foreground">
                {copy.migration.resultBackup(item.backupPath)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Alur AGENT §5.13 saat aplikasi dibuka (dipasang di Menu Utama). */
export function PreviousVersionFlow() {
  const initialized = useAppStore((store) => store.initialized);
  const settings = useAppStore((store) => store.settings);
  const updateSettings = useAppStore((store) => store.updateSettings);
  const [step, setStep] = useState<Step>({ kind: 'idle' });

  useEffect(() => {
    if (!initialized || checkedThisSession) return;
    checkedThisSession = true;
    void gameController.findOldSaves().then((files) => {
      if (files.length > 0) setStep({ kind: 'offer', files });
      else if (isTauriRuntime() && !settings.askedAboutPreviousVersion) setStep({ kind: 'ask' });
      if (settings.lastRunAppVersion !== APP_VERSION)
        updateSettings({ lastRunAppVersion: APP_VERSION });
    });
  }, [initialized, settings.askedAboutPreviousVersion, settings.lastRunAppVersion, updateSettings]);

  const close = useCallback(() => setStep({ kind: 'idle' }), []);
  const migrateOffered = useCallback(() => {
    if (step.kind !== 'offer') return;
    const paths = step.files.map((file) => file.path);
    setStep({ kind: 'busy' });
    void gameController
      .migrateSaveFiles(paths)
      .then((outcomes) => setStep({ kind: 'result', outcomes }));
  }, [step]);
  const answerYes = useCallback(() => {
    updateSettings({ askedAboutPreviousVersion: true });
    setStep({ kind: 'busy' });
    void importAndMigrate()
      .then((outcomes) =>
        setStep(outcomes === null ? { kind: 'idle' } : { kind: 'result', outcomes }),
      )
      .catch(() => setStep({ kind: 'idle' }));
  }, [updateSettings]);
  const answerNo = useCallback(() => {
    updateSettings({ askedAboutPreviousVersion: true });
    setStep({ kind: 'idle' });
  }, [updateSettings]);

  return (
    <>
      <ConfirmDialog
        open={step.kind === 'offer'}
        title={copy.migration.updateTitle}
        confirmLabel={copy.migration.update}
        cancelLabel={copy.migration.later}
        onConfirm={migrateOffered}
        onCancel={close}
      >
        {step.kind === 'offer' && (
          <>
            <p>{copy.migration.updateBody(step.files.length)}</p>
            <ul className="mt-2 list-inside list-disc text-xs">
              {step.files.map((file) => (
                <li key={file.path}>
                  {file.path.split('/').at(-1)}
                  {file.appVersion !== null && ` · ${copy.saves.version(file.appVersion)}`}
                </li>
              ))}
            </ul>
          </>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={step.kind === 'ask'}
        title={copy.migration.askTitle}
        confirmLabel={copy.migration.askYes}
        cancelLabel={copy.migration.askNo}
        onConfirm={answerYes}
        onCancel={answerNo}
      >
        {copy.migration.askBody}
      </ConfirmDialog>
      <ConfirmDialog
        open={step.kind === 'result'}
        title={copy.migration.resultTitle}
        confirmLabel={copy.common.close}
        onConfirm={close}
        onCancel={close}
      >
        {step.kind === 'result' && <MigrationResult outcomes={step.outcomes} />}
      </ConfirmDialog>
    </>
  );
}
