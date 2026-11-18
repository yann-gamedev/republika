# Kredit

REPUBLIKA dirilis dengan lisensi MIT (lihat [LICENSE](LICENSE)). Semua nama negara, fraksi, tokoh, lembaga, dan kebijakan dalam game adalah fiktif.

## Font (dibundel lokal, SIL Open Font License 1.1)

| Font                                    | Pemegang hak                                                | Lisensi                                                              |
| --------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Inter                                   | The Inter Project Authors (<https://github.com/rsms/inter>) | [OFL 1.1](apps/desktop/src/assets/fonts/OFL-Inter.txt)               |
| Source Serif 4                          | Adobe (Source Serif)                                        | [OFL 1.1](apps/desktop/src/assets/fonts/OFL-Source-Serif-4.txt)      |
| IBM Plex Mono (400, subset Latin)       | IBM Corp.                                                   | [OFL 1.1](apps/desktop/src/assets/fonts/OFL-IBM-Plex-Mono.txt)       |
| Mrs Saint Delafield (400, subset Latin) | Alejandro Paul (Sudtipos)                                   | [OFL 1.1](apps/desktop/src/assets/fonts/OFL-Mrs-Saint-Delafield.txt) |

## Ikon dan grafis

- Ikon aplikasi (`apps/desktop/src-tauri/app-icon.svg` dan turunannya di `icons/`) dan segel republik fiktif dibuat khusus untuk REPUBLIKA. Tidak memakai lambang negara asli, foto tokoh nyata, atau logo partai.
- Ikon antarmuka adalah SVG buatan sendiri (`apps/desktop/src/ui/icons.tsx`).
- Grafik (garis dan hemicycle parlemen) adalah komponen SVG buatan sendiri, tanpa library chart.

## Dependensi utama

| Paket                                                                                                                                                                                       | Lisensi          | Kegunaan                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------ |
| [Tauri 2](https://tauri.app) + plugin opener & dialog                                                                                                                                       | MIT / Apache-2.0 | Shell desktop Windows (WebView2)           |
| [React](https://react.dev)                                                                                                                                                                  | MIT              | Antarmuka                                  |
| [React Router](https://reactrouter.com)                                                                                                                                                     | MIT              | Navigasi layar                             |
| [Zustand](https://github.com/pmndrs/zustand)                                                                                                                                                | MIT              | State UI tipis                             |
| [Zod](https://zod.dev)                                                                                                                                                                      | MIT              | Validasi konten dan save                   |
| [Tailwind CSS](https://tailwindcss.com), [tailwind-merge](https://github.com/dcastil/tailwind-merge), [clsx](https://github.com/lukeed/clsx), [class-variance-authority](https://cva.style) | MIT              | Gaya                                       |
| [Radix UI](https://www.radix-ui.com) (label, progress, slot)                                                                                                                                | MIT              | Komponen dasar aksesibel (lewat shadcn/ui) |
| [@noble/hashes](https://github.com/paulmillr/noble-hashes)                                                                                                                                  | MIT              | Hash konten SHA-256                        |

Alat pengembangan (tidak ikut installer): Vite, TypeScript, Vitest, fast-check, Playwright, axe-core, ESLint, Prettier, tsx, rollup-plugin-visualizer.

Daftar lengkap dependensi beserta lisensinya ada di `pnpm-lock.yaml` dan `apps/desktop/src-tauri/Cargo.lock`.
