import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../lib/errorHandler';
import {
  operationsItemKeys,
  fetchOperationsItems,
  fetchOperationsItem,
  createOperationsItem,
  updateOperationsItem,
  deleteOperationsItem,
  updateContactStatus,
  convertItemToWorkOrder,
  boomerangItem,
  fetchOperationsStats,
  cancelOperationsItem,
  closeOperationsItem,
} from './api';
import { importOperationsItems } from './importApi';
import { workOrderKeys } from '../workOrders/hooks';

// ── Queries ─────────────────────────────────────────────────────────────────

export function useOperationsItems(filters) {
  return useQuery({
    queryKey: operationsItemKeys.list(filters),
    queryFn: () => fetchOperationsItems(filters),
    staleTime: 60_000, // Pool status and contact status change frequently
  });
}

export function useOperationsItem(id) {
  return useQuery({
    queryKey: operationsItemKeys.detail(id),
    queryFn: () => fetchOperationsItem(id),
    enabled: !!id,
  });
}

export function useOperationsStats(dateFrom, dateTo) {
  return useQuery({
    queryKey: operationsItemKeys.stats({ dateFrom, dateTo }),
    queryFn: () => fetchOperationsStats(dateFrom, dateTo),
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────

/**
 * Create a new operations item (Quick Entry).
 */
export function useCreateOperationsItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: createOperationsItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });
      toast.success(t('toast.created'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.createFailed'));
    },
  });
}

/**
 * Update an operations item (edit fields).
 */
export function useUpdateOperationsItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: updateOperationsItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });
      toast.success(t('toast.updated'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.updateFailed'));
    },
  });
}

/**
 * Update contact status (traffic light).
 * Used by Call Queue and inline status buttons.
 */
export function useUpdateContactStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, contactStatus, contactNotes }) =>
      updateContactStatus(id, contactStatus, contactNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.updateFailed'));
    },
  });
}

/**
 * Convert a confirmed operations item to a work order.
 * Invalidates both operations_items and workOrders caches.
 */
export function useConvertToWorkOrder() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: ({ itemId, scheduleData }) =>
      convertItemToWorkOrder(itemId, scheduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      toast.success(t('toast.workOrderCreated'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.createFailed'));
    },
  });
}

/**
 * Boomerang a failed operations item back to the pool.
 * Invalidates both operations_items and workOrders caches.
 */
export function useBoomerangItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: ({ itemId, failureReason }) =>
      boomerangItem(itemId, failureReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      toast.success(t('toast.boomeranged'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.updateFailed'));
    },
  });
}

/**
 * Delete (soft) an operations item.
 */
export function useDeleteOperationsItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: deleteOperationsItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });
      toast.success(t('success.deleted'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.deleteFailed'));
    },
  });
}

/**
 * Cancel an operations item.
 */
export function useCancelOperationsItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: cancelOperationsItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });
      toast.success(t('toast.cancelled'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.updateFailed'));
    },
  });
}

/**
 * Close an operations item with a selected outcome.
 */
export function useCloseOperationsItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: ({ id, outcomeType, contactNotes }) =>
      closeOperationsItem(id, outcomeType, contactNotes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });

      const toastKey = `toast.outcome.${variables.outcomeType}`;
      toast.success(t(toastKey, { defaultValue: t('toast.updated') }));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.updateFailed'));
    },
  });
}

export function useImportOperationsItems({ onProgress } = {}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: (rows) => importOperationsItems(rows, { onProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: operationsItemKeys.stats() });
      toast.success(t('toast.import.created'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.importFailed'));
    },
  });
}
