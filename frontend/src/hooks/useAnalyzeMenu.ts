import { useMutation } from '@tanstack/react-query';
import type { TargetLanguage } from '@as-your-dish/shared';

import { apiPostForm } from '../services/api';
import type { AnalyzeMenuResponse } from '../types/analyze';
import { compressMenuImages } from '../utils/compress';

export function useAnalyzeMenu() {
  return useMutation({
    mutationFn: async ({
      files,
      targetLanguage,
    }: {
      files: File[];
      targetLanguage: TargetLanguage;
    }): Promise<AnalyzeMenuResponse> => {
      const compressed = await compressMenuImages(files);
      const form = new FormData();
      compressed.forEach((file) => form.append('images', file));
      form.append('targetLanguage', targetLanguage);
      return apiPostForm<AnalyzeMenuResponse>('/analyze-menu', form);
    },
  });
}
