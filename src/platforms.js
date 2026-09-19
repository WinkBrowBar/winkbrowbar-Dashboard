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
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CLIENT_TIME_ZONE });
}

export function toISODate(d) {
  return d.toISOString().slice(0, 10);
}