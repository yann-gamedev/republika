import {
  APP_VERSION,
  SAVE_FORMAT_VERSION,
  type GameDefinitions,
  type GameState,
  type Honorific,
  type PortraitHead,
  type RulesetMigrationMap,
  type SaveFile,
  type SaveHistory,
  type SaveSlotId,
  type SaveSlotInfo,
  type TurnReport,
} from '@republika/shared';
import {
  applyCommand,
  createCampaign,
  migrateRuleset,
  migrateSave,
  resolveTurn,
  type CommandErrorCode,
  type PlayerCommand,
} from '@republika/simulation';

import { copy } from '@/copy/id';
import type { SaveReadResult, SaveStorage } from '@/platform/SaveStorage';

import type { GameStore, Toast } from './gameStore';

export interface GameControllerDeps {
  readonly storage: SaveStorage;
  readonly definitions: GameDefinitions;
  readonly contentHash: string;
  readonly now: () => string;
  readonly createSeed: () => string;
  readonly createCommandId: () => string;
  readonly store: GameStore;
  /** Peta migrasi ruleset dari `packages/game-data/migrations/` (default: kosong). */
  readonly rulesetMaps?: readonly RulesetMigrationMap[];
  /** Jam monotonik (ms) untuk lama bermain; default dari `now()`. */
  readonly nowMs?: () => number;
  /** Log lokal (error dan durasi); opsional. */
  readonly log?: (level: 'info' | 'warn' | 'error', message: string) => void;
}

export interface OldSaveFile {
  readonly path: string;
  readonly appVersion: string | null;
  readonly fromFormat: number | null;
  readonly fromRuleset: number | null;
}

export interface MigrationOutcome {
  readonly path: string;
  readonly ok: boolean;
  readonly reason?: string;
  readonly targetSlot?: SaveSlotId;
  /** Ruleset baru bila kampanye dilanjutkan dengan aturan berbeda. */
  readonly continuedWithRuleset?: number;
  readonly backupPath: string;
}

/** Batas jeda yang dihitung sebagai waktu bermain (menghindari AFK berjam-jam). */
const MAX_PLAY_INTERVAL_MS = 30 * 60 * 1000;

export type ControllerResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code?: CommandErrorCode; readonly message: string };

export type ManualSlot = Exclude<SaveSlotId, 'autosave'>;

const MANUAL_SLOTS: readonly ManualSlot[] = ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5'];
const SLOT_IDS: readonly SaveSlotId[] = ['autosave', ...MANUAL_SLOTS];

function sanitize(value: string): string {
  return value.replace(/[^0-9A-Za-z.-]/gu, '-');
}

/** Metadata ringan dari teks save mentah, tanpa validasi penuh. */
function readMeta(text: string | null): Omit<OldSaveFile, 'path'> {
  try {
    const raw: unknown = text === null ? null : JSON.parse(text);
    if (typeof raw !== 'object' || raw === null) {
      return { appVersion: null, fromFormat: null, fromRuleset: null };
    }
    const record = raw as Record<string, unknown>;
    return {
      appVersion: typeof record.appVersion === 'string' ? record.appVersion : null,
      fromFormat: typeof record.saveFormatVersion === 'number' ? record.saveFormatVersion : null,
      fromRuleset: typeof record.rulesetVersion === 'number' ? record.rulesetVersion : null,
    };
  } catch {
    return { appVersion: null, fromFormat: null, fromRuleset: null };
  }
}

export type ContinueResult =
  | { readonly status: 'loaded' }
  | { readonly status: 'missing' }
  | { readonly status: 'corrupt'; readonly hasBackup: boolean }
  | { readonly status: 'incompatible'; readonly message: string };

/** Pesan Indonesia untuk kode error engine (teks UI hanya di `copy/id.ts`). */
export function commandErrorMessage(code: CommandErrorCode): string {
  return copy.commandErrors[code];
}

