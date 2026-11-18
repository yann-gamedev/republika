interface HemicycleGroup {
  readonly id: string;
  readonly label: string;
  readonly seats: number;
  readonly color: string;
}

interface HemicycleProps {
  readonly groups: readonly HemicycleGroup[];
  readonly ariaLabel: string;
  readonly centerValue: string;
  readonly centerLabel: string;
}

const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 248;
const CENTER_X = VIEW_WIDTH / 2;
const CENTER_Y = 218;
const ROW_WEIGHTS = [11, 15, 19, 23, 32] as const;

function rowCounts(total: number): number[] {
  const exact = ROW_WEIGHTS.map((weight) => (weight / 100) * total);
  const counts = exact.map((value) => Math.floor(value));
  let remaining = total - counts.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);
  let cursor = 0;
  while (remaining > 0) {
    const target = order[cursor % order.length];
    if (target !== undefined) counts[target.index] = (counts[target.index] ?? 0) + 1;
    remaining -= 1;
    cursor += 1;
  }
  return counts;
}

export function Hemicycle({ groups, ariaLabel, centerValue, centerLabel }: HemicycleProps) {
  const total = groups.reduce((sum, group) => sum + group.seats, 0);
  const counts = rowCounts(total);
  const seatGroups = groups.flatMap((group) => Array.from({ length: group.seats }, () => group));
  let seatIndex = 0;

  const seats: Array<{ x: number; y: number; color: string; label: string; key: string }> = [];
  counts.forEach((count, row) => {
    const radius = 54 + row * 25.5;
    for (let index = 0; index < count; index += 1) {
      const group = seatGroups[seatIndex];
      if (group === undefined) return;
      const angle = Math.PI - (Math.PI * (index + 0.5)) / count;
      seats.push({
        x: CENTER_X + Math.cos(angle) * radius,
        y: CENTER_Y - Math.sin(angle) * radius,
        color: group.color,
        label: group.label,
        key: `${group.id}-${seatIndex}`,
      });
      seatIndex += 1;
    }
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      <line
        x1="24"
        x2={VIEW_WIDTH - 24}
        y1={CENTER_Y + 8}
        y2={CENTER_Y + 8}
        stroke="currentColor"
        className="text-border"
        strokeWidth="1"
      />
      {seats.map((seat) => (
        <circle
          key={seat.key}
          cx={seat.x}
          cy={seat.y}
          r="5.2"
          fill={seat.color}
          stroke="hsl(var(--background))"
          strokeWidth="1.4"
        >
          <title>{seat.label}</title>
        </circle>
      ))}
      <text
        x={CENTER_X}
        y={CENTER_Y - 36}
        textAnchor="middle"
        className="fill-foreground font-serif text-[25px]"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {centerValue}
      </text>
      <text
        x={CENTER_X}
        y={CENTER_Y - 18}
        textAnchor="middle"
        className="fill-muted-foreground text-[8px]"
        letterSpacing="0.16em"
      >
        {centerLabel}
      </text>
    </svg>
  );
}
