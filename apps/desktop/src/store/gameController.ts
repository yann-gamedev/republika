import {
  APP_VERSION,
  SAVE_FORMAT_VERSION,
  type GameDefinitions,
  type GameState,
  type SaveFile,
  type SaveHistory,
  type SaveSlotId,
  type SaveSlotInfo,
  type TurnReport,
} from '@republika/shared';
import {
  applyCommand,
  createInitialState,
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
}

export type ControllerResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code?: CommandErrorCode; readonly message: string };

export type ManualSlot = Exclude<SaveSlotId, 'autosave'>;

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
  }): Promise<ControllerResult> {
    try {
      const { definitions } = this.deps;
      const state = createInitialState(definitions.scenario, definitions, {
        presidentName: input.presidentName,
        cabinetName: input.cabinetName,
        seed: this.deps.createSeed(),
      });
      this.deps.store.setState({ state, lastReport: null, uiStatus: 'busy' });
      const saved = await this.autosave(state, { reports: [], ledger: [] });
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
    try {
      resolved = resolveTurn(
        current,
        { type: 'END_QUARTER', commandId: this.deps.createCommandId() },
        this.deps.definitions,
      );
    } catch {
      return this.fail(copy.controller.unexpected);
    }
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

  /** Memuat save yang sudah tervalidasi Zod ke store. */
  loadFromSave(file: SaveFile): ControllerResult {
    const expected = this.deps.definitions.scenario.rulesetVersion;
    if (file.state.rulesetVersion !== expected) {
      return this.fail(copy.controller.rulesetMismatch(file.state.rulesetVersion, expected));
    }
    const lastReport: TurnReport | null = file.history.reports.at(-1) ?? null;
    this.deps.store.setState({ state: file.state, lastReport, uiStatus: 'idle' });
    return { ok: true };
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
    return {
      saveFormatVersion: SAVE_FORMAT_VERSION,
      appVersion: APP_VERSION,
      rulesetVersion: state.rulesetVersion,
      contentHash: this.deps.contentHash,
      savedAt: this.deps.now(),
      label: label ?? copy.controller.saveLabel(state.presidentName, state.cabinetName, state.turn),
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
