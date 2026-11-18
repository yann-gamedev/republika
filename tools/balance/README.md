# tools/balance — balancing Monte Carlo

```
pnpm balance --runs=5000 [--strategies=all] [--turns=20] [--out=docs/balance/latest.md]
```

Menjalankan banyak kampanye bot (engine murni di Node, dibagi ke worker threads) langsung dari `packages/game-data/content/`, lalu meringkasnya untuk penulis konten.

| Opsi           | Arti                                                     | Default                      |
| -------------- | -------------------------------------------------------- | ---------------------------- |
| `--runs`       | Total kampanye, dibagi rata ke strategi terpilih         | 5000                         |
| `--strategies` | `all` atau daftar dipisah koma (`random,welfare`)        | `all`                        |
| `--turns`      | Panjang kampanye                                         | 20                           |
| `--seed`       | Seed dasar; seed tiap kampanye = `<seed>-<strategi>-<i>` | `balance`                    |
| `--workers`    | Jumlah worker thread (1 = tanpa worker)                  | jumlah CPU                   |
| `--out`        | Tulis laporan ke file                                    | layar                        |
| `--content`    | Folder konten lain (eksperimen)                          | `packages/game-data/content` |

Hasil **deterministik**: seed + strategi + konten yang sama menghasilkan laporan identik, berapa pun jumlah worker-nya. Exit code 1 bila ada softlock.

## Isi laporan

- Persentil 5/25/50/75/95 tiap indikator akhir per strategi.
- Frekuensi arketipe per strategi.
- Tingkat lolos voting per kebijakan, dan seberapa sering bot `greedy-approval` memilih tiap kebijakan.
- Event yang tidak pernah muncul.
- Persentase kuartal tiap indikator menempel di batas domain.
- Softlock (kampanye yang tidak bisa diselesaikan bot).
- Ukuran file save rata-rata dan maksimum (format v2).

## Bendera otomatis

| Bendera                                    | Kapan                                                            |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `SOFTLOCK`                                 | Ada kampanye yang macet                                          |
| `SAVE_TOO_LARGE`                           | Save maksimum > 1 MB                                             |
| `STUCK_AT_BOUND`                           | Indikator di batas domain > 30% kuartal                          |
| `EVENT_NEVER_SEEN`                         | Event tidak pernah muncul di semua kampanye                      |
| `VOTE_ALWAYS_PASSES` / `VOTE_ALWAYS_FAILS` | Kebijakan dengan ≥ 20 voting selalu lolos/gagal                  |
| `GREEDY_FAVOURITE`                         | Bot greedy memilih kebijakan yang sama di > 80% kampanye         |
| `ARCHETYPE_DOMINANT`                       | Satu arketipe > 80% kampanye sebuah strategi                     |
| `DOMINANT_STRATEGY`                        | Median sebuah strategi lebih baik/setara di ≥ 6 dari 8 indikator |

Agent tidak mengubah angka konten. Rekomendasi ada di laporan; penulis konten menyesuaikan `content/` lalu menaikkan `rulesetVersion`.
