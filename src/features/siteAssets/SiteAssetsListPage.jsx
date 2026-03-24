import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HardDrive,
  ExternalLink,
  AlertTriangle,
  Upload,
  ArrowLeft,
  Plus,
  Search,
  Camera,
  Bell,
  CreditCard,
  Cpu,
  Calendar,
  ChevronRight,
  ChevronDown,
  MapPin,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import { differenceInMonths } from 'date-fns';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { PageContainer, PageHeader } from '../../components/layout';
import {
  Card,
  Table,
  ErrorState,
  Badge,
  SearchInput,
  Select,
  Button,
  Skeleton,
} from '../../components/ui';
import { cn } from '../../lib/utils';
import { formatDate } from '../../lib/utils';
import { AddAssetModal } from './components/AddAssetModal';
import { AssetKpiStrip } from './components/AssetKpiStrip';
import { AssetSidebar } from './components/AssetSidebar';
import { useAssets } from './hooks';

const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled', 'none'];

// ─── Device age helpers ─────────────────────────────────────

function getDeviceAge(installationDate) {
  if (!installationDate) return null;
  return differenceInMonths(new Date(), new Date(installationDate));
}

function DeviceAgeBadge({ months, t }) {
  if (months === null || months === undefined) return <span className="text-neutral-400">—</span>;

  let label;
  let variant;

  if (months < 6) {
    label = t('age.new');
    variant = 'success';
  } else if (months < 12) {
    label = t('age.months', { count: months });
    variant = 'default';
  } else if (months < 24) {
    const years = Math.floor(months / 12);
    const remaining = months % 12;
    label = remaining > 0 ? `${years}y ${remaining}m` : t('age.years', { count: years });
    variant = 'warning';
  } else {
    const years = Math.floor(months / 12);
    label = t('age.years', { count: years });
    variant = 'error';
  }

  return <Badge variant={variant} size="sm">{label}</Badge>;
}

// ─── Row border color by subscription status ────────────────

const STATUS_BORDER = {
  active: 'border-l-4 border-l-green-500',
  paused: 'border-l-4 border-l-amber-500',
  cancelled: 'border-l-4 border-l-red-500',
};
const STATUS_BORDER_DEFAULT = 'border-l-4 border-l-neutral-200 dark:border-l-neutral-700';

// ─── Equipment icon mapping ─────────────────────────────────

const EQUIPMENT_ICONS = {
  kamera: Camera,
  camera: Camera,
  alarm: Bell,
  'alarm panel': Bell,
  'alarm paneli': Bell,
  dvr: Cpu,
  nvr: Cpu,
  'kartlı geçiş': CreditCard,
  'geçiş': CreditCard,
};

