import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../lib/errorHandler';
import * as recurringApi from './recurringApi';
import { recurringKeys } from './recurringApi';
import { transactionKeys, profitAndLossKeys, financeDashboardKeys, vatReportKeys } from './api';

// Templates
export function useTemplateLastGenerated() {
  return useQuery({
    queryKey: recurringKeys.lastGenerated(),
    queryFn: () => recurringApi.fetchTemplateLastGenerated(),
  });
}

export function useRecurringTemplates(filters) {
  return useQuery({
    queryKey: recurringKeys.list(filters),
    queryFn: () => recurringApi.fetchRecurringTemplates(filters),
  });
}

export function useCreateRecurringTemplate() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: recurringApi.createRecurringTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.lists() });
      toast.success(t('success.created'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.createFailed'));
    },
  });
}

export function useUpdateRecurringTemplate() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: ({ id, data }) => recurringApi.updateRecurringTemplate(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: recurringKeys.lists() });
      const previous = queryClient.getQueryData(recurringKeys.list(undefined));
      if (previous) {
        queryClient.setQueryData(recurringKeys.list(undefined), (old) =>
          old?.map((tpl) => (tpl.id === id ? { ...tpl, ...data } : tpl))
        );
      }
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      toast.success(t('success.updated'));
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(recurringKeys.list(undefined), context.previous);
      }
      toast.error(getErrorMessage(error, 'common.updateFailed'));
    },
  });
}

export function useDeleteRecurringTemplate() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: recurringApi.deleteRecurringTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      toast.success(t('success.deleted'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.deleteFailed'));
    },
  });
}

export function useTriggerRecurringGeneration() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('recurring');

  return useMutation({
    mutationFn: recurringApi.triggerRecurringGeneration,
    onSuccess: (count) => {
      // recurring templates (last-generated dates change)
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      // transaction lists (new rows were inserted)
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      // computed reports — all three must stay in sync after generation
      queryClient.invalidateQueries({ queryKey: profitAndLossKeys.all });
      queryClient.invalidateQueries({ queryKey: financeDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: vatReportKeys.all });
      if (typeof count === 'number') {
        toast.success(t('generate.success', { count }));
      } else {
        toast.success(t('generate.successGeneric'));
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'common.createFailed'));
    },
  });
}
