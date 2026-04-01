import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button, EmptyState, Select, Spinner } from '../../../components/ui';
import { PLAN_ITEM_TYPES } from '../schema';
import { useCreatePlanItem, usePlanItems } from '../planItemsHooks';
import { PlanItemRow } from './PlanItemRow';

const todayIso = () => new Date().toISOString().slice(0, 10);

function shiftIsoDate(dateStr, amount) {
  const next = new Date(`${dateStr}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

export function PlanPanel() {
  const { t, i18n } = useTranslation(['operations', 'common']);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [newDescription, setNewDescription] = useState('');
  const [newItemType, setNewItemType] = useState('office');
  const { data: items = [], isLoading, isError, refetch } = usePlanItems(selectedDate);
  const createPlanItem = useCreatePlanItem();

  const dateLabel = useMemo(() => {
    const locale = i18n.language === 'tr' ? tr : undefined;
    return format(new Date(`${selectedDate}T12:00:00`), 'd MMMM yyyy, EEEE', { locale });
  }, [i18n.language, selectedDate]);

  const handleInlineAdd = async () => {
    if (!newDescription.trim()) return;

    await createPlanItem.mutateAsync({
      plan_date: selectedDate,
      description: newDescription.trim(),
      item_type: newItemType,
    });

    setNewDescription('');
    setNewItemType('office');
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#262626] dark:bg-[#171717]">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-3 dark:border-[#262626]">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {t('operations:plan.title')}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {dateLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(shiftIsoDate(selectedDate, -1))}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(todayIso())}
          >
            {t('operations:plan.today')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(shiftIsoDate(selectedDate, 1))}
            leftIcon={<ChevronRight className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-900/40 dark:bg-error-900/10 dark:text-error-300">
            <div className="flex items-center justify-between gap-3">
              <span>{t('common:errors.loadFailed')}</span>
              <Button type="button" variant="outline" size="sm" onClick={refetch}>
                {t('common:actions.retry')}
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t('operations:plan.empty.title')}
            description={t('operations:plan.empty.description')}
          />
        ) : (
          items.map((item) => <PlanItemRow key={item.id} item={item} />)
        )}
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-[#262626]">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t('operations:plan.quickAdd')}
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder={t('operations:plan.inline.placeholder')}
            className="block h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 dark:border-[#262626] dark:bg-[#0f0f0f] dark:text-neutral-50"
          />
          <div className="flex gap-2">
            <Select
              options={PLAN_ITEM_TYPES.map((value) => ({
                value,
                label: t(`operations:plan.itemType.${value}`),
              }))}
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value)}
              wrapperClassName="flex-1"
            />
            <Button
              type="button"
              onClick={handleInlineAdd}
              disabled={!newDescription.trim()}
              loading={createPlanItem.isPending}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {t('operations:plan.inline.add')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
