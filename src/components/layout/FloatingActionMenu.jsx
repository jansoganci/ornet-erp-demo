import { useEffect, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import * as FM from 'framer-motion';

const { AnimatePresence, useReducedMotion } = FM;
import {
  ClipboardList,
  FileText,
  UserPlus,
  CreditCard,
  Cpu,
  TrendingUp,
  TrendingDown,
  Plus,
} from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

const MENU_ACTIONS = [
  {
    id: 'workOrder',
    labelKey: 'nav.floatingMenu.createWorkOrder',
    icon: ClipboardList,
    type: 'navigate',
    to: '/work-orders/new',
    requiresCanWrite: true,
  },
  {
    id: 'proposal',
    labelKey: 'nav.floatingMenu.createProposal',
    icon: FileText,
    type: 'navigate',
    to: '/proposals/new',
    requiresCanWrite: true,
  },
  {
    id: 'customer',
    labelKey: 'nav.floatingMenu.addCustomer',
    icon: UserPlus,
    type: 'navigate',
    to: '/customers/new',
    requiresCanWrite: true,
  },
  {
    id: 'subscription',
    labelKey: 'nav.floatingMenu.addSubscription',
    icon: CreditCard,
    type: 'navigate',
    to: '/subscriptions/new',
    requiresCanWrite: true,
  },
  {
    id: 'simCard',
    labelKey: 'nav.floatingMenu.addSimCard',
    icon: Cpu,
    type: 'navigate',
    to: '/sim-cards/new',
    requiresCanWrite: true,
  },
  {
    id: 'income',
    labelKey: 'nav.floatingMenu.addIncome',
    icon: TrendingUp,
    type: 'quickEntry',
    direction: 'income',
    requiresFinanceAccess: true,
  },
  {
    id: 'expense',
    labelKey: 'nav.floatingMenu.addExpense',
    icon: TrendingDown,
    type: 'quickEntry',
    direction: 'expense',
    requiresFinanceAccess: true,
  },
];

export function FloatingActionMenu({
  hasFinanceAccess,
  canWrite,
  onQuickEntry,
}) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  const visibleActions = useMemo(
    () =>
      MENU_ACTIONS.filter((a) => {
        if (a.requiresFinanceAccess && !hasFinanceAccess) return false;
        if (a.requiresCanWrite && !canWrite) return false;
        return true;
      }),
    [hasFinanceAccess, canWrite]
  );

  const spring = useMemo(
    () =>
      reduceMotion
        ? { type: 'tween', duration: 0.15, ease: 'easeOut' }
        : { type: 'spring', stiffness: 420, damping: 32, mass: 0.9 },
    [reduceMotion]
  );

  const stagger = reduceMotion ? 0 : 0.055;

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener('keydown', handleEscape);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prev;
    };
  }, [open, handleEscape]);

  const handleItem = useCallback(
    (action) => {
      if (action.type === 'quickEntry') {
        onQuickEntry?.(action.direction);
      } else if (action.type === 'navigate') {
        navigate(action.to);
      }
      setOpen(false);
    },
    [navigate, onQuickEntry]
  );

  if (visibleActions.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <FM.motion.div
            key="fab-backdrop"
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="fixed inset-0 z-[85] max-lg:hidden bg-black/25 dark:bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          'fixed z-[90] flex flex-col items-end gap-3 max-lg:hidden',
          'lg:bottom-8 lg:right-8'
        )}
      >
        <AnimatePresence initial={false}>
          {open &&
            visibleActions.map((action, index) => {
              const Icon = action.icon;
              const delay = (visibleActions.length - 1 - index) * stagger;
              return (
                <FM.motion.div
                  key={action.id}
                  role="none"
                  initial={{ opacity: 0, x: 28 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { ...spring, delay },
                  }}
                  exit={{
                    opacity: 0,
                    x: 20,
                    transition: { ...spring, delay: index * stagger * 0.6 },
                  }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Icon className="w-4 h-4 shrink-0" aria-hidden />}
                    className="rounded-full shadow-lg border border-neutral-200/80 dark:border-neutral-700 pr-5 pl-3.5 whitespace-nowrap"
                    onClick={() => handleItem(action)}
                  >
                    {t(action.labelKey)}
                  </Button>
                </FM.motion.div>
              );
            })}
        </AnimatePresence>

        <FM.motion.button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={open ? t('nav.floatingMenu.closeMenu') : t('nav.floatingMenu.openMenu')}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-full',
            'bg-primary-600 hover:bg-primary-700 text-white',
            'shadow-lg hover:shadow-xl transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0a0a0a]'
          )}
          whileTap={reduceMotion ? {} : { scale: 0.96 }}
        >
          <FM.motion.span
            className="inline-flex"
            animate={{ rotate: open ? 45 : 0 }}
            transition={spring}
          >
            <Plus className="w-6 h-6" aria-hidden />
          </FM.motion.span>
        </FM.motion.button>
      </div>
    </>
  );
}
