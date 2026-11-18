import { useId } from 'react';

import { formatDecimal } from '@/format/formatters';
import { cn } from '@/ui/lib/utils';

export interface LineChartSeries {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly values: readonly number[];
}

interface LineChartProps {
  readonly series: readonly LineChartSeries[];
  readonly labels: readonly string[];
  readonly ariaLabel: string;
  readonly min?: number;
  readonly max?: number;
  readonly height?: number;
  readonly className?: string;
  readonly formatValue?: (value: number) => string;
}

const WIDTH = 660;
const HEIGHT = 240;
const PADDING = { top: 18, right: 18, bottom: 34, left: 48 };

export function LineChart({
  series,
  labels,
  ariaLabel,
  min,
  max,
  height = 240,
  className,
  formatValue = formatDecimal,
}: LineChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const allValues = series.flatMap((line) => line.values);
  const rawMin = min ?? Math.min(...allValues);
  const rawMax = max ?? Math.max(...allValues);
  const span = rawMax - rawMin || 1;
  const chartMin = rawMin - span * 0.1;
  const chartMax = rawMax + span * 0.1;
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const pointCount = Math.max(...series.map((line) => line.values.length), labels.length, 2);

  const xAt = (index: number): number => PADDING.left + (index / (pointCount - 1)) * plotWidth;
  const yAt = (value: number): number =>
    PADDING.top + ((chartMax - value) / (chartMax - chartMin)) * plotHeight;

  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = chartMin + ((chartMax - chartMin) * index) / 4;
    return { value, y: yAt(value) };
  });

  const zeroLine = chartMin <= 0 && chartMax >= 0 ? yAt(0) : null;
  const firstSeries = series[0];

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ height }}
        className="w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        <title>{ariaLabel}</title>
        <defs>
          <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={firstSeries?.color ?? '#c3a05f'} stopOpacity="0.18" />
            <stop offset="100%" stopColor={firstSeries?.color ?? '#c3a05f'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={tick.y}
              y2={tick.y}
              stroke="currentColor"
              className="text-border"
              strokeOpacity="0.45"
              strokeDasharray="2 5"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PADDING.left - 10}
              y={tick.y + 3.5}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatValue(tick.value)}
            </text>
          </g>
        ))}

        {zeroLine !== null && (
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={zeroLine}
            y2={zeroLine}
            stroke="currentColor"
            className="text-foreground"
            strokeOpacity="0.28"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {labels.map((label, index) =>
          index % Math.ceil(labels.length / 6) === 0 || index === labels.length - 1 ? (
            <text
              key={`${label}-${index}`}
              x={xAt(index)}
              y={HEIGHT - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
              letterSpacing="0.08em"
            >
              {label}
            </text>
          ) : null,
        )}

        {firstSeries !== undefined && (
          <path
            d={`M ${xAt(0)} ${HEIGHT - PADDING.bottom} ${firstSeries.values
              .map((value, index) => `L ${xAt(index)} ${yAt(value)}`)
              .join(' ')} L ${xAt(firstSeries.values.length - 1)} ${HEIGHT - PADDING.bottom} Z`}
            fill={`url(#${gradientId}-area)`}
          />
        )}

        {series.map((line) => {
          const path = line.values
            .map((value, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(value)}`)
            .join(' ');
          const lastValue = line.values[line.values.length - 1];
          return (
            <g key={line.id}>
              <path
                d={path}
                fill="none"
                stroke={line.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {line.values.map((value, index) => (
                <circle
                  key={`${line.id}-${index}`}
                  cx={xAt(index)}
                  cy={yAt(value)}
                  r={index === line.values.length - 1 ? 3.4 : 2.3}
                  fill={line.color}
                  stroke="hsl(var(--background))"
                  strokeWidth="1.5"
                />
              ))}
              {lastValue !== undefined && (
                <text
                  x={xAt(line.values.length - 1)}
                  y={yAt(lastValue) - 10}
                  textAnchor="end"
                  fill={line.color}
                  className="text-[11px] font-semibold"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatValue(lastValue)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
        {series.map((line) => (
          <div key={line.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-[2px] w-5"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-xs text-muted-foreground">{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
