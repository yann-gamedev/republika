import { useEffect, useState } from 'react';

import { cn } from '@/ui/lib/utils';

interface ArtImageProps {
  /** Pemuat URL dari `content/art.ts`. */
  readonly load: () => Promise<string>;
  readonly alt: string;
  /** Kelas untuk kotak berukuran tetap; gambar mengisi kotak dengan `object-cover`. */
  readonly className?: string;
}

/**
 * Ilustrasi sebagai `<img>` dengan kotak berukuran tetap supaya layout tidak
 * meloncat saat URL selesai dimuat. Tanpa SVG inline (hemat JS heap).
 */
export function ArtImage({ load, alt, className }: ArtImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void load().then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [load]);

  return (
    <div className={cn('overflow-hidden bg-raised', className)}>
      {src !== null && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
