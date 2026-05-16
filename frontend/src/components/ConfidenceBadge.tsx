import { useLanguage } from '../i18n';

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { copy } = useLanguage();
  const percent = `${Math.round(confidence * 100)}%`;

  if (confidence < 0.7) {
    return (
      <div className="max-w-40 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium leading-5 text-amber-800">
        {copy.dish.lowConfidence}
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
      {percent}
    </div>
  );
}
