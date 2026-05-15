import { lazy, Suspense } from 'react';
import type { FlavorProfile } from '@as-your-dish/shared';

interface FlavorRadarProps {
  flavor: FlavorProfile;
}

const LazyFlavorRadarChart = lazy(() =>
  import('./FlavorRadarChart').then((module) => ({
    default: module.FlavorRadarChart,
  })),
);

export function FlavorRadar({ flavor }: FlavorRadarProps) {
  return (
    <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 px-2 py-3">
      <Suspense fallback={<div className="h-48 animate-pulse rounded bg-slate-200" />}>
        <LazyFlavorRadarChart flavor={flavor} />
      </Suspense>
    </div>
  );
}
