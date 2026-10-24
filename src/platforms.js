// Every platform/fallback color below was tuned as a dark tone for text on
// a light card (meta.color as text, meta.soft as a near-white background).
// On the dark theme that's inverted - a light pastel "soft" square reads as
// a washed-out glow, and a mid-dark meta.color as text is low-contrast
// against a near-black panel. These two helpers derive a dark-mode-safe
// chip (a low-alpha tint of the real color behind a lightened version of
// it as text) from the same source colors, so every call site that still
// passes meta.soft/meta.color for a LIGHT background (none currently do)
// keeps working, while PlatformBadge uses chipColors() instead.
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 255, g: 255, b: 255 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
export function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
// Blends a hex color toward white by `amount` (0-1) so it stays legible as
// text on a near-black background instead of reading as a dim mid-gray.
export function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
// Dark-mode chip colors for a platform: a faint tint of its real color as
// the background, and a lightened version of it as the text/dot color.
export function chipColors(meta) {
  return { bg: hexToRgba(meta.color, 0.16), text: lighten(meta.color, 0.35) };
}

export const PLATFORMS = {
  meta: { label: 'Meta', color: '#5b6472', soft: '#e5e8ec' },
  google: { label: 'Google', color: '#a85c3b', soft: '#f0ddd3' },
  awin: { label: 'AWIN', color: '#6e7f63', soft: '#e3e8df' },
  klaviyo: { label: 'Klaviyo', color: '#b5677a', soft: '#f3e1e5' },
  unattributed: { label: 'Unattributed', color: '#c9c4bb', soft: '#eeeae2' },
  direct: { label: 'Direct', color: '#3f6d74', soft: '#dbe7e8' },
};

// Fallback palette for platform values that show up in the data but aren't
// in PLATFORMS above (e.g. test/staging values like "test", or a new
// integration that hasn't been given a proper entry yet). Every such key
// used to collapse onto the same hardcoded indigo, which made a
// multi-platform chart look like one dominant color hiding everything
// behind it. Hashing the key into this palette keeps colors deterministic
// (the same unknown platform always gets the same color) while making
// distinct unknown platforms actually look distinct from each other.
const FALLBACK_PALETTE = [
  { color: '#5a5fa8', soft: '#e4e4f2' }, // indigo
  { color: '#b8703e', soft: '#f1e2d3' }, // copper
  { color: '#7a8a4f', soft: '#e6ebd9' }, // olive
  { color: '#8a5a8f', soft: '#eee0ef' }, // plum
  { color: '#3d7a9e', soft: '#dcebf1' }, // steel blue
  { color: '#a35b7a', soft: '#f0dfe6' }, // mauve
];

function hashKey(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function platformMeta(key) {
  if (PLATFORMS[key]) return { label: PLATFORMS[key].label, ...PLATFORMS[key] };
  const fallback = FALLBACK_PALETTE[hashKey(String(key)) % FALLBACK_PALETTE.length];
  return { label: key, ...fallback };
}

export function money(n) {
  return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CLIENT_TIME_ZONE = 'America/New_York';

export function shortDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: CLIENT_TIME_ZONE });
}

export function shortDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CLIENT_TIME_ZONE });
}

export function toISODate(d) {
  return d.toISOString().slice(0, 10);
}