import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { Plus, Download, Filter, Edit2, Trash2, FileSpreadsheet, Pencil, Cpu as SimIcon, Calendar, ChevronLeft, ChevronRight, Package, CheckCircle2, TrendingUp, CreditCard, ArrowLeft, Search, MapPin, Smartphone } from 'lucide-react';
import { useSimCardsPaginated, useDeleteSimCard, useUpdateSimCard, useSimFinancialStats, useProviderCompanies } from './hooks';
import { fetchSimCards } from './api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { PageContainer, PageHeader } from '../../components/layout';
import {
  Button,
  SearchInput,
  ListboxSelect,
  Card,
  Badge,
  EmptyState,
  Skeleton,
  ErrorState,
  Table,
  IconButton,
  Modal,
  DateRangeFilter,
  KpiCard,
} from '../../components/ui';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { getErrorMessage } from '../../lib/errorHandler';
import { QuickStatusSelect } from './components/QuickStatusSelect';

export function SimCardsListPage() {
  const { t } = useTranslation(['simCards', 'common']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [simToDelete, setSimToDelete] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const searchFromUrl = searchParams.get('search') || '';
  const [localSearch, setLocalSearch] = useState(searchFromUrl);
  const debouncedSearch = useDebouncedValue(localSearch, 300);
  const statusFilter = searchParams.get('status') || 'all';
  const operatorFilter = searchParams.get('operator') || 'all';
  const providerFilter = searchParams.get('provider') || 'all';
  const yearParam = searchParams.get('year') || '';
  const monthParam = searchParams.get('month') || '';
  const page = Number(searchParams.get('page') || '0');

  // Sync local search from URL
  useEffect(() => {
    setLocalSearch(searchFromUrl);
  }, [searchFromUrl]);
  // Sync debounced search to URL — reset page on new search
  useEffect(() => {
    if (searchFromUrl === debouncedSearch) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set('search', debouncedSearch);
      else next.delete('search');
      next.delete('page');
      return next;
    });
  }, [debouncedSearch, searchFromUrl, setSearchParams]);

  const handleFilterChange = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== 'all') next.set(key === 'provider_company_id' ? 'provider' : key, value);
      else next.delete(key === 'provider_company_id' ? 'provider' : key);
      next.delete('page');
      return next;
    });
  };

  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage > 0) next.set('page', String(newPage));
      else next.delete('page');
      return next;
    });
  };

  const filters = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    operator: operatorFilter,
    provider_company_id: providerFilter,
    year: yearParam || undefined,
    month: monthParam || undefined,
  };

  const {
    data: simCards,
    isLoading,
    error,
    refetch,
    isFetching,
    totalCount,
    pageCount,
    pageSize,
  } = useSimCardsPaginated(filters, page);
  const { data: simStats } = useSimFinancialStats();
  const { data: providerCompanies } = useProviderCompanies();
  const deleteSimMutation = useDeleteSimCard();
  const updateSimCardMutation = useUpdateSimCard();

  const handleAdd = () => navigate('/sim-cards/new');
  const handleImport = () => navigate('/sim-cards/import');
  const handleEdit = (id) => navigate(`/sim-cards/${id}/edit`);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch all matching rows (not just current page) for complete export
      const all = await fetchSimCards(filters);
      if (!all?.length) return;

      const exportData = all.map(sim => ({
        [t('list.columns.provider')]: sim.provider_company?.name || '-',
        [t('list.columns.phoneNumber')]: sim.phone_number,
        [t('list.columns.imsi')]: sim.imsi || '-',
        [t('list.columns.capacity')]: sim.capacity || '-',
        [t('list.columns.operator')]: t(`operators.${sim.operator}`),
        [t('list.columns.gprsSerialNo')]: sim.gprs_serial_no || '-',
        [t('list.columns.accountNo')]: sim.account_no || '-',
        [t('list.columns.customerLabel')]: sim.customers?.company_name || sim.customer_label || '-',
        [t('list.columns.activationDate')]: sim.activation_date ? formatDate(sim.activation_date) : '-',
        [t('list.columns.costPrice')]: sim.cost_price,
        [t('list.columns.salePrice')]: sim.sale_price,
        [t('list.columns.status')]: t(`status.${sim.status}`),
        [t('form.notes')]: sim.notes || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SIM_Cards");
      XLSX.writeFile(wb, `Ornet_SIM_Listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = (row) => {
    setSimToDelete(row);
  };

  const confirmDelete = async () => {
    if (!simToDelete) return;
    try {
      await deleteSimMutation.mutateAsync(simToDelete.id);
    } catch {
      // error handled by mutation onError
    } finally {
      setSimToDelete(null);
    }
  };

  const handleQuickStatusChange = async (simId, newStatus) => {
    await updateSimCardMutation.mutateAsync({ id: simId, status: newStatus });
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'available': return 'info';
      case 'subscription': return 'primary';
      case 'cancelled': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="full" className="space-y-6">
        {/* Mobile Loading Skeleton */}
        <div className="md:hidden space-y-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[90px] w-full rounded-xl" />
            ))}
          </div>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block space-y-4">
          <PageHeader title={t('title')} />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer maxWidth="full">
        <ErrorState message={getErrorMessage(error, 'simCards.loadFailed')} onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const columns = [
    {
      header: t('list.columns.provider'),
      accessor: 'provider_company',
      render: (_, row) => (
        <span className="text-neutral-600 dark:text-neutral-400">
          {row.provider_company?.name || '-'}
        </span>
      ),
    },
    {
      header: t('list.columns.phoneNumber'),
      accessor: 'phone_number',
      render: (value) => (
        <div className="font-medium text-neutral-900 dark:text-neutral-50">{value}</div>
      ),
    },
    {
      header: t('list.columns.imsi'),
      accessor: 'imsi',
      render: (value) => (
        <span className="text-neutral-600 dark:text-neutral-400 font-mono text-sm">
          {value || '-'}
        </span>
      ),
    },
    {
      header: t('list.columns.capacity'),
      accessor: 'capacity',
      render: (value) => (
        <span className="text-neutral-600 dark:text-neutral-400">{value || '-'}</span>
      ),
    },
    {
      header: t('list.columns.operator'),
      accessor: 'operator',
      render: (value) => t(`operators.${value}`),
    },
    {
      header: t('list.columns.gprsSerialNo'),
      accessor: 'gprs_serial_no',
      render: (value) => (
        <span className="text-neutral-600 dark:text-neutral-400 font-mono text-sm">
          {value || '-'}
        </span>
      ),
    },
    {
      header: t('list.columns.accountNo'),
      accessor: 'account_no',
      render: (value) => (
        <span className="text-neutral-600 dark:text-neutral-400">{value || '-'}</span>
      ),
    },
    {
      header: t('list.columns.customerLabel'),
      accessor: 'customers',
      maxWidth: 250,
      cellClassName: 'whitespace-normal break-words align-top',
      render: (_, row) => (
        <span className="break-words">
          {row.customers?.company_name || row.customer_label || '-'}
        </span>
      ),
    },
    {
      header: t('list.columns.activationDate'),
      accessor: 'activation_date',
      render: (value) => (
        <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
          <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          {value ? formatDate(value) : '-'}
        </div>
      ),
    },
    {
      header: t('list.columns.costPrice'),
      accessor: 'cost_price',
      render: (value, row) => (
        <span className="text-neutral-600 dark:text-neutral-400">
          {formatCurrency(value ?? 0, row.currency ?? 'TRY')}
        </span>
      ),
    },
    {
      header: t('list.columns.salePrice'),
      accessor: 'sale_price',
      render: (value, row) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-50">
          {formatCurrency(value ?? 0, row.currency ?? 'TRY')}
        </span>
      ),
    },
    {
      header: t('list.columns.status'),
      accessor: 'status',
      render: (value, row) => (
        <div onClick={quickEditMode ? (e) => e.stopPropagation() : undefined}>
          {quickEditMode && row.status !== 'subscription' ? (
            <QuickStatusSelect sim={row} onStatusChange={handleQuickStatusChange} t={t} />
          ) : (
            <Badge variant={getStatusVariant(value)}>{t(`status.${value}`)}</Badge>
          )}
        </div>
      ),
    },
    {
      header: t('common:actions.actionsColumn'),
      accessor: 'id',
      align: 'right',
      render: (_, row) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon={Edit2}
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(row.id)}
            aria-label={t('actions.edit')}
          />
          <IconButton
            icon={Trash2}
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-900/20"
            aria-label={t('actions.delete')}
          />
        </div>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="full" className="space-y-6">
      {/* Mobile Sticky Header — md:hidden */}
      <div className="md:hidden sticky top-0 z-30 -mx-4 -mt-6 px-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-[#262626]">
        <div className="flex items-center justify-between h-14">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-xl text-primary-600 dark:text-primary-400 active:scale-95 transition-transform"
            aria-label={t('common:actions.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-primary-600 dark:text-primary-400 tracking-tight">
            {t('title')}
          </h1>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center justify-center w-10 h-10 -mr-2 rounded-xl text-primary-600 dark:text-primary-400 active:scale-95 transition-transform"
            aria-label={t('actions.add')}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar — md:hidden */}
      <div className="md:hidden">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t('list.searchPlaceholder')}
            className="w-full h-12 pl-11 pr-4 rounded-xl border-none bg-neutral-100 dark:bg-[#1f1f1f] text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm focus:ring-1 focus:ring-primary-500 transition-all"
          />
        </div>
      </div>

      {/* Mobile Filter Chips — md:hidden */}
      <div className="md:hidden flex overflow-x-auto scrollbar-hide -mx-4 px-4 gap-2">
        {[
          { label: t('list.filters.all'), isActive: statusFilter === 'all' && operatorFilter === 'all', onClick: () => { handleFilterChange('status', 'all'); handleFilterChange('operator', 'all'); } },
          { label: t('list.filters.active'), isActive: statusFilter === 'active', onClick: () => { handleFilterChange('operator', 'all'); handleFilterChange('status', 'active'); } },
          { label: t('list.filters.available'), isActive: statusFilter === 'available', onClick: () => { handleFilterChange('operator', 'all'); handleFilterChange('status', 'available'); } },
          { label: t('list.filters.cancelled'), isActive: statusFilter === 'cancelled', onClick: () => { handleFilterChange('operator', 'all'); handleFilterChange('status', 'cancelled'); } },
          { label: t('operators.TURKCELL'), isActive: operatorFilter === 'TURKCELL', onClick: () => { handleFilterChange('status', 'all'); handleFilterChange('operator', 'TURKCELL'); } },
          { label: t('operators.VODAFONE'), isActive: operatorFilter === 'VODAFONE', onClick: () => { handleFilterChange('status', 'all'); handleFilterChange('operator', 'VODAFONE'); } },
          { label: t('operators.TURK_TELEKOM'), isActive: operatorFilter === 'TURK_TELEKOM', onClick: () => { handleFilterChange('status', 'all'); handleFilterChange('operator', 'TURK_TELEKOM'); } },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={chip.onClick}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95',
              chip.isActive
                ? 'bg-primary-600 text-white dark:bg-primary-500'
                : 'bg-neutral-100 dark:bg-[#262626] text-neutral-600 dark:text-neutral-400'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Desktop PageHeader — hidden on mobile */}
      <div className="hidden md:block">
        <PageHeader
          title={t('title')}
          breadcrumbs={[
            { label: t('common:nav.dashboard'), to: '/' },
            { label: t('title') },
          ]}
          actions={
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                onClick={handleExport}
                loading={isExporting}
                disabled={totalCount === 0}
              >
                {t('common:actions.export')}
              </Button>
              <Button
                variant="outline"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleImport}
              >
                {t('common:import.bulkImportButton')}
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleAdd}
              >
                {t('actions.add')}
              </Button>
            </div>
          }
        />
      </div>

      {/* Mobile KPI Strip — md:hidden */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-400">
            {t('stats.total')}
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            {simStats?.total_count ?? simCards?.length ?? 0}
          </span>
        </div>
        <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col justify-between min-h-[90px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-400">
              {t('stats.active')}
            </span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-success-600 dark:text-success-400">
            {simStats?.active_sim_count ?? 0}
          </span>
        </div>
        <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-400">
            {t('stats.unassigned')}
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-amber-500 dark:text-amber-400">
            {simStats?.available_count ?? 0}
          </span>
        </div>
        <div className="rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-400">
            {t('stats.monthlyRevenue')}
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-primary-600 dark:text-primary-400">
            {formatCurrency(simStats?.total_monthly_profit ?? 0)}
          </span>
        </div>
      </div>

      {/* Desktop KPI Strip — hidden on mobile */}
      <div className="hidden md:grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
        <KpiCard
          title={t('stats.total')}
          value={simStats?.total_count ?? simCards?.length ?? 0}
          icon={Package}
          variant="default"
        />
        <KpiCard
          title={t('stats.available')}
          value={simStats?.available_count ?? simCards?.filter((s) => s.status === 'available').length ?? 0}
          icon={SimIcon}
          variant="success"
        />
        <KpiCard
          title={t('stats.active')}
          value={simStats?.active_sim_count ?? simCards?.filter((s) => s.status === 'active').length ?? 0}
          icon={TrendingUp}
          variant="info"
        />
        <KpiCard
          title={t('stats.subscription')}
          value={simStats?.subscription_count ?? simCards?.filter((s) => s.status === 'subscription').length ?? 0}
          icon={CreditCard}
          variant="info"
        />
        <KpiCard
          title={t('stats.monthlyProfit')}
          value={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
            simStats?.total_monthly_profit ?? (simCards || []).reduce((acc, curr) => acc + ((curr.sale_price || 0) - (curr.cost_price || 0)), 0)
          )}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <Card className="hidden md:block p-3 border-neutral-200/60 dark:border-neutral-800/60">
        <div className="flex flex-col lg:flex-row items-end gap-3">
          <div className="flex-1 min-w-[200px] w-full">
            <SearchInput
              value={localSearch}
              onChange={(v) => setLocalSearch(v)}
              placeholder={t('list.searchPlaceholder')}
              className="w-full"
              size="sm"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto">
            <div className="w-full sm:flex-1 md:w-40">
              <ListboxSelect
                value={statusFilter}
                onChange={(v) => handleFilterChange('status', v)}
                options={[
                  { value: 'all', label: t('list.filters.all') },
                  { value: 'available', label: t('list.filters.available') },
                  { value: 'active', label: t('list.filters.active') },
                  { value: 'subscription', label: t('list.filters.subscription') },
                  { value: 'cancelled', label: t('list.filters.cancelled') }
                ]}
                placeholder={t('list.filters.status')}
                leftIcon={<Filter className="w-4 h-4" />}
                size="sm"
              />
            </div>
            <div className="w-full sm:flex-1 md:w-40">
              <ListboxSelect
                value={operatorFilter}
                onChange={(v) => handleFilterChange('operator', v)}
                options={[
                  { value: 'all', label: t('list.filters.allOperators') },
                  { value: 'TURKCELL', label: t('operators.TURKCELL') },
                  { value: 'VODAFONE', label: t('operators.VODAFONE') },
                  { value: 'TURK_TELEKOM', label: t('operators.TURK_TELEKOM') },
                ]}
                placeholder={t('list.filters.operator')}
                size="sm"
              />
            </div>
            <div className="w-full sm:flex-1 md:w-40">
              <ListboxSelect
                value={providerFilter}
                onChange={(v) => handleFilterChange('provider_company_id', v)}
                options={[
                  { value: 'all', label: t('list.filters.all') },
                  ...(providerCompanies || []).map((p) => ({ value: p.id, label: p.name })),
                ]}
                placeholder={t('list.filters.provider')}
                size="sm"
              />
            </div>
            <div className="w-full sm:flex-1 md:w-32">
              <ListboxSelect
                value={yearParam || 'all'}
                onChange={(v) => handleFilterChange('year', v)}
                options={[
                  { value: 'all', label: t('list.filters.all') },
                  ...Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString()).map(y => ({ value: y, label: y }))
                ]}
                placeholder={t('list.filters.selectYear')}
                size="sm"
              />
            </div>
            <div className="w-full sm:flex-1 md:w-36">
              <ListboxSelect
                value={monthParam || 'all'}
                onChange={(v) => handleFilterChange('month', v)}
                options={[
                  { value: 'all', label: t('list.filters.all') },
                  ...Object.entries(t('notifications:months', { returnObjects: true })).map(([val, label]) => ({
                    value: val,
                    label,
                  })),
                ]}
                placeholder={t('list.filters.selectMonth')}
                size="sm"
              />
            </div>
            <div className="flex items-center pb-0.5">
              <Button
                variant={quickEditMode ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setQuickEditMode(!quickEditMode)}
                leftIcon={<Pencil className="w-4 h-4" />}
              >
                {t('list.quickEdit')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {totalCount === 0 && !isFetching ? (
        <EmptyState
          icon={SimIcon}
          title={t('list.empty.title')}
          description={t('list.empty.description')}
          actionLabel={t('actions.add')}
          onAction={handleAdd}
        />
      ) : (
        <>
          {/* Mobile Card List — md:hidden */}
          <div className={cn('md:hidden space-y-3', isFetching && !isLoading && 'opacity-70')}>
            {(simCards || []).map((sim) => {
              const isActive = sim.status === 'active' || sim.status === 'subscription';
              const isAvailable = sim.status === 'available';
              const isCancelled = sim.status === 'cancelled';
              const customerName = sim.customers?.company_name || sim.customer_label;

              return (
                <button
                  key={sim.id}
                  type="button"
                  onClick={() => handleEdit(sim.id)}
                  className={cn(
                    'w-full text-left rounded-xl p-4 border-l-4 transition-colors active:scale-[0.98] duration-150',
                    'bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-[#262626]',
                    isActive && 'border-l-success-500/50',
                    isAvailable && 'border-l-amber-500',
                    isCancelled && 'border-l-neutral-400 dark:border-l-neutral-600 opacity-60',
                  )}
                >
                  {/* Row 1: Phone + Status */}
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      'font-mono text-lg font-bold tracking-tight',
                      isCancelled ? 'text-neutral-500 dark:text-neutral-400' : 'text-primary-600 dark:text-primary-400'
                    )}>
                      {sim.phone_number}
                    </span>
                    <Badge variant={getStatusVariant(sim.status)} size="sm">
                      {t(`status.${sim.status}`)}
                    </Badge>
                  </div>
                  {/* Row 2: Customer + Operator */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn(
                      'text-sm font-bold truncate mr-2',
                      isCancelled
                        ? 'text-neutral-500 dark:text-neutral-400 line-through'
                        : 'text-neutral-900 dark:text-neutral-50'
                    )}>
                      {customerName || t('list.unassigned')}
                    </span>
                    {sim.operator && (
                      <span className="flex-shrink-0 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 rounded">
                        {t(`operators.${sim.operator}`)}
                      </span>
                    )}
                  </div>
                  {/* Row 3: Location */}
                  <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                    {customerName ? (
                      <>
                        <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span className="truncate">{sim.site_name || sim.provider_company?.name || '-'}</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span>{t('stats.unassigned')}</span>
                      </>
                    )}
                  </div>
                  {/* Row 4: Capacity + Account No + Price */}
                  <div className="flex justify-between items-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex gap-4">
                      {sim.capacity && (
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase text-neutral-400 dark:text-neutral-500">{t('list.columns.capacity')}</span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{sim.capacity}</span>
                        </div>
                      )}
                      {sim.account_no && (
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase text-neutral-400 dark:text-neutral-500">{t('list.columns.accountNo')}</span>
                          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{sim.account_no}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-50">
                      {formatCurrency(sim.sale_price ?? 0)}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Mobile Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between pt-2 pb-4">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} / {totalCount}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 0}
                    className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 px-2">
                    {page + 1} / {pageCount}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= pageCount - 1}
                    className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Table — hidden on mobile */}
          <div className={cn('hidden md:block bg-white dark:bg-[#171717] rounded-2xl border border-neutral-200 dark:border-[#262626] overflow-hidden shadow-sm', isFetching && !isLoading && 'opacity-70')}>
            <Table
              columns={columns}
              data={simCards}
              onRowClick={(row) => handleEdit(row.id)}
              className="border-none"
            />
            {pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} / {totalCount} SIM
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 0}
                    className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 px-2">
                    {page + 1} / {pageCount}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= pageCount - 1}
                    className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <Modal
        open={!!simToDelete}
        onClose={() => setSimToDelete(null)}
        title={t('delete.title')}
        size="sm"
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="ghost"
              onClick={() => setSimToDelete(null)}
              className="flex-1"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deleteSimMutation.isPending}
              className="flex-1"
            >
              {t('common:actions.delete')}
            </Button>
          </div>
        }
      >
        <p>{t('delete.message', { phoneNumber: simToDelete?.phone_number })}</p>
        <p className="mt-2 text-sm text-error-600 font-bold">{t('delete.warning')}</p>
      </Modal>
    </PageContainer>
  );
}
