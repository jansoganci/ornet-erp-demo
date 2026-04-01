import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../lib/errorHandler';
import {
  planItemKeys,
  fetchPlanItems,
  fetchPlanItemsRange,
  createPlanItem,
  updatePlanItemStatus,
  carryForwardPlanItem,
  deletePlanItem,
} from './planItemsApi';

export function usePlanItems(date) {
  return useQuery({
    queryKey: planItemKeys.byDate(date),
    queryFn: () => fetchPlanItems(date),
    enabled: !!date,
    staleTime: 30_000,
  });
}

export function usePlanItemsRange(dateFrom, dateTo) {
  return useQuery({
    queryKey: planItemKeys.range(dateFrom, dateTo),
    queryFn: () => fetchPlanItemsRange(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo,
  });
}

export function useCreatePlanItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: createPlanItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: planItemKeys.byDate(data.plan_date) });
      queryClient.invalidateQueries({ queryKey: planItemKeys.all });
      toast.success(t('toast.plan.created'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.createFailed'));
    },
  });
}

export function useUpdatePlanItemStatus() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: ({ id, status }) => updatePlanItemStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: planItemKeys.byDate(data.plan_date) });
      queryClient.invalidateQueries({ queryKey: planItemKeys.all });
      toast.success(t('toast.plan.updated'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.updateFailed'));
    },
  });
}

export function useCarryForwardPlanItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: ({ id, newDate }) => carryForwardPlanItem(id, newDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: planItemKeys.byDate(data.plan_date) });
      queryClient.invalidateQueries({ queryKey: planItemKeys.all });
      toast.success(t('toast.plan.carriedForward'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.createFailed'));
    },
  });
}

export function useDeletePlanItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('operations');

  return useMutation({
    mutationFn: ({ id, planDate }) => deletePlanItem(id).then(() => ({ planDate })),
    onSuccess: ({ planDate }) => {
      queryClient.invalidateQueries({ queryKey: planItemKeys.byDate(planDate) });
      queryClient.invalidateQueries({ queryKey: planItemKeys.all });
      toast.success(t('toast.plan.deleted'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.deleteFailed'));
    },
  });
}
