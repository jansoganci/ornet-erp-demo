import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  TrendingUp,
  TrendingDown,
  Cpu,
  Users,
  CreditCard,
  FileText,
  ClipboardList,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from '../ui';

const ACTIONS = [
  {
    id: 'income',
    labelKey: 'nav.quickActions.addIncome',
    icon: TrendingUp,
    type: 'quickEntry',
    direction: 'income',
    requiresFinanceAccess: true,
  },
  {
    id: 'expense',
    labelKey: 'nav.quickActions.addExpense',
    icon: TrendingDown,
    type: 'quickEntry',
    direction: 'expense',
    requiresFinanceAccess: true,
  },
  {
    id: 'simCard',
    labelKey: 'nav.quickActions.newSimCard',
    icon: Cpu,
    type: 'navigate',
    to: '/sim-cards/new',
    requiresCanWrite: true,
  },
  {
    id: 'customer',
    labelKey: 'nav.quickActions.newCustomer',
    icon: Users,
    type: 'navigate',
    to: '/customers/new',
    requiresCanWrite: true,
  },
  {
    id: 'subscription',
    labelKey: 'nav.quickActions.newSubscription',
    icon: CreditCard,
    type: 'navigate',
    to: '/subscriptions/new',
    requiresCanWrite: true,
  },
  {
    id: 'proposal',
    labelKey: 'nav.quickActions.newProposal',
    icon: FileText,
    type: 'navigate',
    to: '/proposals/new',
    requiresCanWrite: true,
  },
  {
    id: 'workOrder',
    labelKey: 'nav.quickActions.newWorkOrder',
    icon: ClipboardList,
    type: 'navigate',
    to: '/work-orders/new',
    requiresCanWrite: true,
  },
];

export function QuickActionsSheet({
  open,
  onClose,
  onQuickEntry,
  hasFinanceAccess,
  canWrite,
}) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const visibleActions = ACTIONS.filter((a) => {
    if (a.requiresFinanceAccess && !hasFinanceAccess) return false;
    if (a.requiresCanWrite && !canWrite) return false;
    return true;
  });

  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, handleEscape]);

  const handleActionClick = (action) => {
    if (action.type === 'quickEntry') {
      onQuickEntry?.(action.direction);
      onClose();
    } else if (action.type === 'navigate') {
      navigate(action.to);
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.quickActions.title')}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Panel */}
      <div
        className="relative w-full max-h-[70vh] bg-white dark:bg-[#171717] rounded-t-2xl shadow-xl overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 rounded-full bg-neutral-200 dark:bg-[#262626]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-[#262626]">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {t('nav.quickActions.title')}
          </h2>
          <IconButton
            icon={<X className="w-5 h-5" />}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('actions.close')}
          />
        </div>

        {/* Action list */}
        <div className="flex-1 overflow-y-auto overscroll-contain pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <nav className="space-y-1 px-4">
            {visibleActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] text-left',
                    'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{t(action.labelKey)}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>,
    document.body
  );
}
