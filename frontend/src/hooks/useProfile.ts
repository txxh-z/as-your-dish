import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPutJson } from '../services/api';
import { useProfileStore } from '../store/profileStore';
import type { Profile, ProfileResponse } from '../types/profile';

const PROFILE_QUERY_KEY = ['profile'];

export function useProfile(enabled: boolean) {
  const setProfile = useProfileStore((state) => state.setProfile);

  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => apiGet<ProfileResponse>('/profile'),
    enabled,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setProfile(query.data.profile);
  }, [query.data, setProfile]);

  return query;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setProfile = useProfileStore((state) => state.setProfile);

  return useMutation({
    mutationFn: (profile: Profile) =>
      apiPutJson<ProfileResponse>('/profile', profile),
    onSuccess: (data) => {
      setProfile(data.profile);
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
    },
  });
}