/**
 * Satu-satunya jalan untuk mengubah `GameState` (AGENT §4.3). Controller
 * memanggil engine murni, memperbarui store, lalu memicu autosave.
 * Tidak ada exception yang dilempar ke UI; semua hasil berupa nilai.
 */
export class GameController {
  private readonly deps: GameControllerDeps;
  private toastCounter = 0;
  private playTimeBase = 0;
  private playMark: number | null = null;

  constructor(deps: GameControllerDeps) {
    this.deps = deps;
  }

  get state(): GameState | null {
    return this.deps.store.getState().state;
  }

  newCommandId(): string {
    return this.deps.createCommandId();
  }

  async startCampaign(input: {
    presidentName: string;
    cabinetName: string;
    honorific?: Honorific;
    head?: PortraitHead;
    backgroundId?: string;
    promiseIds?: readonly string[];
  }): Promise<ControllerResult> {
    try {
      const { definitions } = this.deps;
      // Latar belakang diterapkan sekali di sini; ledgernya masuk history save.
      const { state, ledger } = createCampaign(definitions.scenario, definitions, {
        presidentName: input.presidentName,
        cabinetName: input.cabinetName,
        seed: this.deps.createSeed(),
        ...(input.honorific === undefined ? {} : { honorific: input.honorific }),
        ...(input.head === undefined ? {} : { head: input.head }),
        ...(input.backgroundId === undefined ? {} : { backgroundId: input.backgroundId }),
        ...(input.promiseIds === undefined ? {} : { promiseIds: input.promiseIds }),
      });
      this.playTimeBase = 0;
      this.playMark = this.nowMs();
      this.deps.store.setState({ state, lastReport: null, uiStatus: 'busy' });
      const saved = await this.autosave(state, { reports: [], ledger: [...ledger] });
      this.toast(
        saved ? 'success' : 'error',
        saved ? copy.controller.inaugurated(state.presidentName) : copy.controller.autosaveFailed,
      );
      return { ok: true };
    } catch {
      return this.fail(copy.controller.unexpected);
    }
  }

  /** Command pemain selain END_QUARTER. State tidak berubah bila ditolak. */
  dispatch(command: PlayerCommand): ControllerResult {
    const current = this.state;
    if (current === null) return this.fail(copy.controller.noCampaign);
    try {
      const result = applyCommand(current, command, this.deps.definitions);
      if (result.error !== undefined) {
        return this.fail(commandErrorMessage(result.error.code), result.error.code);
      }
      this.deps.store.setState({ state: result.state });
      return { ok: true };
    } catch {
      return this.fail(copy.controller.unexpected);
    }
  }

  async endQuarter(): Promise<ControllerResult> {
    const current = this.state;
    if (current === null) return this.fail(copy.controller.noCampaign);
    let resolved: ReturnType<typeof resolveTurn>;
    const started = performance.now();
    try {
      resolved = resolveTurn(
        current,
        { type: 'END_QUARTER', commandId: this.deps.createCommandId() },
        this.deps.definitions,
      );
    } catch (error) {
      this.deps.log?.('error', `resolve kuartal ${current.turn} gagal: ${String(error)}`);
      return this.fail(copy.controller.unexpected);
    }
    this.deps.log?.(
      'info',
      `resolve kuartal ${current.turn}: ${(performance.now() - started).toFixed(1)} ms`,
    );
    if (!resolved.ok) {
      return this.fail(commandErrorMessage(resolved.error.code), resolved.error.code);
    }
    this.deps.store.setState({
      state: resolved.state,
      lastReport: resolved.report,
      uiStatus: 'busy',
    });
    const history = await this.loadHistory();
    const saved = await this.autosave(resolved.state, {
      reports: [...history.reports, resolved.report],
      ledger: [],
    });
    if (!saved) {
      this.toast('error', copy.controller.autosaveFailed);
    } else if (resolved.state.status === 'completed') {
      this.toast('success', copy.controller.campaignCompleted);
    } else {
      this.toast('success', copy.controller.quarterClosed(resolved.report.turn));
    }
    return { ok: true };
  }

