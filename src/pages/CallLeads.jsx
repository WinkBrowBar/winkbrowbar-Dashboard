import { useState, useEffect } from 'react';
import { getCallLeadSheet, saveCallLeadSheet, syncCallLeadSheet, getCallLeads, getUser } from '../api';
import { ErrorBanner, EmptyState, SkeletonLines, SearchInput, Pagination } from '../components';

// Mirrors public/sample-call-leads.csv exactly - shown inline so someone can
// see the expected format without downloading the file first.
const SAMPLE_ROWS = [
  { callDate: '2026-10-15', phone: '+1 202-555-0171', callerName: 'Ava Miner' },
  { callDate: '2026-10-16', phone: '(202) 555-0133', callerName: 'Daniel Reyes' },
  { callDate: '2026-10-16', phone: '2025550199', callerName: 'Priya Shah' },
  { callDate: '2026-10-17', phone: '+1 2025550142', callerName: 'Cynthia Johnson' },
];

// Admin-only panel: paste the public Google Ads call-log sheet link once
// (File > Share > Anyone with the link can view), save it, and either wait
// for the hourly background sync or pull it on demand. Backend matches
// phone numbers from this sheet against customers to attribute a later
// invoice to "google" instead of "direct" - see conversionService.js /
// syncCallLeadsFromSheet.js on the backend.
export default function CallLeads() {
  const user = getUser();
  const isAdmin = user?.role === 'admin';

  const [url, setUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  // The imported rows themselves - visual confirmation of what actually
  // made it in, beyond the sync summary counts above.
  const [rows, setRows] = useState([]);
  const [rowsTotal, setRowsTotal] = useState(0);
  const [rowsPage, setRowsPage] = useState(1);
  const [rowsTotalPages, setRowsTotalPages] = useState(1);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsError, setRowsError] = useState('');
  const [rowsSearch, setRowsSearch] = useState('');

  const [showSample, setShowSample] = useState(false);

  async function loadRows(page = 1, search = rowsSearch) {
    setRowsLoading(true);
    setRowsError('');
    try {
      const data = await getCallLeads({ page, search });
      setRows(data.callLeads);
      setRowsTotal(data.total);
      setRowsPage(data.page);
      setRowsTotalPages(data.totalPages);
    } catch (err) {
      setRowsError(err.message);
    } finally {
      setRowsLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getCallLeadSheet();
      setSavedUrl(data.callLeadSheetUrl);
      setUrl(data.callLeadSheetUrl || '');
      setLastSyncAt(data.lastCallLeadSyncAt);
      setLastSyncResult(data.lastCallLeadSyncResult);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); loadRows(1, ''); }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const data = await saveCallLeadSheet(url.trim());
      setSavedUrl(data.callLeadSheetUrl);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncNow() {
    setSyncError('');
    setSyncing(true);
    try {
      const result = await syncCallLeadSheet();
      setLastSyncAt(new Date().toISOString());
      setLastSyncResult(result);
      await loadRows(1, rowsSearch); // refresh the visible rows with whatever just came in
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-ink/15 bg-white px-3 py-2.5 text-[14px] text-ink placeholder:text-ink/35 focus:border-copper focus:outline-none';

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Attribution</div>
          <h1 className="font-display text-[30px] font-bold tracking-tight text-ink">Call Leads</h1>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="font-display text-[17px] font-medium text-ink">Google Ads call-log sheet</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/60">
            Log every Google Ads call lead (Call Date, Phone Number, Caller Name columns) in a Google Sheet,
            share it <strong>File → Share → Anyone with the link → Viewer</strong>, and paste the link below.
            We check it every hour and match phone numbers against customers who later book or buy, so those
            sales show up as Google instead of Direct.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <a
              href="/sample-call-leads.csv"
              download
              className="text-[12.5px] font-semibold text-copper hover:underline"
            >
              Download a sample CSV with the exact columns/format expected
            </a>
            <button
              type="button"
              onClick={() => setShowSample((v) => !v)}
              className="text-[12.5px] font-semibold text-ink/60 hover:text-ink"
            >
              {showSample ? 'Hide preview ▲' : 'Preview the format ▼'}
            </button>
          </div>

          {showSample && (
            <div className="mt-3 overflow-x-auto rounded-md border border-ink/10">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-ink/10 bg-ink/[0.03] text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                    <th className="px-3 py-2">Call Date</th>
                    <th className="px-3 py-2">Phone Number</th>
                    <th className="px-3 py-2">Caller Name</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ROWS.map((r, i) => (
                    <tr key={i} className="border-b border-ink/10 last:border-none">
                      <td className="px-3 py-2 text-ink/70">{r.callDate}</td>
                      <td className="px-3 py-2 font-mono text-ink/70">{r.phone}</td>
                      <td className="px-3 py-2 font-medium text-ink">{r.callerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-ink/10 bg-ink/[0.02] px-3 py-2 text-[11.5px] text-ink/45">
                Phone formatting doesn't matter - only the digits are used to match. The header row is required; column order isn't.
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-[13px] text-ink/45">Loading…</div>
        ) : (
          <>
            {loadError && <div className="mb-4"><ErrorBanner>{loadError}</ErrorBanner></div>}

            {isAdmin ? (
              <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[320px] flex-1">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink/50">
                    Sheet link
                  </label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !url.trim()}
                  className="rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-bone transition-[filter] hover:brightness-125 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save link'}
                </button>
              </form>
            ) : (
              <div className="text-[13px] text-ink/60">
                {savedUrl ? <>Sheet link is set. Only an admin can change it.</> : <>No sheet link saved yet. Ask an admin to add one.</>}
              </div>
            )}
            {saveError && <div className="mt-4"><ErrorBanner>{saveError}</ErrorBanner></div>}
          </>
        )}
      </div>

      {savedUrl && (
        <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[17px] font-medium text-ink">Sync status</h2>
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="rounded-md border border-ink/15 px-4 py-2 text-[12.5px] font-semibold text-ink transition-colors hover:border-copper hover:text-copper disabled:opacity-60"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>

          {syncError && <div className="mb-4"><ErrorBanner>{syncError}</ErrorBanner></div>}

          <div className="text-[13px] text-ink/70">
            <div className="mb-2">
              <span className="text-ink/45">Last synced: </span>
              {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'never yet'}
            </div>

            {lastSyncResult && (
              lastSyncResult.error ? (
                <ErrorBanner>{lastSyncResult.error}</ErrorBanner>
              ) : (
                <div className="flex flex-wrap gap-4 font-mono text-[12.5px]">
                  <span><strong className="text-sage">{lastSyncResult.imported ?? 0}</strong> imported</span>
                  <span className="text-ink/50">{lastSyncResult.duplicates ?? 0} duplicates</span>
                  <span className="text-ink/50">{lastSyncResult.skippedBadPhone ?? 0} bad phone</span>
                  <span className="text-ink/50">{lastSyncResult.skippedBadDate ?? 0} bad date</span>
                  <span><strong className="text-sage">{lastSyncResult.matched ?? 0}</strong> sales marked Google Call{lastSyncResult.matchedInvoices?.length ? ` (${lastSyncResult.matchedInvoices.join(', ')})` : ''}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-medium text-ink">Imported call leads</h2>
          <div className="flex items-center gap-3">
            <SearchInput
              value={rowsSearch}
              onChange={(v) => { setRowsSearch(v); loadRows(1, v); }}
              placeholder="Search name or phone…"
            />
            <span className="whitespace-nowrap text-[12px] text-ink/45">{rowsTotal} total</span>
          </div>
        </div>

        {rowsError && <div className="mb-4"><ErrorBanner>{rowsError}</ErrorBanner></div>}

        {rowsLoading ? (
          <SkeletonLines count={5} />
        ) : rows.length === 0 ? (
          <EmptyState text={rowsSearch ? 'No call leads match your search.' : 'No call leads imported yet.'} />
        ) : (
          <>
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                  <th className="pb-2.5">Call date</th>
                  <th className="pb-2.5">Caller name</th>
                  <th className="pb-2.5">Phone</th>
                  <th className="pb-2.5">Imported</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-ink/10 last:border-none">
                    <td className="py-2.5 text-ink/70">{new Date(r.callDate).toLocaleDateString()}</td>
                    <td className="py-2.5 font-medium text-ink">{r.callerName || '—'}</td>
                    <td className="py-2.5 font-mono text-ink/70">{r.rawPhone || r.phone}</td>
                    <td className="py-2.5 text-ink/45">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={rowsPage} totalPages={rowsTotalPages} total={rowsTotal} onChange={(p) => loadRows(p, rowsSearch)} />
          </>
        )}
      </div>
    </>
  );
}