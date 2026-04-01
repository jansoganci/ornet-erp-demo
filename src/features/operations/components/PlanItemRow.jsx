import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, MoreVertical, ArrowRightCircle, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { cn } from '../../../lib/utils';
import { useCarryForwardPlanItem, useDeletePlanItem, useUpdatePlanItemStatus } from '../planItemsHooks';
import { CarryForwardModal } from './CarryForwardModal';

const STATUS_STYLES = {
  pending: 'border-l-neutral-200 dark:border-l-neutral-700',
  done: 'border-l-success-500 bg-success-50/60 dark:bg-success-900/10',
  not_done: 'border-l-rose-500 bg-rose-50/60 dark:bg-rose-900/10',
};

const TYPE_VARIANTS = {
  field_work: 'info',
  office: 'default',
  proposal: 'warning',
  finance: 'success',
  other: 'default',
};

const NEXT_STATUS = {
  pending: 'done',
  done: 'not_done',
  not_done: 'pending',
};

export function PlanItemRow({ item }) {
  const { t } = useTranslation('operations');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCarryForward, setShowCarryForward] = useState(false);
  const updateStatus = useUpdatePlanItemStatus();
  const carryForward = useCarryForwardPlanItem();
  const deletePlanItem = useDeletePlanItem();

  const handleStatusCycle = () => {
    const nextStatus = NEXT_STATUS[item.status] || 'pending';
    updateStatus.mutate({ id: item.id, status: nextStatus });
  };

  const handleCarryForward = async (newDate) => {
    await carryForward.mutateAsync({ id: item.id, newDate });
  };

  const handleDelete = async () => {
    await deletePlanItem.mutateAsync({ id: item.id, planDate: item.plan_date });
  };

  const linkBadges = [
    item.operations_item_id && { key: 'operations', label: t('plan.links.operations') },
    item.work_order_id && { key: 'workOrder', label: t('plan.links.workOrder') },
    item.proposal_id && { key: 'proposal', label: t('plan.links.proposal') },
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-[#262626] dark:bg-[#171717]',
        'border-l-4',
        STATUS_STYLES[item.status]
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleStatusCycle}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            item.status === 'done'
              ? 'border-success-600 bg-success-600 text-white'
              : item.status === 'not_done'
                ? 'border-rose-500 bg-rose-500 text-white'
                : 'border-neutral-300 bg-white text-transparent dark:border-neutral-600 dark:bg-[#171717]'
          )}
          aria-label={t('plan.actions.toggleStatus')}
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm text-neutral-900 dark:text-neutral-100',
                  item.status === 'done' && 'line-through text-neutral-500 dark:text-neutral-500'
                )}
              >
                {item.description}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={TYPE_VARIANTS[item.item_type] || 'default'} size="sm">
                  {t(`plan.itemType.${item.item_type}`)}
                </Badge>
                <Badge variant="default" size="sm">
                  {t(`plan.status.${item.status}`)}
                </Badge>
                {item.is_carried && (
                  <Badge variant="warning" size="sm">
                    {t('plan.carried')}
                  </Badge>
                )}
                {linkBadges.map((link) => (
                  <Badge key={link.key} variant="primary" size="sm">
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      {link.label}
                    </span>
                  </Badge>
                ))}
              </div>

              {item.notes && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {item.notes}
                </p>
              )}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-xl dark:border-[#262626] dark:bg-[#171717]">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowCarryForward(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <ArrowRightCircle className="h-3.5 w-3.5" />
                      {t('plan.actions.carryForward')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleDelete();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('plan.actions.delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <CarryForwardModal
        open={showCarryForward}
        onClose={() => setShowCarryForward(false)}
        onConfirm={handleCarryForward}
        isSubmitting={carryForward.isPending}
      />
    </div>
  );
}
