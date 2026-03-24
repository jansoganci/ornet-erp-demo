import { Wrench, Edit, Trash2, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, IconButton, Badge } from '../../../components/ui';
import { workOrderStatusVariant } from '../../../lib/utils';

export function WorkOrderHero({ workOrder, onEdit, onDelete }) {
  const { t } = useTranslation(['workOrders', 'common']);

  const title = `${t(`common:workType.${workOrder.work_type}`)}${workOrder.form_no ? ` #${workOrder.form_no}` : ''}`;
  const subtitle = [workOrder.company_name, workOrder.site_name].filter(Boolean).join(' — ') || '—';

  return (
    <div className="space-y-4">
      {/* Breadcrumb + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/work-orders"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common:nav.workOrders')}
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit className="w-4 h-4" />}
            onClick={onEdit}
          >
            {t('common:actions.edit')}
          </Button>
          <IconButton
            icon={Trash2}
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={t('common:actions.delete')}
            className="text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-950/30"
          />
        </div>
      </div>

      {/* Hero Card */}
      <div className="rounded-xl border border-neutral-200 dark:border-[#262626] bg-white dark:bg-[#171717] p-5 shadow-sm">
        {/* Identity row */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-950/40 flex-shrink-0">
            <Wrench className="w-7 h-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-50 leading-tight truncate">
                  {title}
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  variant={workOrderStatusVariant[workOrder.status] ?? 'default'}
                  size="sm"
                  dot
                >
                  {t(`common:status.${workOrder.status}`)}
                </Badge>
                <Badge variant="outline" size="sm" className="uppercase tracking-wider">
                  {t(`workOrders:priorities.${workOrder.priority}`)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
