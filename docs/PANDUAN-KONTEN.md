# Panduan Menulis Konten REPUBLIKA

Panduan ini untuk Anda sebagai penulis konten (fraksi, kebijakan, event, arketipe, skenario). Agent membangun sistemnya, sedangkan **isinya Anda yang tulis**. Semua file ada di `packages/game-data/content/`.

> Format diselaraskan dengan `packages/shared/src/validation/content.ts` pada Tahap 1. Schema tersebut beserta `common.ts` dan validator `packages/game-data/src/crossValidate.ts` adalah sumber kebenaran format. Semua contoh di sini ilustrasi, bukan konten final atau bundle lengkap yang pasti lolos lintas-file. Engine belum tersedia; uraian efek adalah kontrak, bukan fitur yang sudah berjalan.

## Memuat dan memeriksa konten

- Runtime aplikasi memakai import JSON statis di `packages/game-data/src/contentBundle.ts`, bukan membaca folder konten dari disk. Saat menambah/menghapus file fraksi, kebijakan, atau event, perbarui import dan koleksi bundle tersebut, lalu build ulang. `ministries.json` dan `archetypes.json` berisi array.
- `loadGameDefinitions(raw?)` memvalidasi schema, mengonversi angka ke representasi runtime, memeriksa lintas-file, lalu menghasilkan `{ definitions, contentHash, warnings }`. Gagal validasi melempar `ContentValidationError` dengan `issues` dan `warnings`.
- `pnpm content:check` membaca JSON langsung dari disk lewat `readContentFromDisk.ts`; exit bukan nol jika ada error. File yang lolos CLI belum tentu masuk bundle bila import statis belum didaftarkan. Pesan mencantumkan lokasi dan kesalahan; ID mengandung `PLACEHOLDER` memicu peringatan, bukan error.
- Hash SHA-256 memakai definisi hasil konversi: koleksi utama diurutkan menurut ID, key objek disortir rekursif, array bersarang tetap berurutan. Hash bukan anti-cheat.
- Konten saat ini placeholder: skenario `maxTurns: 4`; UI mock terpisah menampilkan 20 kuartal. Jangan mengubah konten final dalam pekerjaan fondasi.

---

## Aturan umum (berlaku di semua tahap)

1. **Fiktif total.** Dilarang memakai nama partai, politisi, kementerian, atau lembaga nyata. Inspirasi boleh, salinan jangan.
2. **ID stabil, jangan pernah diganti** setelah dipakai, karena save game bergantung padanya. Format: `POL-<KATEGORI>-<NNN>`, `FAC-<NAMA>`, `EVT-<TEMA>-<NNN>`, `ARC-<NAMA>`.
3. **Satuan:** indikator ditulis dalam satuan tampilan dengan **maksimal 1 desimal** (`0.4`, `-2`, `1.5`). Kas ditulis dalam **triliun** dengan maksimal 3 desimal (`8`, `0.75`).
4. **Selalu ada trade-off sebagai pedoman desain.** Validator Tahap 1 belum mendeteksi kebijakan terlalu dominan atau melakukan balancing.
5. **Menghapus atau mengganti ID setelah rilis** wajib disertai peta di `packages/game-data/migrations/ruleset-<N>.json`, sesuai AGENT §5.13. Format dan migrator belum diimplementasikan; jangan menganggap contoh rancangan lama sebagai schema migrasi aktif. Sebelum rilis, ikuti `docs/RELEASE.md`.
6. **Naikkan `version`** pada item yang Anda ubah setelah pernah dimainkan, dan naikkan `rulesetVersion` di `scenario.json` setiap kali merilis perubahan angka.
7. Setelah mengedit, **selalu jalankan** `pnpm content:check`. Mulai Tahap 4, jalankan juga `pnpm sim`.

### Kategori kebijakan dan kementerian

| Kategori                                         | Kementerian  |
| ------------------------------------------------ | ------------ |
| `FISCAL` (pajak, anggaran)                       | Keuangan     |
| `SOCIAL` (bansos, kesehatan, pendidikan)         | Sosial       |
| `ENERGY` (subsidi, energi terbarukan)            | Energi       |
| `GOVERNANCE` (birokrasi, daerah, keamanan sipil) | Dalam Negeri |

