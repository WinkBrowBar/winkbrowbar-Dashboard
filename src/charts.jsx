// Small, dependency-free SVG charts. No charting library in this project,
// and these datasets are small (a few dozen buckets at most), so hand-rolled
// SVG keeps the bundle light and the styling consistent with the rest of
// the dashboard instead of pulling in a whole charting library for a few
// lines and bars.
import { useState } from 'react';

const PAD = { top: 12, right: 12, bottom: 28, left: 8 };

function niceMax(max) {
  if (max <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

// Multi-series line chart. data: [{ x: label, [seriesKey]: number, ... }]
// series: [{ key, label, color }]
export function LineChart({ data, series, height = 220, formatValue = (v) => v, formatX = (v) => v }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-[13px] text-ink/40">No data for this window.</div>;
  }

  const width = 700;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const n = data.length;
  const maxVal = niceMax(Math.max(...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))));

  const xAt = (i) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v) => PAD.top + innerH - (v / maxVal) * innerH;

  // Show at most ~7 x-axis labels so dense ranges don't overlap.
  const labelEvery = Math.max(1, Math.ceil(n / 7));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PAD.left} x2={width - PAD.right}
            y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)}
            stroke="rgba(22,21,26,0.07)" strokeWidth="1"
          />
        ))}

        {series.map((s) => {
          const points = data.map((d, i) => `${xAt(i)},${yAt(Number(d[s.key]) || 0)}`).join(' ');
          return <polyline key={s.key} points={points} fill="none" stroke={s.color} strokeWidth="2.25" />;
        })}

        {series.map((s) =>
          data.map((d, i) => (
            <circle
              key={`${s.key}-${i}`}
              cx={xAt(i)} cy={yAt(Number(d[s.key]) || 0)} r={hover === i ? 4.5 : 3}
              fill={s.color}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
          ))
        )}

        {hover !== null && (
          <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgba(22,21,26,0.15)" strokeWidth="1" />
        )}

        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={xAt(i)} y={height - 8} fontSize="10.5" textAnchor="middle" fill="rgba(22,21,26,0.45)" fontFamily="IBM Plex Mono, monospace">
              {formatX(d.x)}
            </text>
          ) : null
        )}
      </svg>

      {hover !== null && (
        <div className="pointer-events-none absolute top-1 rounded-lg border border-ink/10 bg-ink px-3 py-2 text-[11.5px] text-white shadow-lg" style={{ left: `${(xAt(hover) / width) * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-white/60">{formatX(data[hover].x)}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}: <strong>{formatValue(data[hover][s.key])}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple single-series bar chart. data: [{ x: label, y: number }]
export function BarChart({ data, height = 220, color = '#b8703e', formatValue = (v) => v, formatX = (v) => v }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-[13px] text-ink/40">No data for this window.</div>;
  }

  const width = 700;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const n = data.length;
  const maxVal = niceMax(Math.max(...data.map((d) => Number(d.y) || 0)));
  const gap = innerW / n * 0.28;
  const barW = innerW / n - gap;
  const labelEvery = Math.max(1, Math.ceil(n / 7));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke="rgba(22,21,26,0.07)" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const v = Number(d.y) || 0;
          const barH = (v / maxVal) * innerH;
          const x = PAD.left + i * (innerW / n) + gap / 2;
          const y = PAD.top + innerH - barH;
          return (
            <rect
              key={i} x={x} y={y} width={Math.max(1, barW)} height={Math.max(0, barH)}
              rx="2" fill={color} opacity={hover === i ? 1 : 0.85}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={PAD.left + i * (innerW / n) + (innerW / n) / 2} y={height - 8} fontSize="10.5" textAnchor="middle" fill="rgba(22,21,26,0.45)" fontFamily="IBM Plex Mono, monospace">
              {formatX(d.x)}
            </text>
          ) : null
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-1 rounded-lg border border-ink/10 bg-ink px-3 py-2 text-[11.5px] text-white shadow-lg" style={{ left: `${((PAD.left + hover * (innerW / n) + (innerW / n) / 2) / width) * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-white/60">{formatX(data[hover].x)}</div>
          <strong>{formatValue(data[hover].y)}</strong>
        </div>
      )}
    </div>
  );
}

// Stacked bar chart. data: [{ x: label, [seriesKey]: number, ... }]
// series: [{ key, label, color }]
export function StackedBarChart({ data, series, height = 220, formatValue = (v) => v, formatX = (v) => v }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length === 0 || series.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-[13px] text-ink/40">No data for this window.</div>;
  }

  const width = 700;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const n = data.length;
  const totals = data.map((d) => series.reduce((sum, s) => sum + (Number(d[s.key]) || 0), 0));
  const maxVal = niceMax(Math.max(...totals));
  const gap = innerW / n * 0.28;
  const barW = innerW / n - gap;
  const labelEvery = Math.max(1, Math.ceil(n / 7));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke="rgba(22,21,26,0.07)" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const x = PAD.left + i * (innerW / n) + gap / 2;
          let cursorY = PAD.top + innerH;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
              {series.map((s) => {
                const v = Number(d[s.key]) || 0;
                const segH = (v / maxVal) * innerH;
                cursorY -= segH;
                return (
                  <rect key={s.key} x={x} y={cursorY} width={Math.max(1, barW)} height={Math.max(0, segH)} fill={s.color} opacity={hover === i ? 1 : 0.9} />
                );
              })}
              <rect x={x} y={PAD.top} width={Math.max(1, barW)} height={innerH} fill="transparent" />
            </g>
          );
        })}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={PAD.left + i * (innerW / n) + (innerW / n) / 2} y={height - 8} fontSize="10.5" textAnchor="middle" fill="rgba(22,21,26,0.45)" fontFamily="IBM Plex Mono, monospace">
              {formatX(d.x)}
            </text>
          ) : null
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-1 rounded-lg border border-ink/10 bg-ink px-3 py-2 text-[11.5px] text-white shadow-lg" style={{ left: `${((PAD.left + hover * (innerW / n) + (innerW / n) / 2) / width) * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-white/60">{formatX(data[hover].x)}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}: <strong>{formatValue(data[hover][s.key])}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Small "up/down vs previous period" indicator.
export function DeltaBadge({ current, previous }) {
  if (previous === null || previous === undefined || previous === 0) {
    return <span className="text-[11px] text-ink/35">no prior period</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-semibold ${up ? 'text-sage' : 'text-rose'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% vs prior period
    </span>
  );
}