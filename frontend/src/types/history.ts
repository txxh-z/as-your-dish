import type { AnalyzeMenuResponse } from './analyze';

export interface HistoryItem {
  menuId: string;
  createdAt: string;
  languageDetected: string;
  dishesCount: number;
  previewDishes: string[];
}

export interface HistoryListResponse {
  items: HistoryItem[];
  nextOffset: number | null;
}

export type HistoryDetailResponse = AnalyzeMenuResponse & {
  createdAt: string;
};

export interface ClearHistoryResponse {
  deleted: number;
}