Kategori saat ini enum tertutup; kategori baru memerlukan perubahan schema/kode, bukan hanya JSON. Validator mewajibkan setiap kategori dibawahi tepat satu kementerian.

### Batas schema dan validasi Tahap 1

- ID maksimal 64 karakter, kapital/angka dipisahkan tanda hubung, misalnya `POL-ENERGY-001`. `version` integer 1..9999 wajib pada kebijakan, fraksi, kementerian, event, dan arketipe; skenario memakai `rulesetVersion`. `baseline.json` tidak memiliki field versi.
- `reasonCode` wajib pada **semua efek**, termasuk flag: kapital/angka/garis bawah, 3..64 karakter. Flag memakai pola yang sama. Tag ideologi huruf kecil/angka dengan tanda hubung, maksimal 40 karakter. Warna `#RRGGBB`.
- Kebijakan: `apCost` 1..5, biaya 0..10000 T, durasi 1..40, cooldown 0..40, minimal satu efek. `requirements`, `conflicts`, `modifiers` default `[]`; field lain pada contoh wajib. Nama 3..80 dan deskripsi maksimal 400 karakter.
- Fraksi: kursi integer 0..100 (total semua fraksi tepat 100), support 0..100 maksimal 1 desimal, preferensi integer −2..2 untuk **keempat** kategori. Minimal satu tag ideologi; `shortName` 1..8 karakter.
- Kementerian: minimal satu kategori tanpa duplikat, `initialEffectiveness` integer 40..90, `version` wajib.
- Event: judul 3..120, body 10..2000 karakter, bobot integer 1..1000, cooldown 0..40; minimal satu opsi dengan `neutral: true`. ID opsi unik dalam event, 1..20 karakter; label 3..120; hint opsional maksimal 200. `effects` default `[]`, `neutral` default `false`; tidak ada field requirement/biaya AP per opsi.
- Arketipe: `version` wajib; prioritas integer −1000..1000; kondisi `{stat, op, value}`. `stat` berpola `final.*`, `avg.*`, `min.*`, `max.*`, `count.*`, atau `total.*`; `op` salah satu `>=`, `>`, `<=`, `<`, `==`; value angka finite. Evaluator/statistik belum ada. Tanpa fallback prioritas 0 dengan kondisi kosong, validator memberi peringatan.
- ID unik lintas koleksi. Referensi kebijakan pada syarat/modifier/konflik, fraksi atau tag pada efek support, dan kementerian pada efek effectiveness harus ada. Self-conflict dan siklus konflik ditolak, termasuk A → B → A; jangan menulis pasangan dua arah.
- Jangan menambah field sembarang: field tak dikenal bukan fitur baru; schema objek Zod saat ini dapat membuang field yang tidak dikenal.

### Requirement, effect, dan modifier

| Requirement `type`                        | Field selain `type`                                          |
| ----------------------------------------- | ------------------------------------------------------------ |
| `INDICATOR_AT_LEAST`, `INDICATOR_AT_MOST` | `target`, `value` dalam domain indikator, maksimal 1 desimal |
| `TREASURY_AT_LEAST`                       | `valueTrillion`, −10000..10000, maksimal 3 desimal           |
| `POLICY_ACTIVE`, `POLICY_NOT_ACTIVE`      | `policyId`                                                   |
| `FLAG_SET`, `FLAG_NOT_SET`                | `flag`                                                       |
| `TURN_AT_LEAST`                           | `value` integer 1..100                                       |

| Effect `type`                   | Field wajib selain `type` dan `reasonCode`                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `MODIFY_INDICATOR`              | `target`, `delta` −100..100 maksimal 1 desimal, `timing`: `IMMEDIATE`, `PER_TURN`, atau `DELAYED` |
| `MODIFY_TREASURY`               | `deltaTrillion` −10000..10000 maksimal 3 desimal                                                  |
| `CHANGE_FACTION_SUPPORT`        | Tepat salah satu `factionId` / `ideologyTag`, serta `delta` −100..100 maksimal 1 desimal          |
| `MODIFY_MINISTRY_EFFECTIVENESS` | `ministryId`, `delta` integer −100..100                                                           |
| `SET_FLAG`, `CLEAR_FLAG`        | `flag`                                                                                            |

