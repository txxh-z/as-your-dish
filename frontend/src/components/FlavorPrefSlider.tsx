interface FlavorPrefSliderProps {
  spicyMax: number;
  onChange: (spicyMax: number) => void;
}

export function FlavorPrefSlider({ spicyMax, onChange }: FlavorPrefSliderProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">口味上限</h2>
          <div className="mt-1 text-sm text-slate-600">辣度最高 {spicyMax}</div>
        </div>
        <div className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
          {spicyMax}/5
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={spicyMax}
        className="mt-4 w-full accent-slate-950"
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>0</span>
        <span>5</span>
      </div>
    </section>
  );
}
