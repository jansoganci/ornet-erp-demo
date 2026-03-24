import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Building2, AlertTriangle, CalendarCheck } from 'lucide-react';
import { KpiCard } from '../../../components/ui/KpiCard';

/**
 * Compute KPI metrics from flat asset rows (site_assets_detail view).
 * All aggregation is client-side — no extra API call.
 */
function computeKpis(assets) {
  if (!assets?.length) return { totalQty: 0, siteCount: 0, cancelledSites: 0, recentQty: 0 };

  const siteSet = new Set();
  const cancelledSiteSet = new Set();
  let totalQty = 0;
  let recentQty = 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  for (const a of assets) {
    const qty = a.quantity ?? 1;
    totalQty += qty;
    siteSet.add(a.site_id);

    if (a.subscription_status === 'cancelled') {
      cancelledSiteSet.add(a.site_id);
    }

    if (a.installation_date && a.installation_date >= cutoff) {
      recentQty += qty;
    }
  }

  return {
    totalQty,
    siteCount: siteSet.size,
    cancelledSites: cancelledSiteSet.size,
    recentQty,
  };
}

export function AssetKpiStrip({ assets, loading }) {
  const { t } = useTranslation('siteAssets');
  const kpis = useMemo(() => computeKpis(assets), [assets]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title={t('kpi.totalAssets')}
        value={loading ? '—' : `${kpis.totalQty.toLocaleString('tr-TR')} ${t('kpi.unit')}`}
        icon={Package}
        variant="info"
        loading={loading}
      />
      <KpiCard
        title={t('kpi.sitesCovered')}
        value={loading ? '—' : `${kpis.siteCount} ${t('kpi.sites')}`}
        icon={Building2}
        variant="success"
        loading={loading}
      />
      <KpiCard
        title={t('kpi.cancelledSites')}
        value={loading ? '—' : `${kpis.cancelledSites} ${t('kpi.sites')}`}
        icon={AlertTriangle}
        variant={kpis.cancelledSites > 0 ? 'alert' : 'default'}
        hint={t('kpi.cancelledSitesHint')}
        loading={loading}
      />
      <KpiCard
        title={t('kpi.recentInstalls')}
        value={loading ? '—' : `${kpis.recentQty} ${t('kpi.unit')}`}
        icon={CalendarCheck}
        variant="default"
        hint={t('kpi.recentInstallsHint')}
        loading={loading}
      />
    </div>
  );
}
