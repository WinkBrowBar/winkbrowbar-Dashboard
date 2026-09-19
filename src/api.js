const TOKEN_KEY = 'attr_dashboard_token';
const USER_KEY = 'attr_dashboard_user';
const BASE_KEY = 'attr_dashboard_base';

export function getBase() {
  return localStorage.getItem(BASE_KEY) || 'https://winkbrowbar-production2.up.railway.app';
    // return localStorage.getItem(BASE_KEY) || 'http://localhost:4000';

}
export function setBase(url) {
  localStorage.setItem(BASE_KEY, url.replace(/\/$/, ''));
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(baseUrl, email, password) {
  setBase(baseUrl);
  const res = await fetch(getBase() + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

async function authedFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(getBase() + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    clearSession();
    throw new Error('Session expired - please sign in again');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const apiGet = (path) => authedFetch(path);
export const apiPost = (path, body) => authedFetch(path, { method: 'POST', body: JSON.stringify(body) });
export const apiDelete = (path) => authedFetch(path, { method: 'DELETE' });

// Turns a { days } or { startDate, endDate } range object into a query string.
// If range is undefined/null entirely, returns an empty set of params - the
// caller explicitly wants no date restriction (e.g. Customers.jsx with its
// date filter toggled off). Only defaults to days=30 when a range object
// was passed but didn't specify anything usable.
export function rangeParams(range) {
  const p = new URLSearchParams();
  if (range === undefined || range === null) {
    return p;
  }
  if (range?.all) {
    return p;
  }
  if (range?.startDate || range?.endDate) {
    if (range.startDate) p.set('startDate', range.startDate);
    if (range.endDate) p.set('endDate', range.endDate);
  } else {
    p.set('days', range?.days ?? 30);
  }
  return p;
}

// Team / user management (admin only - backend enforces this too)
export const listUsers = () => apiGet('/api/auth/users');
export const createUser = (payload) => apiPost('/api/auth/users', payload);
export const deactivateUser = (id) => apiDelete(`/api/auth/users/${id}`);

// Dashboard data
export const getSummary = (range) => apiGet(`/api/dashboard/summary?${rangeParams(range)}`);

// location: omit / 'all' for every location, a center name (e.g. 'Cobble
// Hill') to scope to one, or '(unknown location)' for invoices with no
// matched center.
export function getCampaigns(range, location) {
  const p = rangeParams(range);
  if (location && location !== 'all') p.set('location', location);
  return apiGet(`/api/dashboard/campaigns?${p}`);
}
export const getLocations = (range) => apiGet(`/api/dashboard/locations?${rangeParams(range)}`);

export function getTransactions({ range, page = 1, limit = 25, search = '', platform = 'all', location = 'all' } = {}) {
  const p = rangeParams(range);
  p.set('page', page);
  p.set('limit', limit);
  if (search) p.set('search', search);
  if (platform && platform !== 'all') p.set('platform', platform);
  if (location && location !== 'all') p.set('location', location);
  return apiGet(`/api/dashboard/transactions?${p}`);
}
export const getCac = (range) => apiGet(`/api/dashboard/cac?${rangeParams(range)}`);
export function getRecentPurchases(limit = 10, location) {
  const p = new URLSearchParams();
  p.set('limit', limit);
  if (location && location !== 'all') p.set('location', location);
  return apiGet(`/api/dashboard/recent-purchases?${p}`);
}

// Static catalog of known centers, e.g. [{ id, name }], independent of any
// date range - for populating a location picker.
export const getCenterList = () => apiGet('/api/dashboard/center-list');

// Single-location rollup (revenue, invoices, AOV, revenue-by-platform,
// recent purchases). location omitted/'all' scopes to every location
// combined (still invoice-rooted, unlike getSummary).
export function getLocationReport(range, location) {
  const p = rangeParams(range);
  if (location && location !== 'all') p.set('location', location);
  return apiGet(`/api/dashboard/location-report?${p}`);
}

// Refund invoices (Invoice.isRefund: true) with the customer who was
// refunded. Same range/location params as getLocationReport.
export function getRefunds(range, location) {
  const p = rangeParams(range);
  if (location && location !== 'all') p.set('location', location);
  return apiGet(`/api/dashboard/refunds?${p}`);
}

// Time-bucketed series for charts (revenue/invoices/newCustomers per
// bucket, plus revenue-by-platform per bucket). Bucket width is chosen
// server-side based on range length.
export function getTrend(range, location) {
  const p = rangeParams(range);
  if (location && location !== 'all') p.set('location', location);
  return apiGet(`/api/dashboard/trend?${p}`);
}

// Given a { days } / { startDate, endDate } / { all } range, returns the
// immediately-preceding range of the same length, for "vs prior period"
// comparisons. Returns null when there's no sensible prior period (all-time).
export function previousRange(range) {
  if (!range || range.all) return null;
  if (range.startDate || range.endDate) {
    const end = range.endDate ? new Date(range.endDate) : new Date();
    const start = range.startDate ? new Date(range.startDate) : new Date(0);
    const lengthMs = end - start;
    if (!(lengthMs > 0)) return null;
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - lengthMs);
    return { startDate: toISODateStr(prevStart), endDate: toISODateStr(prevEnd) };
  }
  const days = Number(range.days) || 30;
  const prevEnd = new Date();
  prevEnd.setDate(prevEnd.getDate() - days - 1);
  const prevStart = new Date();
  prevStart.setDate(prevStart.getDate() - days * 2);
  return { startDate: toISODateStr(prevStart), endDate: toISODateStr(prevEnd) };
}

function toISODateStr(d) {
  return d.toISOString().slice(0, 10);
}

// sortBy: 'recent' (default, most recent purchase first) or 'revenue'
// (highest lifetime revenue first).
export function getCustomers({ range, page = 1, limit = 20, search = '', sortBy = 'recent' } = {}) {
  const p = rangeParams(range);
  p.set('page', page);
  p.set('limit', limit);
  if (search) p.set('search', search);
  if (sortBy) p.set('sortBy', sortBy);
  return apiGet(`/api/dashboard/customers?${p}`);
}

export function getCampaignCustomers({ platform, campaign, range, page = 1, limit = 20, search = '' }) {
  const p = rangeParams(range);
  p.set('platform', platform);
  p.set('campaign', campaign);
  p.set('page', page);
  p.set('limit', limit);
  if (search) p.set('search', search);
  return apiGet(`/api/dashboard/campaigns/customers?${p}`);
}