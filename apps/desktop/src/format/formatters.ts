const decimalFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const oneDecimalFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
});

/** 523 (persepuluhan) -> "52,3". */
export function formatIndicator(valueTenths: number): string {
  return oneDecimalFormatter.format(valueTenths / 10);
}

/** 523 -> "+52,3"; nilai nol tidak diberi tanda. */
export function formatSignedIndicator(valueTenths: number): string {
  const formatted = formatIndicator(Math.abs(valueTenths));
  if (valueTenths > 0) return `+${formatted}`;
  if (valueTenths < 0) return `−${formatted}`;
  return formatted;
}

/** 8000 (miliar) -> "Rp8 T". */
export function formatRupiahTriliun(valueBillion: number): string {
  const sign = valueBillion < 0 ? '−' : '';
  const trillions = Math.abs(valueBillion) / 1000;
  return `${sign}Rp${decimalFormatter.format(trillions)} T`;
}

/** 8000 -> "+Rp8 T"; nilai nol tidak diberi tanda. */
export function formatSignedRupiahTriliun(valueBillion: number): string {
  if (valueBillion > 0) return `+${formatRupiahTriliun(valueBillion)}`;
  return formatRupiahTriliun(valueBillion);
}

/** 3 -> "+3"; nilai nol tidak diberi tanda. */
export function formatSignedInteger(value: number): string {
  if (value > 0) return `+${integerFormatter.format(value)}`;
  if (value < 0) return `−${integerFormatter.format(Math.abs(value))}`;
  return integerFormatter.format(0);
}

/** 523 (persepuluhan) -> "52,3%". */
export function formatPercentTenths(valueTenths: number): string {
  return `${formatIndicator(valueTenths)}%`;
}

/** Angka tampilan biasa dengan maksimal 3 desimal. */
export function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}
