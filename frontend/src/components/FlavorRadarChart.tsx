import type { FlavorProfile } from '@as-your-dish/shared';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';

import { FLAVOR_LABELS_I18N, useLanguage } from '../i18n';

interface FlavorRadarChartProps {
  flavor: FlavorProfile;
}

const FLAVOR_AXES: Array<{
  key: keyof FlavorProfile;
}> = [
  { key: 'salty' },
  { key: 'sour' },
  { key: 'sweet' },
  { key: 'bitter' },
  { key: 'spicy' },
  { key: 'umami' },
];

export function FlavorRadarChart({ flavor }: FlavorRadarChartProps) {
  const { language } = useLanguage();
  const data = FLAVOR_AXES.map((axis) => ({
    axis: FLAVOR_LABELS_I18N[language][axis.key],
    value: flavor[axis.key],
    fullMark: 5,
  }));

  return (
    <>
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#cbd5e1" radialLines={false} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#475569', fontSize: 12 }}
              tickLine={false}
            />
            <Radar
              dataKey="value"
              stroke="#0f766e"
              fill="#14b8a6"
              fillOpacity={0.28}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[11px] leading-4 text-slate-600">
        {FLAVOR_AXES.map((axis) => (
          <div key={axis.key} className="min-w-0">
            <div className="font-medium text-slate-800">{flavor[axis.key]}</div>
            <div>{FLAVOR_LABELS_I18N[language][axis.key]}</div>
          </div>
        ))}
      </div>
    </>
  );
}
