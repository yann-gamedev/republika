# tools/sim — simulasi kampanye untuk penulis konten

Menjalankan satu kampanye penuh dengan bot, langsung dari file di `packages/game-data/content/`, lalu mencetak laporan markdown.

```
pnpm sim --seed=abc --strategy=greedy-approval --turns=20 --out=laporan.md
```

| Opsi         | Arti                                                                                   | Default                      |
| ------------ | -------------------------------------------------------------------------------------- | ---------------------------- |
| `--seed`     | Seed kampanye. Seed + strategi + konten yang sama selalu menghasilkan laporan identik. | `republika`                  |
| `--strategy` | `random`, `greedy-approval`, `austerity`, `welfare`, atau `no-op`                      | `random`                     |
| `--turns`    | Panjang kampanye (menimpa `maxTurns` di `scenario.json` khusus simulasi ini)           | dari `scenario.json`         |
| `--out`      | Tulis laporan ke file, bukan ke layar                                                  | —                            |
| `--content`  | Folder konten lain (mis. salinan untuk eksperimen)                                     | `packages/game-data/content` |

## Strategi bot

- **random** — mengajukan kebijakan dan melobi secara acak (acak ber-seed), memilih opsi event acak.
- **greedy-approval** — memilih kebijakan dengan proyeksi persetujuan tertinggi.
- **austerity** — mengejar kesehatan fiskal dan kas.
- **welfare** — mengejar kesejahteraan, menekan pengangguran, sedikit memperhatikan persetujuan.
- **no-op** — tidak mengajukan apa pun; selalu memilih opsi event netral. Berguna untuk melihat dinamika dasar (baseline).

Bot cerdas (greedy/austerity/welfare) memakai `projectPolicy` untuk menilai kebijakan, lalu melobi fraksi penolak dengan skor tertinggi bila voting diprediksi gagal. Bot ada di `packages/simulation/test-utils/bots/` dan murni/deterministik.

## Isi laporan

Tabel 8 indikator dan kas per kuartal, kebijakan yang berlaku/gagal beserta kursi setuju, peristiwa dan pilihan, statistik akhir, dan arketipe akhir.

Gunakan bersama `pnpm content:check`: tulis konten → periksa → jalankan 5 strategi → lihat apakah satu kebijakan terlalu kuat atau arketipe selalu sama.
