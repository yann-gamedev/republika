import { cn } from '@/ui/lib/utils';

import type { PortraitHead } from '@republika/shared';

export { PORTRAIT_HEADS, type PortraitHead } from '@republika/shared';

export interface PortraitLook {
  readonly head: PortraitHead;
  readonly skin: string;
  readonly suit: string;
  /** Warna dasi atau kerudung. */
  readonly accent: string;
  readonly bg: string;
  readonly glasses?: boolean;
}

interface PortraitProps extends Partial<PortraitLook> {
  readonly size?: number;
  /** Bila diisi, potret diumumkan pembaca layar; tanpa label dianggap dekoratif. */
  readonly label?: string;
  readonly className?: string;
}

const HAIR = '#2B2522';
const SHORT_HAIR =
  'M66 82 C64 52 80 42 100 42 C122 42 136 54 134 82 C128 66 114 60 100 60 C86 60 72 66 66 82 Z';
const LONG_HAIR =
  'M64 100 C58 56 78 42 100 42 C122 42 142 56 136 100 L140 124 C134 128 128 126 126 120 L130 76 C122 64 110 60 100 60 C90 60 78 64 70 76 L74 120 C72 126 66 128 60 124 Z';

/** Potret flat tanpa wajah (port dari docs/wireframe-v2/Potret.dc.html). */
export function Portrait({
  head = 'peci',
  skin = '#C09078',
  suit = '#181A1F',
  accent = '#C03018',
  bg = '#D8D8C0',
  glasses = false,
  size = 96,
  label,
  className,
}: PortraitProps) {
  const a11y =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'img', 'aria-label': label } as const);
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-md', className)}
      data-head={head}
      {...a11y}
    >
      <rect width="200" height="200" fill={bg} />
      {head === 'hijab' ? (
        <>
          <path d="M48 200 C48 150 68 128 100 128 C132 128 152 150 152 200 Z" fill={suit} />
          <path
            d="M58 92 C58 56 78 40 100 40 C122 40 142 56 142 92 L148 150 C130 164 70 164 52 150 Z"
            fill={accent}
          />
          <ellipse cx="100" cy="88" rx="28" ry="33" fill={skin} />
        </>
      ) : (
        <>
          <rect x="88" y="112" width="24" height="24" fill={skin} />
          <path d="M30 200 C30 150 60 132 100 132 C140 132 170 150 170 200 Z" fill={suit} />
          <polygon points="86,134 114,134 100,166" fill="#ECEAE4" />
          <polygon points="96,140 104,140 106,176 100,184 94,176" fill={accent} />
          <ellipse cx="100" cy="84" rx="32" ry="38" fill={skin} />
          {head === 'peci' && <rect x="66" y="40" width="68" height="30" rx="6" fill="#111215" />}
          {head === 'rambut' && <path d={SHORT_HAIR} fill={HAIR} />}
          {head === 'uban' && <path d={SHORT_HAIR} fill="#B8B4AA" />}
          {head === 'panjang' && <path d={LONG_HAIR} fill={HAIR} />}
          {head === 'baret' && (
            <>
              <path d="M62 66 C62 40 90 34 120 40 C142 44 144 60 138 68 Z" fill="#4A5A3A" />
              <circle cx="78" cy="58" r="6" fill="#C9A227" />
            </>
          )}
          {head === 'botak' && (
            <>
              <rect x="66" y="74" width="8" height="22" rx="4" fill="#787878" />
              <rect x="126" y="74" width="8" height="22" rx="4" fill="#787878" />
            </>
          )}
          {glasses && (
            <>
              <circle cx="87" cy="86" r="11" fill="none" stroke="#181A1F" strokeWidth="3" />
              <circle cx="113" cy="86" r="11" fill="none" stroke="#181A1F" strokeWidth="3" />
              <rect x="97" y="84" width="6" height="3" fill="#181A1F" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
