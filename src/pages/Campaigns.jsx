import { useState, useEffect, useCallback } from 'react';
import { getCampaigns } from '../api';
import { PlatformBadge, EmptyState, SkeletonLines, ErrorBanner, DateRangeFilter, ThWithInfo } from '../components';
import { money, platformMeta } from '../platforms';
import CampaignDrilldown from '../CampaignDrilldown';

export default function Campaigns() {
  const [range, setRange] = useState({ days: 30 });
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { campaign, platform }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCampaigns(range);
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  // Only real ad campaigns (Meta/Google/AWIN) get ranked against each other.
  // Direct (walk-ins/untracked) and Klaviyo (fires on every purchase
  // regardless of source) aren't acquisition channels - mixing them in here
  // was both drowning out real campaign performance and, due to a filter
  // bug (`c.platform` instead of `c._id.platform`), silently double-counting
  // Klaviyo into the page total.
  const adCampaigns = campaigns.filter((c) => c._id.platform !== 'direct' && c._id.platform !== 'klaviyo');
  const directCampaigns = campaigns.filter((c) => c._id.platform === 'direct');
  const klaviyoCampaigns = campaigns.filter((c) => c._id.platform === 'klaviyo');
  const directRevenue = directCampaigns.reduce((sum, c) => sum + c.revenue, 0);
  const klaviyoRevenue = klaviyoCampaigns.reduce((sum, c) => sum + c.revenue, 0);

  const total = adCampaigns.reduce((sum, c) => sum + c.revenue, 0);
  const maxRevenue = Math.max(1, ...adCampaigns.map((c) => c.revenue));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Attribution</div>
          <h1 className="font-display text-[30px] font-medium text-ink">Campaigns</h1>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[17px] font-medium text-ink">Every ad, ranked by revenue</h2>
          <span className="text-[12px] text-ink/45">
            {adCampaigns.length} campaign{adCampaigns.length === 1 ? '' : 's'} · {money(total)} total
          </span>
        </div>

        {loading ? (
          <SkeletonLines count={6} />
        ) : adCampaigns.length === 0 ? (
          <EmptyState text="No campaign-attributed conversions in this window yet. Once a tracked ad click leads to a paid booking with a utm_campaign value, it'll appear here." />
        ) : (
          <>
            <p className="mb-3 text-[12px] text-ink/40">Click a row to see exactly who it brought in.</p>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                    <th className="pb-2.5">
                      <ThWithInfo label="Campaign" info="The utm_campaign value captured on the visit that led to the purchase. Rows with no utm_campaign are grouped under (no campaign)." />
                    </th>
                    <th className="pb-2.5">
                      <ThWithInfo label="Platform" info="Which ad platform (Meta, Google, AWIN) the click was attributed to." />
                    </th>
                    <th className="pb-2.5 text-right">
                      <ThWithInfo label="Conversions" info="Total number of paid bookings attributed to this campaign in the selected date range." align="right" />
                    </th>
                    <th className="pb-2.5 text-right">
                      <ThWithInfo label="Customers" info="Number of distinct customers who converted through this campaign." align="right" />
                    </th>
                    <th className="pb-2.5 text-right">
                      <ThWithInfo label="Avg Order" info="Revenue divided by conversions - the average amount spent per booking attributed to this campaign." align="right" />
                    </th>
                    <th className="pb-2.5 text-right">
                      <ThWithInfo label="Revenue" info="Total amount spent across every purchase attributed to this campaign in the selected range." align="right" />
                    </th>
                    <th className="pb-2.5 text-right">
                      <ThWithInfo label="Share" info="This campaign's revenue as a percentage of total ad-attributed revenue across all campaigns shown." align="right" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {adCampaigns.map((c, i) => {
                    const meta = platformMeta(c._id.platform);
                    const share = total ? (c.revenue / total) * 100 : 0;
                    return (
                      <tr
                        key={i}
                        onClick={() => setSelected({ campaign: c._id.campaign, platform: c._id.platform })}
                        className="cursor-pointer border-b border-ink/10 transition-colors last:border-none hover:bg-ink/[0.03]"
                      >
                        <td className="py-2.5 font-medium text-ink">{c._id.campaign}</td>
                        <td className="py-2.5"><PlatformBadge platform={c._id.platform} /></td>
                        <td className="py-2.5 text-right font-mono">{c.conversions}</td>
                        <td className="py-2.5 text-right font-mono">{c.customerCount ?? '—'}</td>
                        <td className="py-2.5 text-right font-mono">{money(c.avgOrderValue)}</td>
                        <td className="py-2.5 text-right font-mono">{money(c.revenue)}</td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/10">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${(c.revenue / maxRevenue) * 100}%`, background: meta.color }}
                              />
                            </div>
                            <span className="w-10 text-right font-mono">{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(directCampaigns.length > 0 || klaviyoCampaigns.length > 0) && (
              <div className="mt-4 space-y-2 border-t border-dashed border-ink/10 pt-4 text-[12.5px]">
                {directCampaigns.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div>
                      <PlatformBadge platform="direct" />
                      <span className="ml-2 text-ink/50">walk-ins & untracked — not a campaign</span>
                    </div>
                    <span className="font-mono text-ink/60">{money(directRevenue)}</span>
                  </div>
                )}
                {klaviyoCampaigns.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div>
                      <PlatformBadge platform="klaviyo" />
                      <span className="ml-2 text-ink/50">synced for email/CRM — overlaps with rows above</span>
                    </div>
                    <span className="font-mono text-ink/60">{money(klaviyoRevenue)}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <CampaignDrilldown
          campaign={selected.campaign}
          platform={selected.platform}
          range={range}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}