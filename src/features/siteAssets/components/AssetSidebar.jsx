import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PieChart, AlertTriangle, ArrowUpRight, Clock } from 'lucide-react';
import { Card, Badge } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { formatDate } from '../../../lib/utils';

// ─── Equipment Distribution Card ────────────────────────────

function DistributionCard({ assets }) {
  const { t } = useTranslation('siteAssets');

  const distribution = useMemo(() => {
    if (!assets?.length) return [];
    const map = new Map();
    for (const a of assets) {
      const name = a.equipment_name || '—';
      map.set(name, (map.get(name) || 0) + (a.quantity ?? 1));
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((sum, [, v]) => sum + v, 0);
    if (rest > 0) top5.push([t('sidebar.otherTypes'), rest]);
    return top5;
  }, [assets, t]);

  const total = distribution.reduce((sum, [, v]) => sum + v, 0);

  const barColors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-neutral-400',
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <PieChart className="w-4 h-4 text-blue-500" />
        <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
          {t('sidebar.distribution')}
        </h4>
      </div>

      {distribution.length === 0 ? (
        <p className="text-xs text-neutral-400">{t('sidebar.recentActivityEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {/* Stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            {distribution.map(([name, qty], i) => (
              <div
                key={name}
                className={cn('h-full', barColors[i] || barColors[barColors.length - 1])}
                style={{ width: `${(qty / total) * 100}%` }}
                title={`${name}: ${qty}`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {distribution.map(([name, qty], i) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full flex-shrink-0',
                      barColors[i] || barColors[barColors.length - 1]
                    )}
                  />
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                    {name}
                  </span>
                </div>
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums ml-2">
                  {qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Retrieval Queue Card ───────────────────────────────────

function RetrievalQueueCard({ assets }) {
  const { t } = useTranslation('siteAssets');
  const navigate = useNavigate();

  const queue = useMemo(() => {
    if (!assets?.length) return [];
    const siteMap = new Map();
    for (const a of assets) {
      if (a.subscription_status !== 'cancelled') continue;
      if (!siteMap.has(a.site_id)) {
        siteMap.set(a.site_id, {
          site_id: a.site_id,
          site_name: a.site_name,
          account_no: a.account_no,
          company_name: a.company_name,
          subscription_id: a.subscription_id,
          equipmentCount: 0,
        });
      }
      siteMap.get(a.site_id).equipmentCount += a.quantity ?? 1;
    }
    return [...siteMap.values()].sort((a, b) => b.equipmentCount - a.equipmentCount).slice(0, 5);
  }, [assets]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
            {t('sidebar.retrievalQueue')}
          </h4>
        </div>
        {queue.length > 0 && (
          <Badge variant="error" size="sm">
            {queue.length}
          </Badge>
        )}
      </div>

      {queue.length === 0 ? (
        <p className="text-xs text-neutral-400 italic">{t('sidebar.retrievalQueueEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {queue.map((site) => (
            <button
              key={site.site_id}
              type="button"
              onClick={() =>
                site.subscription_id
                  ? navigate(`/subscriptions/${site.subscription_id}`)
                  : null
              }
              className={cn(
                'w-full text-left p-3 rounded-lg border-l-4 border-red-500/50',
                'bg-neutral-50 dark:bg-neutral-800/50',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
              )}
            >
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {site.company_name}
                </p>
                {site.account_no && (
                  <span className="text-[10px] text-neutral-500 font-mono ml-2 flex-shrink-0">
                    {site.account_no}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-[10px] text-neutral-500">
                  {site.site_name}
                </span>
                <span className="text-[10px] font-bold text-red-500">
                  {t('sidebar.equipmentCount', { count: site.equipmentCount })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Recent Activity Card ───────────────────────────────────

function RecentActivityCard({ assets }) {
  const { t } = useTranslation('siteAssets');

  const recentItems = useMemo(() => {
    if (!assets?.length) return [];
    return [...assets]
      .filter((a) => a.installation_date)
      .sort((a, b) => b.installation_date.localeCompare(a.installation_date))
      .slice(0, 5);
  }, [assets]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-neutral-400" />
        <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
          {t('sidebar.recentActivity')}
        </h4>
      </div>

      {recentItems.length === 0 ? (
        <p className="text-xs text-neutral-400 italic">{t('sidebar.recentActivityEmpty')}</p>
      ) : (
        <div className="space-y-4 relative before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-200 dark:before:bg-neutral-700">
          {recentItems.map((item) => (
            <div key={item.id} className="relative pl-7">
              <div className="absolute left-0 top-0.5 h-[18px] w-[18px] rounded-full bg-white dark:bg-[#171717] border-2 border-blue-500 flex items-center justify-center">
                <ArrowUpRight className="w-2.5 h-2.5 text-blue-500" />
              </div>
              <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                {item.equipment_name} x{item.quantity ?? 1}
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {item.company_name} &middot; {formatDate(item.installation_date)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Main Sidebar ───────────────────────────────────────────

export function AssetSidebar({ assets, loading }) {
  if (loading) return null;

  return (
    <div className="space-y-6">
      <DistributionCard assets={assets} />
      <RetrievalQueueCard assets={assets} />
      <RecentActivityCard assets={assets} />
    </div>
  );
}
