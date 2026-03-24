import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, ErrorState, Spinner } from '../../../components/ui';
import { formatDateTime } from '../../../lib/utils';
import { useWorkOrderAuditLogs } from '../hooks';

function auditDescriptionSubKey(description) {
  if (!description || !description.startsWith('work_order.')) return null;
  return description.slice('work_order.'.length);
}

export function WorkOrderActivityTimeline({ workOrderId }) {
  const { t } = useTranslation('workOrders');
  const { data: logs = [], isLoading, error, refetch } = useWorkOrderAuditLogs(workOrderId);

  const entryTitle = (action, description) => {
    const sub = auditDescriptionSubKey(description);
    if (sub) {
      return t(`detail.auditDescriptions.work_order.${sub}`, {
        defaultValue: t(`detail.auditActions.${action}`, { defaultValue: action }),
      });
    }
    return t(`detail.auditActions.${action}`, { defaultValue: action });
  };

  const actorName = (row) => {
    const name = row.profiles?.full_name;
    if (name) return name;
    return t('detail.activity.unknownUser');
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-950/40 flex-shrink-0">
          <History className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-none">
            {t('detail.activity.title')}
          </h3>
          <p className="text-[10px] uppercase text-neutral-500 dark:text-neutral-400 tracking-widest mt-1">
            {t('detail.activity.subtitle')}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {error && !isLoading && (
        <ErrorState
          variant="card"
          title={t('detail.activity.loadError')}
          message={error.message}
          onRetry={() => refetch()}
          className="p-4"
        />
      )}

      {!isLoading && !error && logs.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('detail.activity.empty')}</p>
      )}

      {!isLoading && !error && logs.length > 0 && (
        <div className="relative space-y-5 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-700">
          {logs.map((row, index) => (
            <div key={row.id} className="relative pl-6">
              <div
                className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 z-10 bg-white dark:bg-[#171717] ${
                  index === 0
                    ? 'border-primary-500 dark:border-primary-400'
                    : 'border-neutral-300 dark:border-neutral-600'
                }`}
              />
              <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {entryTitle(row.action, row.description)}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {actorName(row)} · {formatDateTime(row.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