`delayTurns` wajib hanya pada indikator `DELAYED`, integer 1..40; dilarang untuk timing indikator lain. Isi hanya field relevan per jenis efek. Modifier membutuhkan `when` minimal satu requirement, `appliesTo` berupa key indikator, serta `multiplier` 0,1..3 maksimal 2 desimal. Nilai desimal JSON selalu memakai titik.

### Indikator yang bisa jadi target

`approval`, `stability`, `fiscalHealth`, `growthPct`, `inflationPct`, `unemploymentPct`, `welfare`, `trust`.

### Patokan ukuran efek (awal, akan dikoreksi Monte Carlo)

| Ukuran | Indikator 0–100 | Persen ekonomi |
| ------ | --------------- | -------------- |
| Kecil  | ±1 s/d 2        | ±0,1 s/d 0,2   |
| Sedang | ±3 s/d 5        | ±0,3 s/d 0,6   |
| Besar  | ±6 s/d 10       | ±0,7 s/d 1,5   |

Efek `PER_TURN` dihitung ulang setiap kuartal selama durasi berlaku. Contoh: +1 selama 4 kuartal = total +4.

---

## Format file

### `scenario.json`

```json
{
  "rulesetVersion": 1,
  "maxTurns": 4,
  "actionPointsPerTurn": 2,
  "maxEventsPerQuarter": 1,
  "lobbyCostTrillion": 2,
  "lobbySupportBonus": 15,
  "startYear": 2031,
  "initialIndicators": {
    "approval": 58,
    "stability": 62,
    "fiscalHealth": 55,
    "growthPct": 4.8,
    "inflationPct": 3.4,
    "unemploymentPct": 5.6,
    "welfare": 50,
    "trust": 52
  },
  "initialTreasuryTrillion": 150
}
```

`maxTurns` diisi 4 pada placeholder/slice, 20 target MVP; schema mengizinkan integer 1..100. `actionPointsPerTurn` 1..5, `maxEventsPerQuarter` 0..5, `lobbySupportBonus` integer 0..100, `startYear` 2000..2200. Kas awal/biaya lobi 0..10000 T. Semua field pada contoh wajib; skenario tidak memakai `id`/`version` item. `startYear` tahun fiktif untuk laporan.

### `baseline.json`

```json
{
  "inflationTargetPct": 3.0,
  "inflationReversion": 0.25,
  "growthTargetPct": 4.0,
  "growthReversion": 0.2,
  "okunCoefficient": 0.15,
  "okunNeutralGrowthPct": 2.5,
  "approvalAnchor": 50,
  "approvalReversion": 0.1,
  "baseRevenueTrillionPerTurn": 40,
  "baseSpendingTrillionPerTurn": 38,
  "negativeTreasuryFiscalHealthPenalty": 3,
  "factionSupportReversion": 0.1
}
```

Semua field baseline pada contoh wajib. Pengecualian presisi saat ini: target inflasi −5..50, target/pertumbuhan netral −10..15, anchor approval 0..100, dan penalti kas 0..20 menerima maksimal **3 desimal**, lalu loader mengonversinya ke persepuluhan. Agar sesuai satuan indikator addendum, tulis nilai tersebut maksimal 1 desimal. Koefisien reversion 0..1 dan Okun 0..5 menerima maksimal 3 desimal dan tetap desimal saat runtime. Pendapatan/belanja 0..10000 T maksimal 3 desimal dikonversi ke miliar.

### Kebijakan — `policies/POL-ENERGY-001.json`

