/** Kode error command yang stabil (dipakai UI dan test; jangan diganti nama). */
export const COMMAND_ERROR_CODES = [
  'CAMPAIGN_COMPLETED',
  'DUPLICATE_COMMAND',
  'UNKNOWN_POLICY',
  'ALREADY_ACTIVE',
  'ALREADY_PENDING',
  'ON_COOLDOWN',
  'CONFLICT',
  'REQUIREMENT_NOT_MET',
  'INSUFFICIENT_AP',
  'UNKNOWN_FACTION',
  'LOBBY_LIMIT',
  'UNKNOWN_EVENT',
  'UNKNOWN_CHOICE',
  'UNKNOWN_PENDING_COMMAND',
  'EVENT_RESPONSE_REQUIRED',
] as const;

export type CommandErrorCode = (typeof COMMAND_ERROR_CODES)[number];

/** Pesan Indonesia untuk tiap kode error, terpisah dari logika validasi. */
export const COMMAND_ERROR_MESSAGES: Readonly<Record<CommandErrorCode, string>> = {
  CAMPAIGN_COMPLETED: 'Masa jabatan sudah berakhir. Tidak ada keputusan baru yang bisa diambil.',
  DUPLICATE_COMMAND: 'Perintah ini sudah diproses.',
  UNKNOWN_POLICY: 'Kebijakan tidak ditemukan.',
  ALREADY_ACTIVE: 'Kebijakan ini sedang berjalan.',
  ALREADY_PENDING: 'Kebijakan ini sudah diajukan untuk kuartal ini.',
  ON_COOLDOWN: 'Kebijakan ini masih dalam masa jeda dan belum bisa diajukan lagi.',
  CONFLICT: 'Kebijakan ini bertentangan dengan kebijakan yang aktif atau sedang diajukan.',
  REQUIREMENT_NOT_MET: 'Syarat kebijakan ini belum terpenuhi.',
  INSUFFICIENT_AP: 'Poin aksi kuartal ini tidak cukup.',
  UNKNOWN_FACTION: 'Fraksi tidak ditemukan.',
  LOBBY_LIMIT: 'Fraksi ini sudah dilobi pada kuartal ini.',
  UNKNOWN_EVENT: 'Peristiwa tidak ditemukan atau tidak sedang menunggu respons.',
  UNKNOWN_CHOICE: 'Pilihan respons tidak tersedia untuk peristiwa ini.',
  UNKNOWN_PENDING_COMMAND: 'Tidak ada pengajuan dengan ID tersebut untuk dibatalkan.',
  EVENT_RESPONSE_REQUIRED: 'Tanggapi semua peristiwa yang menunggu sebelum mengakhiri kuartal.',
};

export interface CommandError {
  readonly code: CommandErrorCode;
  readonly message: string;
}

export function commandError(code: CommandErrorCode): CommandError {
  return { code, message: COMMAND_ERROR_MESSAGES[code] };
}