function getEquipmentIcon(name) {
  if (!name) return HardDrive;
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(EQUIPMENT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return HardDrive;
}

// ─── Group assets by site ───────────────────────────────────

function groupAssetsBySite(assets) {
  const bySite = new Map();
  for (const a of assets || []) {
    const key = a.site_id;
    if (!bySite.has(key)) {
      bySite.set(key, {
        site_id: a.site_id,
        site_name: a.site_name,
        account_no: a.account_no,
        company_name: a.company_name,
        customer_id: a.customer_id,
        subscription_id: a.subscription_id,
        subscription_status: a.subscription_status,
        equipment: [],
        earliest_installation_date: a.installation_date,
      });
    }
    const row = bySite.get(key);
    row.equipment.push({
      name: a.equipment_name,
      quantity: a.quantity,
      installation_date: a.installation_date,
    });
    if (
      a.installation_date &&
      (!row.earliest_installation_date || a.installation_date < row.earliest_installation_date)
    ) {
      row.earliest_installation_date = a.installation_date;
    }
  }
  return Array.from(bySite.values());
}

// ─── Device age label for mobile cards ──────────────────────

function formatDeviceAgeLabel(months, t) {
  if (months === null || months === undefined) return '';
  if (months < 12) return t('age.months', { count: months });
  const years = Math.floor(months / 12);
  return t('age.years', { count: years });
}

// ─── Page Component ─────────────────────────────────────────

export function SiteAssetsListPage() {
  const { t } = useTranslation(['siteAssets', 'common']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const searchFromUrl = searchParams.get('search') || '';
  const [localSearch, setLocalSearch] = useState(searchFromUrl);
  const debouncedSearch = useDebouncedValue(localSearch, 300);
  const statusFilter = searchParams.get('status') || '';

  useEffect(() => {
    setLocalSearch(searchFromUrl);
  }, [searchFromUrl]);

  useEffect(() => {
    if (searchFromUrl === debouncedSearch) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set('search', debouncedSearch);
      else next.delete('search');
      return next;
    });
  }, [debouncedSearch, searchFromUrl, setSearchParams]);

  const effectiveFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      subscription_status: statusFilter || undefined,
    }),
    [debouncedSearch, statusFilter]
  );

  const { data: assets, isLoading, error } = useAssets(effectiveFilters);
  const groupedRows = useMemo(() => groupAssetsBySite(assets), [assets]);

  // Mobile KPI computation
  const mobileKpis = useMemo(() => {
    if (!assets?.length) return { siteCount: 0, activeSites: 0, cancelledSites: 0, totalQty: 0 };
    const siteSet = new Set();
    const activeSiteSet = new Set();
    const cancelledSiteSet = new Set();
    let totalQty = 0;
    for (const a of assets) {
      siteSet.add(a.site_id);
      totalQty += a.quantity ?? 1;
      if (a.subscription_status === 'active') activeSiteSet.add(a.site_id);
      if (a.subscription_status === 'cancelled') cancelledSiteSet.add(a.site_id);
    }
    return {
      siteCount: siteSet.size,
      activeSites: activeSiteSet.size,
      cancelledSites: cancelledSiteSet.size,
      totalQty,
    };
  }, [assets]);

  // Recent activity for collapsible section
  const recentActivity = useMemo(() => {
    if (!assets?.length) return [];
    return [...assets]
      .filter((a) => a.installation_date)
      .sort((a, b) => b.installation_date.localeCompare(a.installation_date))
      .slice(0, 3);
  }, [assets]);

  const statusOptions = [
    { value: '', label: t('siteAssets:filters.allStatuses') },
    ...SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: t(`siteAssets:subscriptionStatus.${s}`) })),
  ];

  const handleFilterChange = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== '') next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const columns = [
    {
      key: 'customer',
      header: t('siteAssets:fields.customer'),
      render: (_, row) => (
        <div>
          <p className="font-bold text-sm text-neutral-900 dark:text-neutral-50 truncate max-w-[200px]">
            {row.company_name || '-'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[120px]">
              {row.site_name || '-'}
            </span>
            {row.account_no && (
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                {row.account_no}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'equipment',
      header: t('siteAssets:fields.equipmentList'),
      render: (_, row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.equipment.map((e, i) => (
            <Badge key={i} variant="info" size="sm">
              {e.name}: {e.quantity}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'installation_date',
      header: t('siteAssets:fields.installationDate'),
      className: 'hidden md:table-cell',
      render: (_, row) => {
        const months = getDeviceAge(row.earliest_installation_date);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {row.earliest_installation_date ? formatDate(row.earliest_installation_date) : '-'}
            </span>
            <DeviceAgeBadge months={months} t={t} />
          </div>
        );
      },
    },
    {
      key: 'subscription_status',
      header: t('siteAssets:fields.subscriptionStatus'),
      render: (_, row) => {
        const status = row.subscription_status || 'none';
        const isCancelled = status === 'cancelled';
        return (
          <div className="flex flex-col gap-1">
            <Badge
              variant={
                isCancelled
                  ? 'error'
                  : status === 'active'
                    ? 'success'
                    : status === 'paused'
                      ? 'warning'
                      : 'default'
              }
              size="sm"
            >
              {t(`siteAssets:subscriptionStatus.${status}`)}
            </Badge>
            {isCancelled && (
              <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {t('siteAssets:alert.deviceRetrieval')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (_, row) =>
        row.subscription_id ? (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ExternalLink className="w-4 h-4" />}
            onClick={() => navigate(`/subscriptions/${row.subscription_id}`)}
          >
            {t('siteAssets:actions.viewSubscription')}
          </Button>
        ) : (
          <span className="text-xs text-neutral-400">—</span>
        ),
    },
  ];

  const rowClassName = (row) => {
    const status = row.subscription_status || 'none';
    return STATUS_BORDER[status] || STATUS_BORDER_DEFAULT;
  };

  if (error) {
    return (
      <PageContainer maxWidth="full">
        <ErrorState message={t('common:errors.loadFailed')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full" className="space-y-6">
      {/* ======= MOBILE HEADER — md:hidden ======= */}
      <div className="md:hidden sticky top-0 z-30 -mx-4 -mt-6 px-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-[#262626]">
        <div className="flex items-center justify-between h-14">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-xl text-neutral-600 dark:text-neutral-400 active:scale-95 transition-transform"
            aria-label={t('common:actions.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
            {t('siteAssets:title')}
          </h1>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center w-10 h-10 -mr-2 rounded-xl text-primary-600 dark:text-primary-400 active:scale-95 transition-transform"
            aria-label={t('siteAssets:addButton')}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ======= MOBILE SEARCH — md:hidden ======= */}
      <div className="md:hidden">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t('siteAssets:filters.search')}
            className="w-full h-12 pl-11 pr-4 rounded-xl border-none bg-neutral-100 dark:bg-[#1f1f1f] text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm focus:ring-1 focus:ring-primary-500 transition-all"
          />
        </div>
      </div>

      {/* ======= MOBILE FILTER CHIPS — md:hidden ======= */}
      <div className="md:hidden flex overflow-x-auto scrollbar-hide -mx-4 px-4 gap-2">
        {[
          { label: t('siteAssets:filters.allStatuses'), value: '', isActive: !statusFilter },
          { label: t('siteAssets:subscriptionStatus.active'), value: 'active', isActive: statusFilter === 'active' },
          { label: t('siteAssets:subscriptionStatus.paused'), value: 'paused', isActive: statusFilter === 'paused' },
          { label: t('siteAssets:subscriptionStatus.cancelled'), value: 'cancelled', isActive: statusFilter === 'cancelled' },
          { label: t('siteAssets:filters.retrievalNeeded'), value: 'cancelled', isActive: false },
        ].map((chip, idx) => (
          <button
            key={`${chip.value}-${idx}`}
            type="button"
            onClick={() => handleFilterChange('status', chip.value)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all active:scale-95',
              chip.isActive
                ? 'bg-primary-600 text-white dark:bg-primary-500'
                : 'bg-neutral-100 dark:bg-[#262626] text-neutral-600 dark:text-neutral-400'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ======= MOBILE KPI STRIP — md:hidden ======= */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[90px] w-full rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-400">
                {t('siteAssets:kpi.sitesCovered')}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {mobileKpis.siteCount.toLocaleString('tr-TR')}
                </span>
                <MapPin className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-400">
                {t('siteAssets:kpi.activeSubscriptions')}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold tracking-tight text-primary-600 dark:text-primary-400">
                  {mobileKpis.activeSites.toLocaleString('tr-TR')}
                </span>
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-400">
                {t('siteAssets:kpi.cancelledSites')}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold tracking-tight text-error-600 dark:text-error-400">
                  {mobileKpis.cancelledSites}
                </span>
                <AlertTriangle className="w-3.5 h-3.5 text-error-500" />
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-400">
                {t('siteAssets:kpi.totalDevices')}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {mobileKpis.totalQty.toLocaleString('tr-TR')}
                </span>
                <HardDrive className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ======= MOBILE CARD LIST — md:hidden ======= */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))
        ) : groupedRows.length === 0 ? (
          <div className="py-12 text-center">
            <HardDrive className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('siteAssets:empty.title')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                {t('siteAssets:mobile.assetList')} ({groupedRows.length})
              </h3>
            </div>

            {groupedRows.map((row) => {
              const status = row.subscription_status || 'none';
              const isCancelled = status === 'cancelled';
              const hasEquipment = row.equipment.length > 0;
              const needsRetrieval = isCancelled && hasEquipment;
              const months = getDeviceAge(row.earliest_installation_date);
              const visibleEquipment = row.equipment.slice(0, 3);
              const overflowCount = row.equipment.length - 3;

              return (
                <button
                  key={row.site_id}
                  type="button"
                  onClick={() => row.subscription_id ? navigate(`/subscriptions/${row.subscription_id}`) : undefined}
                  className={cn(
                    'w-full text-left rounded-xl overflow-hidden transition-all active:scale-[0.98] duration-150',
                    'bg-white dark:bg-[#171717] shadow-sm',
                    status === 'active' && 'border border-green-500/20',
                    status === 'paused' && 'border border-amber-500/20',
                    needsRetrieval && 'border border-error-500/20 opacity-80',
                    isCancelled && !needsRetrieval && 'border border-neutral-200 dark:border-neutral-700 opacity-70',
                    !isCancelled && status !== 'active' && status !== 'paused' && 'border border-neutral-200/80 dark:border-[#262626]',
                    row.subscription_id && 'cursor-pointer',
                  )}
                >
                  {/* Alert banner for retrieval needed */}
                  {needsRetrieval && (
                    <div className="bg-error-50 dark:bg-error-950/20 px-4 py-2 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-error-600 dark:text-error-400 shrink-0" />
                      <span className="text-[10px] font-black text-error-600 dark:text-error-400 uppercase tracking-widest">
                        {t('siteAssets:alert.deviceRetrieval')}
                      </span>
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    {/* Header: customer + status badge */}
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 mr-3">
                        <h3 className="font-bold text-base leading-tight text-neutral-900 dark:text-neutral-50 truncate">
                          {row.company_name || '-'}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                          {row.site_name || '-'}
                        </p>
                      </div>
                      <Badge
                        variant={
                          isCancelled ? 'error'
                            : status === 'active' ? 'success'
                              : status === 'paused' ? 'warning'
                                : 'default'
                        }
                        size="sm"
                      >
                        {t(`siteAssets:subscriptionStatus.${status}`)}
                      </Badge>
                    </div>

                    {/* Account number pill */}
                    {row.account_no && (
                      <div>
                        <span className="inline-block bg-neutral-100 dark:bg-[#262626] font-mono text-[11px] px-2.5 py-1 rounded text-primary-600 dark:text-primary-400 border border-neutral-200/60 dark:border-neutral-700/50">
                          {row.account_no}
                        </span>
                      </div>
                    )}

                    {/* Equipment badges */}
                    {hasEquipment && (
                      <div className="flex flex-wrap gap-1.5">
                        {visibleEquipment.map((e, i) => {
                          const EqIcon = getEquipmentIcon(e.name);
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 bg-neutral-50 dark:bg-[#1f1f1f] px-2 py-1 rounded-lg text-[10px] font-medium text-neutral-700 dark:text-neutral-300"
                            >
                              <EqIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                              {e.name}: {e.quantity}
                            </span>
                          );
                        })}
                        {overflowCount > 0 && (
                          <span className="inline-flex items-center bg-neutral-50 dark:bg-[#1f1f1f] px-2 py-1 rounded-lg text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                            {t('siteAssets:mobile.moreEquipment', { count: overflowCount })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="bg-neutral-50 dark:bg-[#141414] px-4 py-3 flex justify-between items-center">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {row.earliest_installation_date
                        ? `${formatDate(row.earliest_installation_date)} (${formatDeviceAgeLabel(months, t)})`
                        : '—'}
                    </span>
                    {row.subscription_id && (
                      <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* Collapsible Özet & Aktivite */}
        {!isLoading && (
          <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] overflow-hidden shadow-sm mt-4">
            <button
              type="button"
              onClick={() => setSummaryOpen((v) => !v)}
              className="w-full flex items-center justify-between p-4 active:bg-neutral-50 dark:active:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                    {t('siteAssets:mobile.summaryTitle')}
                  </h4>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {t('siteAssets:mobile.summarySubtitle')}
                  </p>
                </div>
              </div>
              <ChevronDown className={cn(
                'w-5 h-5 text-neutral-400 transition-transform duration-200',
                summaryOpen && 'rotate-180'
              )} />
            </button>
            {summaryOpen && (
              <div className="px-5 pb-5 space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                {recentActivity.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">{t('siteAssets:sidebar.recentActivityEmpty')}</p>
                ) : (
                  recentActivity.map((item, idx) => (
                    <div key={item.id || idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-1.5',
                          item.subscription_status === 'cancelled' ? 'bg-error-500' : 'bg-primary-500'
                        )} />
                        {idx < recentActivity.length - 1 && (
                          <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-700 mt-1 min-h-[24px]" />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-0.5">
                          {formatDate(item.installation_date)} · {item.company_name}
                        </p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {item.equipment_name} x{item.quantity ?? 1}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======= DESKTOP LAYOUT — hidden md:block ======= */}
      <div className="hidden md:block space-y-6">
        <PageHeader
          title={t('siteAssets:title')}
          description={t('siteAssets:subtitle')}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                leftIcon={<Upload className="w-4 h-4" />}
                onClick={() => navigate('/equipment/import')}
              >
                {t('common:import.bulkImportButton')}
              </Button>
              <Button
                variant="primary"
                leftIcon={<HardDrive className="w-4 h-4" />}
                onClick={() => setShowAddModal(true)}
              >
                {t('siteAssets:addButton')}
              </Button>
            </div>
          }
        />

        {/* KPI Strip */}
        <AssetKpiStrip assets={assets} loading={isLoading} />

        {/* 12-col grid: Table (8) + Sidebar (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Filters + Table */}
          <div className="lg:col-span-8 space-y-4">
            {/* Filters */}
            <Card className="p-3 border-neutral-200/60 dark:border-neutral-800/60">
              <div className="flex flex-col lg:flex-row items-end gap-3">
                <div className="flex-1 min-w-[200px] w-full">
                  <SearchInput
                    placeholder={t('siteAssets:filters.search')}
                    value={localSearch}
                    onChange={(v) => setLocalSearch(v ?? '')}
                    size="sm"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Select
                    label={t('siteAssets:filters.subscriptionStatus')}
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    size="sm"
                  />
                </div>
              </div>
            </Card>

            {/* Table */}
            <div className="bg-white dark:bg-[#171717] rounded-2xl border border-neutral-200 dark:border-[#262626] overflow-hidden shadow-sm">
              <Table
                columns={columns}
                data={groupedRows}
                loading={isLoading}
                emptyMessage={t('siteAssets:empty.title')}
                rowClassName={rowClassName}
              />
              {!isLoading && groupedRows.length > 0 && (
                <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {groupedRows.length} {t('siteAssets:section.sites')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="lg:col-span-4">
            <AssetSidebar assets={assets} loading={isLoading} />
          </div>
        </div>
      </div>

      <AddAssetModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </PageContainer>
  );
}
