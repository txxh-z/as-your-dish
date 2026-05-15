export function DishCardSkeleton() {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="aspect-[4/3] animate-pulse rounded-md bg-slate-200" />
      <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 space-y-2">
        <div className="h-3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-7 animate-pulse rounded bg-slate-100" />
        <div className="h-7 animate-pulse rounded bg-slate-100" />
        <div className="h-7 animate-pulse rounded bg-slate-100" />
      </div>
    </article>
  );
}
