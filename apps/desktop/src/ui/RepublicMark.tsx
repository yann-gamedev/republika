/** Tanda republik fiktif kecil (lingkaran + bintang emas) untuk header dan menu. */
export function RepublicMark({ size = 24 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="15" fill="none" stroke="#C9A227" strokeWidth="1.5" />
      <path
        d="M16 7l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z"
        fill="#C9A227"
      />
    </svg>
  );
}