  /**
   * Memuat save yang sudah tervalidasi Zod ke store. Save dari ruleset lama
   * dilanjutkan dengan aturan baru (AGENT §5.13); ruleset lebih baru ditolak.
   */
  loadFromSave(file: SaveFile): ControllerResult {
    const migrated = migrateRuleset(file, this.deps.definitions, this.deps.rulesetMaps ?? []);
    if (!migrated.ok) {
      return this.fail(
        copy.controller.rulesetMismatch(
          migrated.version,
          this.deps.definitions.scenario.rulesetVersion,
        ),
      );
    }
    const save = migrated.save;
    const lastReport: TurnReport | null = save.history.reports.at(-1) ?? null;
    this.playTimeBase = save.playTimeSeconds;
    this.playMark = this.nowMs();
    this.deps.store.setState({ state: save.state, lastReport, uiStatus: 'idle' });
    if (migrated.migrated) this.toast('info', copy.migration.continuedWith(migrated.toRuleset));
    return { ok: true };
  }

  /** Save di `saves/` yang formatnya atau ruleset-nya lebih lama dari versi ini. */
  async findOldSaves(): Promise<readonly OldSaveFile[]> {
    let names: string[];
    try {
      names = await this.deps.storage.listSaveFiles();
    } catch {
      return [];
    }
    const found: OldSaveFile[] = [];
    for (const name of names) {
      if (name.endsWith('.bak.json')) continue;
      const path = `saves/${name}`;
      const meta = readMeta(await this.deps.storage.readFile(path));
      const oldFormat = meta.fromFormat !== null && meta.fromFormat < SAVE_FORMAT_VERSION;
      const oldRuleset =
        meta.fromRuleset !== null &&
        meta.fromRuleset < this.deps.definitions.scenario.rulesetVersion;
      if (oldFormat || oldRuleset) found.push({ path, ...meta });
    }
    return found;
  }

  /**
   * Migrasi file save (dari `saves/` atau `saves/imported/`). File asli SELALU
   * dicadangkan ke `saves/backup-v{versiLama}/` sebelum apa pun, termasuk bila
   * migrasi gagal. Save slot ditulis ulang di slot yang sama; save impor
   * ditaruh di slot manual kosong pertama.
   */
  async migrateSaveFiles(paths: readonly string[]): Promise<readonly MigrationOutcome[]> {
    const outcomes: MigrationOutcome[] = [];
    for (const path of paths) {
      const name = path.split('/').at(-1) ?? path;
      const text = await this.deps.storage.readFile(path);
      const meta = readMeta(text);
      const backupPath = `saves/backup-v${sanitize(meta.appVersion ?? 'lama')}/${name}`;
      if (text === null) {
        outcomes.push({ path, ok: false, reason: copy.migration.missing, backupPath });
        continue;
      }
      try {
        await this.deps.storage.writeFile(backupPath, text);
      } catch {
        outcomes.push({ path, ok: false, reason: copy.migration.backupFailed, backupPath });
        continue;
      }
      outcomes.push(await this.migrateOne(path, name, text, backupPath));
    }
    return outcomes;
  }

