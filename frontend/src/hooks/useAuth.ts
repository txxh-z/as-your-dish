import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPostJson } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { MeResponse } from '../types/auth';

export function useAuth() {
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiGet<MeResponse>('/auth/me'),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) setUser(query.data.user);
  }, [query.data, setUser]);

  return {
    user: query.data?.user ?? user,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: () => apiPostJson<{ ok: true }>('/auth/logout'),
    onSuccess: () => {
      clearUser();
      queryClient.setQueryData(['auth', 'me'], { user: null });
    },
  });
}
