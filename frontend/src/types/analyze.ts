import type { AnalyzeMenuResultWithSafety } from '@as-your-dish/shared';

export interface AnalyzeMenuResponse {
  cached: boolean;
  isExample?: boolean;
  exampleSlug?: string;
  menuId: string;
  result: AnalyzeMenuResultWithSafety;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model?: string;
  estimatedUsd?: number;
}