```json
{
  "id": "POL-ENERGY-001",
  "version": 1,
  "name": "Reformasi Subsidi Energi",
  "description": "Mengalihkan subsidi BBM menjadi bantuan tepat sasaran secara bertahap.",
  "category": "ENERGY",
  "apCost": 1,
  "fiscalCostTrillion": 8,
  "perTurnCostTrillion": 0,
  "needsVote": true,
  "durationTurns": 4,
  "cooldownTurns": 2,
  "requirements": [{ "type": "POLICY_NOT_ACTIVE", "policyId": "POL-SOCIAL-001" }],
  "conflicts": [],
  "effects": [
    {
      "type": "MODIFY_INDICATOR",
      "target": "inflationPct",
      "delta": 0.4,
      "timing": "IMMEDIATE",
      "reasonCode": "ENERGY_PRICE_PASS_THROUGH"
    },
    {
      "type": "MODIFY_INDICATOR",
      "target": "approval",
      "delta": -4,
      "timing": "IMMEDIATE",
      "reasonCode": "PUBLIC_DISCONTENT_FUEL"
    },
    {
      "type": "MODIFY_INDICATOR",
      "target": "fiscalHealth",
      "delta": 1.5,
      "timing": "PER_TURN",
      "reasonCode": "SUBSIDY_SAVINGS"
    },
    {
      "type": "MODIFY_INDICATOR",
      "target": "welfare",
      "delta": 3,
      "timing": "DELAYED",
      "delayTurns": 2,
      "reasonCode": "TARGETED_AID_REACHES"
    },
    {
      "type": "CHANGE_FACTION_SUPPORT",
      "ideologyTag": "populis",
      "delta": -5,
      "reasonCode": "POPULIST_BACKLASH"
    }
  ],
  "modifiers": [
    {
      "when": [{ "type": "INDICATOR_AT_LEAST", "target": "inflationPct", "value": 6 }],
      "appliesTo": "approval",
      "multiplier": 1.5
    }
  ]
}
```

Arti modifier di atas: kalau inflasi sudah ≥ 6% di awal kuartal, penurunan approval dikali 1,5.

### Fraksi — `factions/FAC-*.json`

```json
{
  "id": "FAC-NUSANTARA-MAJU",
  "version": 1,
  "name": "Fraksi Nusantara Maju",
  "shortName": "NM",
  "seats": 22,
  "color": "#3B6EA5",
  "ideologyTags": ["teknokrat", "pro-pasar"],
  "baseSupport": 55,
  "initialSupport": 55,
  "policyPreferences": { "FISCAL": 2, "SOCIAL": -1, "ENERGY": 1, "GOVERNANCE": 0 },
  "description": "Fraksi teknokrat yang mengutamakan disiplin anggaran.",
  "leadership": [
    { "role": "CHAIR", "name": "Ratna Kusumawardhani" },
    { "role": "SECRETARY_GENERAL", "name": "Hendrawan Lukito" },
    { "role": "TREASURER", "name": "Theresia Manopo" },
    { "role": "CAUCUS_LEADER", "name": "Arief Prasetyadi" }
  ],
  "members": ["Nadia Rahmasari", "Yohanes Tamba", "Kadek Ariawan"]
}
```

`leadership` dan `members` opsional dan **hanya tampilan** (layar Parlemen), tidak memengaruhi simulasi. Jabatan yang tersedia: `CHAIR` (Ketua Umum), `SECRETARY_GENERAL` (Sekretaris Jenderal), `TREASURER` (Bendahara Umum), `CAUCUS_LEADER` (Ketua Fraksi), masing-masing maksimal satu orang. `members` maksimal 12 nama. Nama 3–60 karakter, fiktif, dan tidak boleh sama dengan nama politisi nyata. `content:check` memberi peringatan `DUPLICATE_PERSON_NAME` bila satu nama dipakai dua kali.

Preferensi −2..+2 menggeser skor voting ±10 per poin. Ingat rumusnya: fraksi setuju jika `support + preference×10 + lobi ≥ 50`. **Total kursi semua fraksi harus 100.**

### Kementerian — `ministries.json`

```json
[
  {
    "version": 1,
    "id": "MIN-KEUANGAN",
    "name": "Kementerian Keuangan",
    "categories": ["FISCAL"],
    "initialEffectiveness": 65
  },
  {
    "version": 1,
    "id": "MIN-SOSIAL",
    "name": "Kementerian Sosial",
    "categories": ["SOCIAL"],
    "initialEffectiveness": 60
  },
  {
    "version": 1,
    "id": "MIN-ENERGI",
    "name": "Kementerian Energi",
    "categories": ["ENERGY"],
    "initialEffectiveness": 55
  },
  {
    "version": 1,
    "id": "MIN-DALAM-NEGERI",
    "name": "Kementerian Dalam Negeri",
    "categories": ["GOVERNANCE"],
    "initialEffectiveness": 60
  }
]
```

