import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../lib/errorHandler';
import { fetchProfiles } from '../tasks/api';
import { updateProfile } from './api';

const profilesDirectoryKey = ['profiles', 'directory'];

export function useAdminProfilesDirectory(enabled) {
  return useQuery({
    queryKey: profilesDirectoryKey,
    queryFn: () => fetchProfiles(),
    enabled: Boolean(enabled),
  });
}

export function useUpdateProfile() {
  const { t } = useTranslation('profile');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
      queryClient.invalidateQueries({ queryKey: profilesDirectoryKey });
      toast.success(t('success.updated'));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
