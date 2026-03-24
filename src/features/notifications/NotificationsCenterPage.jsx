import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isToday, isYesterday, parseISO } from 'date-fns';
import { CheckCheck, Plus, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Spinner, ErrorState, EmptyState } from '../../components/ui';
import { cn } from '../../lib/utils';
import { useActiveNotifications, useResolveNotification, useMarkAllAsResolved } from './hooks';
import { NotificationFeedCard } from './components/NotificationFeedCard';
import { NotificationSidebar } from './components/NotificationSidebar';

// ─── Category mapping ───────────────────────────────────────

const ALERT_TYPES = new Set([
  'overdue_work_order',
  'subscription_cancelled',
  'subscription_paused',
  'sim_card_cancelled',
  'payment_due_soon',
  'pending_payments_summary',
]);

const SYSTEM_TYPES = new Set([
  'open_work_order',
  'today_not_started',
  'renewal_due_soon',
  'user_reminder',
]);

const ACTIVITY_TYPES = new Set([
  'work_order_assigned',
  'proposal_awaiting_response',
  'proposal_no_response_2d',
  'proposal_approved_no_wo',
  'task_due_soon',
]);

function getCategory(type) {
  if (ALERT_TYPES.has(type)) return 'alerts';
  if (SYSTEM_TYPES.has(type)) return 'system';
  if (ACTIVITY_TYPES.has(type)) return 'activity';
  return 'system';
}

// ─── Group notifications by date ────────────────────────────

function groupByDate(items, t) {
  const groups = [];
  let currentLabel = null;
  let currentItems = [];

  for (const item of items) {
    const date = item.created_at ? parseISO(item.created_at) : null;
    let label;

    if (!date) {
      label = t('dateHeaders.older');
    } else if (isToday(date)) {
      label = t('dateHeaders.today');
    } else if (isYesterday(date)) {
      label = t('dateHeaders.yesterday');
    } else {
      label = t('dateHeaders.older');
    }

    if (label !== currentLabel) {
      if (currentItems.length > 0) {
        groups.push({ label: currentLabel, items: currentItems });
      }
      currentLabel = label;
      currentItems = [item];
    } else {
      currentItems.push(item);
    }
  }

  if (currentItems.length > 0) {
    groups.push({ label: currentLabel, items: currentItems });
  }

  return groups;
}

// ─── Tab Button ─────────────────────────────────────────────

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      )}
    >
      {children}
      {count > 0 && (
        <span className={cn(
          'ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
          active ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Page Component ─────────────────────────────────────────

export function NotificationsCenterPage() {
  const { t } = useTranslation(['notifications', 'common']);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);

  const { data: allNotifications, isLoading, error, refetch } = useActiveNotifications(page);
  const { mutate: resolve } = useResolveNotification();
  const markAllMutation = useMarkAllAsResolved();

  // Filter by tab
  const filteredNotifications = useMemo(() => {
    if (!allNotifications) return [];
    if (activeTab === 'all') return allNotifications;
    return allNotifications.filter((n) => getCategory(n.notification_type) === activeTab);
  }, [allNotifications, activeTab]);

  // Category counts
  const counts = useMemo(() => {
    if (!allNotifications) return { all: 0, alerts: 0, system: 0, activity: 0 };
    const result = { all: allNotifications.length, alerts: 0, system: 0, activity: 0 };
    for (const n of allNotifications) {
      const cat = getCategory(n.notification_type);
      result[cat]++;
    }
    return result;
  }, [allNotifications]);

  // Date-grouped feed
  const dateGroups = useMemo(
    () => groupByDate(filteredNotifications, (key) => t(`notifications:${key}`)),
    [filteredNotifications, t]
  );

  const handleResolve = useCallback((id) => {
    resolve(id);
  }, [resolve]);

  const handleMarkAllRead = useCallback(() => {
    markAllMutation.mutate(undefined, {
      onSuccess: () => toast.success(t('common:success.updated')),
    });
  }, [markAllMutation, t]);

  const handleLoadOlder = () => {
    setPage((p) => p + 1);
  };

  const hasStoredUnresolved = allNotifications?.some(
    (n) => n.notification_source === 'stored' && !n.resolved_at
  );

  if (error) {
    return (
      <PageContainer maxWidth="full">
        <ErrorState message={t('notifications:error.loadFailed')} onRetry={refetch} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title={t('notifications:page.title')}
        description={t('notifications:subtitle')}
        actions={
          <div className="flex gap-3">
            {hasStoredUnresolved && (
              <Button
                variant="outline"
                leftIcon={<CheckCheck className="w-4 h-4" />}
                onClick={handleMarkAllRead}
                loading={markAllMutation.isPending}
              >
                {t('notifications:actions.markAllRead')}
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-[#131313] rounded-xl">
          <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} count={counts.all}>
            {t('notifications:tabs.all')}
          </TabButton>
          <TabButton active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} count={counts.alerts}>
            {t('notifications:tabs.alerts')}
          </TabButton>
          <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')} count={counts.system}>
            {t('notifications:tabs.system')}
          </TabButton>
          <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} count={counts.activity}>
            {t('notifications:tabs.activity')}
          </TabButton>
        </div>
      </div>

      {/* 12-col grid: Feed (8) + Sidebar (4) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Feed */}
        <div className="lg:col-span-8">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              title={t('notifications:empty.title')}
              description={t('notifications:empty.undone')}
            />
          ) : (
            <div className="space-y-3">
              {dateGroups.map((group) => (
                <div key={group.label}>
                  {/* Date Header */}
                  <div className="pt-4 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      {group.label}
                    </span>
                  </div>
                  {/* Cards */}
                  <div className="space-y-3">
                    {group.items.map((n, idx) => (
                      <NotificationFeedCard
                        key={n.notification_id || `${n.notification_type}-${n.entity_id}-${idx}`}
                        {...n}
                        onResolve={handleResolve}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load Older */}
              <div className="flex justify-center pt-6 pb-2">
                <button
                  type="button"
                  onClick={handleLoadOlder}
                  className="text-sm font-bold text-neutral-500 hover:text-blue-500 transition-colors flex items-center gap-2"
                >
                  {t('notifications:actions.loadOlder')}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-4">
          <NotificationSidebar notifications={allNotifications} loading={isLoading} />
        </div>
      </div>

      {/* FAB: New Incident → Work Order */}
      <button
        type="button"
        onClick={() => navigate('/work-orders/new')}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full',
          'bg-blue-600 text-white shadow-lg',
          'flex items-center justify-center',
          'transition-all hover:scale-110 active:scale-95',
          'z-50 group'
        )}
        aria-label={t('notifications:actions.newIncident')}
      >
        <Plus className="w-6 h-6" />
        <span className="absolute right-full mr-3 bg-white dark:bg-[#201f1f] text-neutral-900 dark:text-neutral-100 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-neutral-200 dark:border-neutral-700 pointer-events-none">
          {t('notifications:actions.newIncident')}
        </span>
      </button>
    </PageContainer>
  );
}
