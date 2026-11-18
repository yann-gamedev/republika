import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * pnpm perf:report — ringkasan ukuran untuk anggaran performa AGENT §5.17:
 * chunk JS/CSS (mentah + gzip), kontribusi tiap paket ke bundle (dari
 * rollup-plugin-visualizer), daftar dependensi runtime, dan ukuran installer.
 */
const ROOT = resolve(import.meta.dirname, '../..');
const DESKTOP = join(ROOT, 'apps/desktop');
const DIST = join(DESKTOP, 'dist/assets');
const STATS = join(DESKTOP, 'dist-stats/stats.json');
const NSIS = join(DESKTOP, 'src-tauri/target/release/bundle/nsis');

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;
const mib = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;

const lines: string[] = ['# Laporan performa REPUBLIKA', ''];

// 1. Chunk hasil build.
const assets = readdirSync(DIST)
  .filter((name) => /\.(js|css|woff2|svg|jpg|webp)$/u.test(name))
  .map((name) => {
    const buffer = readFileSync(join(DIST, name));
    return { name, raw: buffer.length, gzip: gzipSync(buffer).length };
  })
  .sort((a, b) => b.raw - a.raw);
const total = (kind: string) =>
  assets.filter((asset) => asset.name.endsWith(kind)).reduce((sum, asset) => sum + asset.raw, 0);
lines.push('## Bundle web', '');
const art = assets.filter((asset) => /\.(svg|jpg|webp)$/u.test(asset.name));
const artRaw = art.reduce((sum, asset) => sum + asset.raw, 0);
const artGzip = art.reduce((sum, asset) => sum + asset.gzip, 0);
lines.push(
  `- JS total: ${kb(total('.js'))} · CSS: ${kb(total('.css'))} · font: ${kb(total('.woff2'))}`,
  `- Ilustrasi (berkas terpisah, bukan chunk JS): ${art.length} berkas, ${kb(artRaw)} mentah / ${kb(artGzip)} gzip`,
);
lines.push('', '| File | Mentah | Gzip |', '| --- | ---: | ---: |');
for (const asset of assets) lines.push(`| ${asset.name} | ${kb(asset.raw)} | ${kb(asset.gzip)} |`);

// 2. Kontribusi per paket (renderedLength dari visualizer).
interface RawData {
  nodeParts: Record<string, { renderedLength: number; gzipLength?: number }>;
  nodeMetas: Record<string, { id: string; moduleParts: Record<string, string> }>;
}
if (existsSync(STATS)) {
  const data = JSON.parse(readFileSync(STATS, 'utf8')) as RawData;
  const byPackage = new Map<string, number>();
  for (const meta of Object.values(data.nodeMetas)) {
    const id = meta.id.replace(/\\/gu, '/');
    const match = /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/u.exec(id);
    const pkg =
      match?.[1] ??
      (/\/packages\/([^/]+)\//u.exec(id)?.[1] !== undefined
        ? `@republika/${/\/packages\/([^/]+)\//u.exec(id)?.[1] ?? ''}`
        : id.includes('/apps/desktop/')
          ? '@republika/desktop (src)'
          : 'lainnya');
    for (const partId of Object.values(meta.moduleParts)) {
      const part = data.nodeParts[partId];
      if (part !== undefined) byPackage.set(pkg, (byPackage.get(pkg) ?? 0) + part.renderedLength);
    }
  }
  lines.push('', '## Kontribusi per paket (setelah tree-shaking, sebelum minify)', '');
  lines.push('| Paket | Ukuran |', '| --- | ---: |');
  for (const [pkg, size] of [...byPackage.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${pkg} | ${kb(size)} |`);
  }
  lines.push('', 'Treemap interaktif: `apps/desktop/dist-stats/stats.html`.');
}

// 3. Dependensi runtime yang dideklarasikan.
const desktopPkg = JSON.parse(readFileSync(join(DESKTOP, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
};
lines.push('', '## Dependensi runtime desktop', '');
lines.push(
  Object.entries(desktopPkg.dependencies)
    .map(([name, version]) => `- ${name} ${version}`)
    .join('\n'),
);
const cargo = readFileSync(join(DESKTOP, 'src-tauri/Cargo.toml'), 'utf8');
const crates = /\[dependencies\]([\s\S]*?)(?:\n\[|$)/u.exec(cargo)?.[1]?.trim() ?? '';
lines.push('', 'Rust (`src-tauri/Cargo.toml`):', '', '```toml', crates, '```');

// 4. Installer.
lines.push('', '## Installer', '');
const installers = existsSync(NSIS)
  ? readdirSync(NSIS).filter((name) => name.endsWith('.exe'))
  : [];
if (installers.length === 0) {
  lines.push('Belum ada installer lokal. Jalankan `pnpm build` lalu ulangi laporan ini.');
} else {
  for (const name of installers) {
    const size = statSync(join(NSIS, name)).size;
    const status =
      size <= 10 * 1024 * 1024
        ? 'target ≤ 10 MB terpenuhi'
        : size <= 15 * 1024 * 1024
          ? 'di atas target, di bawah batas 15 MB'
          : 'MELEWATI batas 15 MB';
    lines.push(`- ${name}: ${mib(size)} (${size.toLocaleString('id-ID')} byte) — ${status}`);
  }
}

process.stdout.write(`${lines.join('\n')}\n`);
