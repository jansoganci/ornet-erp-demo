import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Minus, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Spinner } from '../../../components/ui';
import { formatCurrency, cn } from '../../../lib/utils';
import { PaymentRecordModal } from './PaymentRecordModal';
import { useEnsurePaymentsForYear } from '../hooks';

const statusConfig = {
  paid: {
    bg: 'bg-success-50 dark:bg-success-900/20',
    border: 'border-success-200 dark:border-success-800/40',
    icon: Check,
    iconColor: 'text-success-600 dark:text-success-400',
    textColor: 'text-success-700 dark:text-success-300',
  },
  pending: {
    bg: 'bg-neutral-50 dark:bg-neutral-800/30',
    border: 'border-neutral-200 dark:border-neutral-700',
    icon: Circle,
    iconColor: 'text-neutral-400 dark:text-neutral-500',
    textColor: 'text-neutral-600 dark:text-neutral-400',
  },
  failed: {
    bg: 'bg-error-50 dark:bg-error-900/20',
    border: 'border-error-200 dark:border-error-800/40',
    icon: X,
    iconColor: 'text-error-600 dark:text-error-400',
    textColor: 'text-error-700 dark:text-error-300',
  },
  skipped: {
    bg: 'bg-neutral-100 dark:bg-neutral-900/40',
    border: 'border-dashed border-neutral-300 dark:border-neutral-700',
    icon: Minus,
    iconColor: 'text-neutral-400 dark:text-neutral-500',
    textColor: 'text-neutral-500 dark:text-neutral-500',
  },
  write_off: {
    bg: 'bg-warning-50 dark:bg-warning-900/20',
    border: 'border-warning-200 dark:border-warning-800/40',
    icon: Minus,
    iconColor: 'text-warning-600 dark:text-warning-400',
    textColor: 'text-warning-700 dark:text-warning-300 line-through',
  },
};

function getMonthIndex(paymentMonth) {
  if (!paymentMonth) return 0;
  return new Date(paymentMonth).getMonth();
}

function getPaymentYear(paymentMonth) {
  if (!paymentMonth) return 0;
  return new Date(paymentMonth).getFullYear();
}

export function MonthlyPaymentGrid({ subscriptionId, payments = [], subscriptionStatus, className }) {
  const { t } = useTranslation(['subscriptions', 'common']);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const ensurePaymentsMutation = useEnsurePaymentsForYear();
  const lastAttemptedYearRef = useRef(null);

  const filteredPayments = payments.filter(
    (p) => p.payment_month && getPaymentYear(p.payment_month) === selectedYear
  );

  useEffect(() => {
    if (
      !subscriptionId ||
      subscriptionStatus === 'cancelled' ||
      filteredPayments.length > 0 ||
      ensurePaymentsMutation.isPending ||
      lastAttemptedYearRef.current === selectedYear
    ) {
      return;
    }
    lastAttemptedYearRef.current = selectedYear;
    ensurePaymentsMutation.mutate({ subscriptionId, year: selectedYear });
  }, [selectedYear, filteredPayments.length, subscriptionId, subscriptionStatus]);

  const handleCellClick = (payment) => {
    if (['pending', 'failed', 'write_off'].includes(payment.status)) {
      setSelectedPayment(payment);
    }
  };

  const paidPayments = filteredPayments.filter((p) => p.status === 'paid');
  const pendingPayments = filteredPayments.filter((p) => p.status === 'pending');
  const paidTotal = paidPayments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200/90 bg-neutral-50/90 px-5 py-3 dark:border-[#262626] dark:bg-[#141414]/80">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          {t('payment.title')}
        </h3>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y - 1)}
            aria-label={t('subscriptions:paymentGrid.prevYear')}
            className="touch-manipulation rounded-lg p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200/80 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:p-2"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-bold text-neutral-900 dark:text-neutral-100 sm:min-w-[4rem]">
            {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y + 1)}
            aria-label={t('subscriptions:paymentGrid.nextYear')}
            className="touch-manipulation rounded-lg p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200/80 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:p-2"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
      <div className="p-4">
        {ensurePaymentsMutation.isPending && filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-neutral-500 dark:text-neutral-400">
            <Spinner size="lg" />
            <p className="text-sm">{t('subscriptions:paymentGrid.generating')}</p>
          </div>
        ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {filteredPayments.map((payment) => {
            const monthIdx = getMonthIndex(payment.payment_month);
            const config = statusConfig[payment.status] || statusConfig.pending;
            const Icon = config.icon;
            const isClickable = ['pending', 'failed', 'write_off'].includes(payment.status);

            return (
              <button
                key={payment.id}
                type="button"
                onClick={() => handleCellClick(payment)}
                disabled={!isClickable}
                className={cn(
                  'relative flex flex-col items-center rounded-xl border p-3 min-h-[56px] transition-all',
                  config.bg,
                  config.border,
                  isClickable
                    ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                    : 'cursor-default'
                )}
              >
                <span className={cn('text-xs font-bold uppercase tracking-wider', config.textColor)}>
                  {t('common:monthsShort.' + monthIdx)}
                </span>
                <Icon className={cn('w-4 h-4 my-1', config.iconColor)} />
                <span className={cn('text-[10px] font-medium', config.textColor)}>
                  {formatCurrency(payment.total_amount)}
                </span>
              </button>
            );
          })}
        </div>
        )}

        {/* Summary row */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              {t('payment.statuses.paid')} ({paidPayments.length})
            </p>
            <p className="text-sm font-bold text-success-600 dark:text-success-400">
              {formatCurrency(paidTotal)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              {t('payment.statuses.pending')} ({pendingPayments.length})
            </p>
            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
              {formatCurrency(pendingTotal)}
            </p>
          </div>
        </div>
      </div>

      <PaymentRecordModal
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        payment={selectedPayment}
      />
    </Card>
  );
}
