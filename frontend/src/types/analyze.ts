import type { AnalyzeMenuResult } from '@as-your-dish/shared';

export interface AnalyzeMenuResponse {
  cached: boolean;
  menuId: string;
  result: AnalyzeMenuResult;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model?: string;
  estimatedUsd?: number;
}
