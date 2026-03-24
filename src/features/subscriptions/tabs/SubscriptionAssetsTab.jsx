import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Table, SearchInput, EmptyState, Spinner } from '../../../components/ui';
import { formatDate } from '../../../lib/utils';
import { normalizeForSearch } from '../../../lib/normalizeForSearch';
import { toCSV, downloadCSV } from '../../../lib/csvExport';
import { useAssetsBySite } from '../../siteAssets/hooks';

export function SubscriptionAssetsTab({ siteId }) {
  const { t } = useTranslation('subscriptions');
  const { t: tCommon } = useTranslation('common');

  const { data: assets = [], isLoading, error } = useAssetsBySite(siteId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return assets;
    const normalized = normalizeForSearch(search);
    return assets.filter((a) => {
      const haystack = normalizeForSearch(a.equipment_name || '');
      return haystack.includes(normalized);
    });
  }, [assets, search]);

  const columns = [
    {
      key: 'equipment_name',
      header: t('detail.tabContent.assets.columns.equipmentName'),
      render: (_, a) => (
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {a.equipment_name}
        </p>
      ),
    },
    {
      key: 'quantity',
      header: t('detail.tabContent.assets.columns.quantity'),
      align: 'right',
      render: (_, a) => (
        <span className="text-sm tabular-nums">{a.quantity}</span>
      ),
    },
    {
      key: 'installation_date',
      header: t('detail.tabContent.assets.columns.installationDate'),
      render: (_, a) => (
        <span className="text-sm tabular-nums">
          {a.installation_date ? formatDate(a.installation_date) : '—'}
        </span>
      ),
    },
  ];

  const handleExport = () => {
    const csvColumns = columns.map((col) => ({
      key: col.key,
      header: col.header,
    }));
    const rows = filtered.map((a) => ({
      equipment_name: a.equipment_name,
      quantity: a.quantity,
      installation_date: a.installation_date ? formatDate(a.installation_date) : '',
    }));
    const csv = toCSV(rows, csvColumns);
    downloadCSV(csv, t('detail.tabContent.assets.exportFilename'));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={tCommon('errors.loadFailed')}
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('detail.tabContent.searchPlaceholder')}
          className="max-w-xs"
        />
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {t('detail.tabContent.exportCsv')}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-[#262626] overflow-hidden bg-white dark:bg-[#171717]">
        <Table
          columns={columns}
          data={filtered}
          emptyMessage={t('detail.tabContent.assets.empty')}
        />
      </div>
    </div>
  );
}
