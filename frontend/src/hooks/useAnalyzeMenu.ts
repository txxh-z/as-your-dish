import { useMutation } from '@tanstack/react-query';

import { apiPostForm } from '../services/api';
import type { AnalyzeMenuResponse } from '../types/analyze';
import { compressMenuImages } from '../utils/compress';

export function useAnalyzeMenu() {
  return useMutation({
    mutationFn: async (files: File[]): Promise<AnalyzeMenuResponse> => {
      const compressed = await compressMenuImages(files);
      const form = new FormData();
      compressed.forEach((file) => form.append('images', file));
      return apiPostForm<AnalyzeMenuResponse>('/analyze-menu', form);
    },
  });
}