### Event — `events/EVT-*.json`

```json
{
  "id": "EVT-DISASTER-001",
  "version": 1,
  "title": "Banjir Besar di Wilayah Pesisir",
  "body": "Hujan ekstrem merendam tiga provinsi pesisir. Gubernur meminta dana darurat.",
  "eligibility": [{ "type": "TURN_AT_LEAST", "value": 2 }],
  "triggerWeight": 10,
  "cooldownTurns": 6,
  "uniquePerCampaign": false,
  "choices": [
    {
      "id": "A",
      "label": "Cairkan dana darurat penuh",
      "hint": "Rakyat terbantu, kas terkuras.",
      "effects": [
        { "type": "MODIFY_TREASURY", "deltaTrillion": -6, "reasonCode": "EMERGENCY_FUND" },
        {
          "type": "MODIFY_INDICATOR",
          "target": "approval",
          "delta": 4,
          "timing": "IMMEDIATE",
          "reasonCode": "SWIFT_RESPONSE"
        }
      ]
    },
    {
      "id": "B",
      "label": "Serahkan ke anggaran daerah",
      "hint": "Hemat, tapi terlihat lepas tangan.",
      "neutral": true,
      "effects": [
        {
          "type": "MODIFY_INDICATOR",
          "target": "trust",
          "delta": -3,
          "timing": "IMMEDIATE",
          "reasonCode": "SEEN_AS_ABSENT"
        }
      ]
    }
  ]
}
```

**Wajib ada minimal satu opsi `"neutral": true`.** Opsi netral tidak harus tanpa efek; artinya "pilihan yang selalu bisa diambil" (tanpa prasyarat atau biaya AP). `hint` ditulis kualitatif dan tidak menyebut angka.

Untuk rancangan rantai event: event A memakai efek `{ "type": "SET_FLAG", "flag": "BANJIR_DITANGANI_DAERAH", "reasonCode": "REGIONAL_RESPONSE_CHOSEN" }`, lalu event B memakai eligibility `{ "type": "FLAG_SET", "flag": "BANJIR_DITANGANI_DAERAH" }`. Pemilihan/evaluasi event belum diimplementasikan.

### Arketipe — `archetypes.json`

```json
[
  {
    "id": "ARC-TEKNOKRAT-FISKAL",
    "version": 1,
    "priority": 10,
    "name": "Teknokrat Fiskal",
    "description": "Kas negara terjaga ketat, meski dukungan publik sering dikorbankan.",
    "conditions": [
      { "stat": "final.fiscalHealth", "op": ">=", "value": 70 },
      { "stat": "avg.approval", "op": "<", "value": 50 }
    ]
  },
  {
    "id": "ARC-SEIMBANG",
    "version": 1,
    "priority": 0,
    "name": "Pemerintahan Seimbang",
    "description": "Tidak ada satu arah yang dominan.",
    "conditions": []
  }
]
```

Kontrak: evaluasi dari prioritas tertinggi dan pakai yang pertama cocok. Statistik direncanakan didokumentasikan di `SIMULATION_RULES.md` (misalnya `final.*`, `avg.*`, `min.*`, `max.*`, `count.policiesByCategory.SOCIAL`, `count.votesFailed`, `count.lobbies`, `total.deficitTrillion`). Tahap 1 hanya memvalidasi pola string; nama statistik dan satuan evaluasi belum dijamin tersedia.

---

## Tugas konten per tahap

### Tahap 1 — Belum menulis apa pun

Format panduan sudah diselaraskan dengan schema Tahap 1. Konten repo tetap placeholder; cukup baca dan siapkan gagasan. Jangan menganggap mock UI sebagai konten final, atau menjalankan `pnpm sim`/`pnpm balance` sekarang: kedua CLI belum tersedia. Bagian tahap berikutnya di bawah adalah rencana, bukan kemampuan saat ini.

