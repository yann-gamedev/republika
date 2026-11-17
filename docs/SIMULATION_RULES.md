# Aturan Simulasi — Kerangka Tahap 1

Acuan normatif: `AGENT.md` §5 (addendum v0.3). **Engine belum tersedia**; aturan di bawah kontrak untuk tahap berikutnya, bukan laporan hasil simulasi. UI mock 20 kuartal tidak menjalankan aturan ini; skenario placeholder saat ini 4 kuartal.

## Representasi yang sudah disiapkan

- Delapan indikator runtime berupa integer persepuluhan: `523` = 52,3. Kas runtime `treasuryBillion`: `8000` = 8 T.
- JSON penulis memakai indikator maksimal 1 desimal dan kas triliun maksimal 3 desimal. Schema menolak presisi berlebih sebelum konversi; pengecualian parameter baseline dijelaskan di `PANDUAN-KONTEN.md`.
- Pembulatan `roundTenths()` memakai round half away from zero. Resolusi nanti membulatkan setelah tiap efek berpengali, lalu normalize/clamp mencatat `CLAMPED` di ledger.
- Waktu, seed RNG, dan definisi konten harus masuk eksplisit; urutan iterasi yang memengaruhi hasil harus deterministik menurut ID.

## Kontrak resolusi

Command: `ENACT_POLICY`, `LOBBY_FACTION`, `RESPOND_EVENT`, `CANCEL_PENDING`, `END_QUARTER`, masing-masing memiliki `commandId`. Default skenario 2 AP; kebijakan/lobi memesan AP, pembatalan mengembalikan AP, respons event 0 AP.

Urutan end-quarter terkunci di `AGENT.md` §5.10: validasi/AP; respons event; lobi; voting menurut `policyId`; biaya awal; efek IMMEDIATE; tick kebijakan/cooldown; baseline; effectiveness kementerian; normalize/clamp; pilih event berikutnya; laporan dan kemajuan turn/status/arketipe.

- Lobi: default 1 AP + 2 T, bonus support +15 hanya untuk voting kuartal itu, sekali per fraksi per kuartal.
- Voting memakai satuan tampilan: `support + preference[category] × 10 + lobbyBonus >= 50`; lolos jika kursi setuju minimal 51/100. Runtime fixed-point harus mengonversi ambang secara konsisten.
- Voting gagal: AP habis, trust −2,0, cooldown 1 kuartal, tanpa biaya kas; ledger `VOTE_FAILED`.
- Event terpilih akhir N menjadi pending N+1; `END_QUARTER` ditolak dengan `EVENT_RESPONSE_REQUIRED` selama respons belum lengkap. Setiap event minimal satu opsi netral.
- `projectPolicy()` direncanakan murni tanpa RNG: rentang indikator 75–125% dari expected, biaya kas pasti.
- Baseline, pengali kementerian, dan akhir kampanye tanpa kondisi kalah mengikuti §5.6, §5.9, §5.11. Parameter konten masih placeholder, belum hasil balancing.

## Belum diimplementasikan / diverifikasi

Resolusi command, PRNG, evaluasi requirement/effect/modifier/arketipe, ledger, laporan, migrasi, dan replay deterministik. Schema arketipe baru memeriksa pola nama statistik, bukan memastikan statistik tersedia. Detail engine dan test determinisme ditambahkan saat tahap terkait; jangan mengklaim balancing atau kampanye selesai dari mock.
