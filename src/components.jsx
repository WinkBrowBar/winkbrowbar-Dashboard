import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { platformMeta, toISODate } from './platforms';

export function PlatformBadge({ platform }) {
  const meta = platformMeta(platform);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
      style={{ background: meta.soft, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
      <div className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-ink/50">{label}</div>
      <div className="font-display text-[22px] font-semibold leading-tight text-ink">{value}</div>
      {sub && <div className="mt-1 text-[11.5px] text-ink/45">{sub}</div>}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mb-2 font-display text-3xl text-ink/15">—</div>
      <p className="text-[13px] text-ink/45">{text}</p>
    </div>
  );
}

export function SkeletonLines({ count = 4 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-shimmer mb-2 h-3.5 rounded-md"
          style={{ width: `${100 - i * 8}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 5 }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-shimmer h-[70px] rounded-xl" />
      ))}
    </div>
  );
}

export function ErrorBanner({ children }) {
  return (
    <div className="mb-5 rounded-lg bg-rose-soft px-3.5 py-3 text-[13px] text-rose-900" style={{ color: '#7a3542' }}>
      {children}
    </div>
  );
}

// Quick-pill ranges + a real custom date-range picker.
// value: { days } or { startDate, endDate }
export function DateRangeFilter({ value, onChange, showAll = false }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(value.startDate || '');
  const [end, setEnd] = useState(value.endDate || '');

  const isCustom = Boolean(value.startDate || value.endDate);
  const isAll = Boolean(value.all);
  const presets = [7, 30, 90];

  function applyCustom(e) {
    e.preventDefault();
    if (!start && !end) return;
    onChange({ startDate: start || undefined, endDate: end || undefined });
    setOpen(false);
  }

  function pickPreset(d) {
    setStart('');
    setEnd('');
    onChange({ days: d });
    setOpen(false);
  }

  function pickAll() {
    setStart('');
    setEnd('');
    onChange({ all: true });
    setOpen(false);
  }

  const label = isCustom
    ? `${value.startDate || 'start'} → ${value.endDate || 'today'}`
    : `${value.days}D`;

  return (
    <div className="relative">
      <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-white p-1 shadow-card">
        {presets.map((d) => (
          <button
            key={d}
            onClick={() => pickPreset(d)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
              !isCustom && !isAll && Number(value.days) === d ? 'bg-ink text-copper' : 'text-ink/50 hover:text-ink'
            }`}
          >
            {d}D
          </button>
        ))}
        {showAll && (
          <button
            onClick={pickAll}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
              isAll ? 'bg-ink text-copper' : 'text-ink/50 hover:text-ink'
            }`}
          >
            All time
          </button>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
            isCustom ? 'bg-ink text-copper' : 'text-ink/50 hover:text-ink'
          }`}
        >
          {isCustom ? label : 'Custom'}
        </button>
      </div>

      {open && (
        <form
          onSubmit={applyCustom}
          className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-ink/10 bg-white p-4 shadow-lg"
        >
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-wide text-ink/50">Custom date range</div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink/60">From</label>
              <input
                type="date"
                value={start}
                max={end || toISODate(new Date())}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md border border-ink/15 px-2 py-1.5 text-[13px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink/60">To</label>
              <input
                type="date"
                value={end}
                min={start}
                max={toISODate(new Date())}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md border border-ink/15 px-2 py-1.5 text-[13px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-ink/50 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-ink px-3 py-1.5 text-[12px] font-semibold text-copper hover:brightness-110"
            >
              Apply
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Pill group for scoping a view to one location (or every location
// combined). `centers` is [{ id, name }]; value is a center `name` string
// or 'all'.
export function LocationFilter({ value, centers, onChange }) {
  const options = [{ name: 'all', label: 'All Locations' }, ...centers.map((c) => ({ name: c.name, label: c.name }))];
  return (
    <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-white p-1 shadow-card">
      {options.map((opt) => (
        <button
          key={opt.name}
          onClick={() => onChange(opt.name)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
            value === opt.name ? 'bg-ink text-copper' : 'text-ink/50 hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Small "i" icon that shows a definition on hover/focus/tap. Used next to
// table column headers so people can check what a field actually means
// without it turning into a heavy popup/modal.
//
// Renders via a portal into document.body with position: fixed, computed
// from the icon's real screen coordinates. This matters because these icons
// live inside table wrappers that scroll (overflow-x-auto), and any browser
// that gets an overflow-x value other than "visible" silently forces
// overflow-y to clip too - so a normal absolutely-positioned tooltip just
// gets cut off invisibly instead of floating above the table.
export function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // { top, left, placement }
  const btnRef = useRef(null);

  function computePosition() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const placement = rect.top > 90 ? 'top' : 'bottom';
    setPos({
      top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
      placement,
    });
  }

  function show() {
    computePosition();
    setOpen(true);
  }
  function hide() {
    setOpen(false);
  }

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          open ? hide() : show();
        }}
        onFocus={show}
        onBlur={hide}
        aria-label={text}
        className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border border-ink/25 text-[9px] font-bold normal-case tracking-normal text-ink/40 transition-colors hover:border-copper hover:text-copper"
      >
        i
      </button>
      {open && pos && createPortal(
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: `translate(-50%, ${pos.placement === 'top' ? '-100%' : '0'})`,
          }}
          className="pointer-events-none z-[100] w-52 rounded-lg border border-ink/10 bg-ink px-3 py-2 text-left font-sans text-[11.5px] font-normal normal-case leading-snug tracking-normal text-white shadow-lg"
        >
          {text}
          <span
            className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink"
            style={pos.placement === 'top' ? { bottom: -4 } : { top: -4 }}
          />
        </span>,
        document.body
      )}
    </span>
  );
}

// Pairs a header label with an InfoTooltip, keeping the two aligned and
// making sure a click on the icon doesn't bubble up to row/column sort
// handlers.
export function ThWithInfo({ label, info, align = 'left' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span>{label}</span>
      <InfoTooltip text={info} />
    </span>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0a7 7 0 10-9.9-9.9 7 7 0 009.9 9.9z" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-[220px] rounded-lg border border-ink/15 bg-white py-2 pl-9 pr-3 text-[13.5px] placeholder:text-ink/35 focus:border-copper focus:outline-none"
      />
    </div>
  );
}

// Compact week-stepper for chart headers - "go back one week" / "back to
// today". All charts on a page share one range, so this control is shared
// state (passed in as props) even though it's rendered inside each card;
// clicking it in any card header moves every chart in sync.
export function WeekNav({ weekOffset, onPrev, onNext, onReset }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onPrev}
        title="Previous week"
        className="rounded-md border border-ink/15 px-2 py-1 text-[11px] font-semibold text-ink/55 transition-colors hover:border-copper hover:text-copper"
      >
        ‹ Prev wk
      </button>
      {weekOffset > 0 && (
        <button
          onClick={onNext}
          title="Next week"
          className="rounded-md border border-ink/15 px-2 py-1 text-[11px] font-semibold text-ink/55 transition-colors hover:border-copper hover:text-copper"
        >
          Next wk ›
        </button>
      )}
      {weekOffset > 0 && (
        <button
          onClick={onReset}
          title="Back to today"
          className="rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-copper transition-colors hover:brightness-110"
        >
          Today
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
      <span className="font-mono text-[11px] text-ink/45">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-md border border-ink/15 px-3 py-1.5 text-[12px] font-semibold text-ink/70 hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="rounded-md border border-ink/15 px-3 py-1.5 text-[12px] font-semibold text-ink/70 hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
            {subtitle && <p className="mt-1 text-[12.5px] text-ink/50">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink/40 hover:bg-ink/5 hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}