**Brainstorm awal (opsional, tapi sangat membantu):**

- Nama negara fiktif? Atau cukup "Republik"?
- 6 fraksi: apa spektrum ideologinya? Saran: pro-pasar, populis, religius-konservatif, nasionalis, progresif-lingkungan, regionalis/daerah.
- Nada umum: serius-realistis, satir ringan, atau campuran?

### Tahap 2 — 3 kebijakan slice + skenario + baseline

Tulis:

- [ ] `POL-ENERGY-001` Reformasi Subsidi Energi (contoh di atas bisa dipakai sebagai dasar)
- [ ] `POL-FISCAL-001` kebijakan pajak (mis. Reformasi PPN atau Pajak Karbon)
- [ ] `POL-SOCIAL-001` bantuan sosial (mis. Bantuan Langsung Tunai)
- [ ] `scenario.json` (`maxTurns: 4`), `baseline.json`, `ministries.json`

Agar slice menarik, buat ketiganya **saling bertabrakan**: pajak memperkuat kas tapi menurunkan approval, bansos menaikkan approval dan welfare tapi menguras kas, subsidi energi menghemat kas tapi memicu inflasi. Dengan 2 AP per kuartal, pemain tidak bisa mengambil semuanya.

### Tahap 3 — 2 event + 3 fraksi sementara

- [ ] 2 event: satu krisis (bencana/ekonomi) dan satu politik (mis. demo mahasiswa atau mosi DPR)
- [ ] 3 fraksi sementara (total 100 kursi) supaya voting bisa diuji. Nanti dipecah menjadi 6.
- [ ] Peta `reasonCode` → kalimat Indonesia untuk laporan (agent menyiapkan daftar kodenya, Anda menulis kalimatnya)

Tips: atur kursi supaya **tidak ada satu fraksi yang bisa meloloskan voting sendirian**, dan koalisi pemerintah awal sekitar 45–55 kursi, sehingga lobi benar-benar dibutuhkan.

### Tahap 4 — Konten MVP penuh

- [ ] 6 fraksi (total 100 kursi, ganti 3 fraksi sementara; ID boleh baru)
- [ ] 12 kebijakan: idealnya 3 per kategori, dengan variasi durasi (instan vs jangka panjang) dan butuh voting/tidak
- [ ] 15 event: campuran krisis, politik, ekonomi, dan peluang positif; minimal 2 rantai event via flag
- [ ] 5–8 arketipe + 1 fallback
- [ ] `scenario.json`: `maxTurns: 20`

Alur kerja per item: tulis → `pnpm content:check` → `pnpm sim --strategy=greedy-approval` dan `--strategy=no-op` → lihat apakah item itu terlalu kuat/lemah → revisi.

Template brainstorm kebijakan (isi dulu di catatan sebelum menulis JSON):

```
Nama:
Masalah yang diselesaikan:
Siapa yang diuntungkan / dirugikan (fraksi + indikator):
Efek cepat vs efek lambat:
Kapan kebijakan ini jadi pilihan buruk? (→ modifier/requirement)
```

### Tahap 5 — Tuning dari Monte Carlo

Baca `docs/balance/latest.md`, lalu sesuaikan:

| Gejala di laporan                       | Tindakan                                                            |
| --------------------------------------- | ------------------------------------------------------------------- |
| Kebijakan dipilih > 80% oleh bot greedy | Perbesar efek negatif, biaya, atau cooldown                         |
| Kebijakan hampir tidak pernah dipilih   | Perkuat manfaat atau kurangi biaya                                  |
| Indikator menempel di batas > 30% waktu | Perkecil efek yang mendorongnya, atau perkuat reversion di baseline |
| Event tidak pernah muncul               | Longgarkan eligibility atau naikkan bobot                           |
| Voting hampir selalu gagal/lolos        | Geser `initialSupport` atau preferensi fraksi                       |
| Satu arketipe mendominasi               | Perketat kondisinya atau tambah arketipe pesaing                    |

Ubah **satu kelompok angka per iterasi**, jalankan ulang `pnpm balance`, lalu bandingkan. Setelah puas, naikkan `rulesetVersion`.