  private async migrateOne(
    path: string,
    name: string,
    text: string,
    backupPath: string,
  ): Promise<MigrationOutcome> {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return { path, ok: false, reason: copy.migration.notJson, backupPath };
    }
    const formatted = migrateSave(raw);
    if (!formatted.ok) {
      const { error } = formatted;
      const reason =
        error.code === 'NEWER_FORMAT'
          ? copy.migration.newerFormat(error.version)
          : error.code === 'NO_MIGRATOR'
            ? copy.migration.noMigrator(error.version)
            : copy.migration.invalid(error.detail);
      return { path, ok: false, reason, backupPath };
    }
    const ruleset = migrateRuleset(
      formatted.save,
      this.deps.definitions,
      this.deps.rulesetMaps ?? [],
    );
    if (!ruleset.ok) {
      return { path, ok: false, reason: copy.migration.newerRuleset(ruleset.version), backupPath };
    }
    const slotFromName = SLOT_IDS.find((slot) => name === `${slot}.json`);
    const targetSlot =
      path.startsWith('saves/imported/') || slotFromName === undefined
        ? await this.firstFreeManualSlot()
        : slotFromName;
    if (targetSlot === null) {
      return { path, ok: false, reason: copy.migration.noFreeSlot, backupPath };
    }
    try {
      await this.deps.storage.writeSave(targetSlot, ruleset.save);
    } catch {
      return { path, ok: false, reason: copy.saves.saveFailed, backupPath };
    }
    return {
      path,
      ok: true,
      targetSlot,
      backupPath,
      ...(ruleset.migrated ? { continuedWithRuleset: ruleset.toRuleset } : {}),
    };
  }

  private async firstFreeManualSlot(): Promise<ManualSlot | null> {
    const used = new Set((await this.listSlots()).map((info) => info.slot));
    return MANUAL_SLOTS.find((slot) => !used.has(slot)) ?? null;
  }

  private nowMs(): number {
    return this.deps.nowMs?.() ?? Date.parse(this.deps.now());
  }

  /** Menu Utama → Lanjutkan: muat autosave. */
  async continueCampaign(): Promise<ContinueResult> {
    return this.loadResult(await this.safeRead(() => this.deps.storage.readSave('autosave')));
  }

  /** Dialog "Save rusak" → pakai cadangan `autosave.bak.json`. */
  async continueFromBackup(): Promise<ContinueResult> {
    return this.loadResult(await this.safeRead(() => this.deps.storage.readBackup('autosave')));
  }

  /** History hanya dibaca dari save saat dibutuhkan (Riwayat, Laporan). */
  async loadHistory(): Promise<SaveHistory> {
    const result = await this.safeRead(() => this.deps.storage.readSave('autosave'));
    if (result.status !== 'ok') return { reports: [], ledger: [] };
    const current = this.state;
    // Abaikan history dari kampanye lain yang kebetulan ada di autosave.
    if (current !== null && result.save.state.seed !== current.seed)
      return { reports: [], ledger: [] };
    return result.save.history;
  }

  /** Ada keputusan kuartal ini yang belum tersimpan (autosave terjadi di akhir kuartal). */
  hasUnsavedChanges(): boolean {
    return (this.state?.commandIdsThisTurn.length ?? 0) > 0;
  }

  async listSlots(): Promise<readonly SaveSlotInfo[]> {
    try {
      return await this.deps.storage.listSlots();
    } catch {
      return [];
    }
  }

  /** Simpan kampanye berjalan ke slot manual (menimpa isi slot). */
  async saveToSlot(slot: ManualSlot, label?: string): Promise<ControllerResult> {
    const current = this.state;
    if (current === null) return this.fail(copy.controller.noCampaign);
    try {
      const history = await this.loadHistory();
      await this.deps.storage.writeSave(slot, this.buildSave(current, history, label));
      this.toast('success', copy.saves.savedTo(copy.saves.slotName(slot)));
      return { ok: true };
    } catch {
      return this.fail(copy.saves.saveFailed);
    }
  }

  /**
   * Muat slot dan lanjutkan dari titik itu. Isinya langsung disalin ke
   * autosave agar riwayat dan "Lanjutkan" mengikuti titik yang dimuat;
   * autosave sebelumnya menjadi `autosave.bak.json`. Slot lain tidak berubah.
   */
  async loadSlot(slot: SaveSlotId): Promise<ContinueResult> {
    const result = await this.safeRead(() => this.deps.storage.readSave(slot));
    if (result.status === 'missing') return { status: 'missing' };
    if (result.status === 'corrupt') return { status: 'corrupt', hasBackup: false };
    const loaded = this.loadFromSave(result.save);
    if (!loaded.ok) return { status: 'incompatible', message: loaded.message };
    if (slot !== 'autosave') {
      try {
        await this.deps.storage.writeSave('autosave', { ...result.save, savedAt: this.deps.now() });
      } catch {
        this.deps.store.setState({ uiStatus: 'saveFailed' });
      }
    }
    this.toast('success', copy.saves.loadedFrom(copy.saves.slotName(slot)));
    return { status: 'loaded' };
  }

  async renameSlot(slot: ManualSlot, label: string): Promise<ControllerResult> {
    const trimmed = label.trim();
    if (trimmed.length === 0 || trimmed.length > 80) return this.fail(copy.saves.labelInvalid);
    const result = await this.safeRead(() => this.deps.storage.readSave(slot));
    if (result.status !== 'ok') return this.fail(copy.saves.slotUnreadable);
    try {
      await this.deps.storage.writeSave(slot, { ...result.save, label: trimmed });
      return { ok: true };
    } catch {
      return this.fail(copy.saves.saveFailed);
    }
  }

  /** "Hapus" memindahkan file ke `saves/trash/`, bukan menghapus permanen. */
  async deleteSlot(slot: ManualSlot): Promise<ControllerResult> {
    try {
      await this.deps.storage.moveToTrash(slot, this.deps.now());
      this.toast('success', copy.saves.deleted(copy.saves.slotName(slot)));
      return { ok: true };
    } catch {
      return this.fail(copy.saves.deleteFailed);
    }
  }

  /** Umpan balik singkat untuk aksi yang berhasil. */
  notify(message: string, tone: Toast['tone'] = 'success'): void {
    this.toast(tone, message);
  }

  dismissToast(): void {
    this.deps.store.setState({ toast: null });
  }

  private async loadResult(result: SaveReadResult): Promise<ContinueResult> {
    if (result.status === 'missing') return { status: 'missing' };
    if (result.status === 'corrupt') {
      const backup = await this.safeRead(() => this.deps.storage.readBackup('autosave'));
      return { status: 'corrupt', hasBackup: backup.status === 'ok' };
    }
    const loaded = this.loadFromSave(result.save);
    return loaded.ok ? { status: 'loaded' } : { status: 'incompatible', message: loaded.message };
  }

  private async safeRead(read: () => Promise<SaveReadResult>): Promise<SaveReadResult> {
    try {
      return await read();
    } catch (error) {
      return {
        status: 'corrupt',
        reason: 'json',
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildSave(state: GameState, history: SaveHistory, label?: string): SaveFile {
    const now = this.nowMs();
    if (this.playMark !== null && Number.isFinite(now)) {
      const elapsed = Math.min(Math.max(0, now - this.playMark), MAX_PLAY_INTERVAL_MS);
      this.playTimeBase += Math.floor(elapsed / 1000);
    }
    this.playMark = now;
    return {
      saveFormatVersion: SAVE_FORMAT_VERSION,
      appVersion: APP_VERSION,
      rulesetVersion: state.rulesetVersion,
      contentHash: this.deps.contentHash,
      savedAt: this.deps.now(),
      label: label ?? copy.controller.saveLabel(state.presidentName, state.cabinetName, state.turn),
      playTimeSeconds: this.playTimeBase,
      state,
      history,
    };
  }

  private async autosave(state: GameState, history: SaveHistory): Promise<boolean> {
    const save = this.buildSave(state, history);
    try {
      await this.deps.storage.writeSave('autosave', save);
      this.deps.store.setState({ uiStatus: 'idle' });
      return true;
    } catch {
      this.deps.store.setState({ uiStatus: 'saveFailed' });
      return false;
    }
  }

  private toast(tone: Toast['tone'], message: string): void {
    this.toastCounter += 1;
    this.deps.store.setState({ toast: { id: this.toastCounter, tone, message } });
  }

  private fail(message: string, code?: CommandErrorCode): ControllerResult {
    this.toast('error', message);
    return code === undefined ? { ok: false, message } : { ok: false, code, message };
  }
}
