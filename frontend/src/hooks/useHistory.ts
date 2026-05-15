import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet } from '../services/api';
import type {
  ClearHistoryResponse,
  HistoryDetailResponse,
  HistoryListResponse,
} from '../types/history';

export const HISTORY_QUERY_KEY = ['history'];

export function useHistory(enabled: boolean) {
  return useQuery({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: () => apiGet<HistoryListResponse>('/history'),
    enabled,
    retry: false,
  });
}

export function useHistoryDetail() {
  return useMutation({
    mutationFn: (menuId: string) =>
      apiGet<HistoryDetailResponse>(`/history/${encodeURIComponent(menuId)}`),
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete<ClearHistoryResponse>('/history'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
    },
  });
}
