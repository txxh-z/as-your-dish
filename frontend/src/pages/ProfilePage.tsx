import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Allergen, Avoidance, DietaryTag } from '@as-your-dish/shared';

import { AllergenPicker } from '../components/AllergenPicker';
import { AuthNav } from '../components/AuthNav';
import { AvoidancePicker } from '../components/AvoidancePicker';
import { DietaryPicker } from '../components/DietaryPicker';
import { FlavorPrefGrid } from '../components/FlavorPrefGrid';
import { LanguageSelector } from '../components/LanguageSelector';
import { useClearHistory } from '../hooks/useHistory';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useLanguage } from '../i18n';
import { ApiError } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { FlavorPrefs } from '../types/profile';

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function ProfilePage() {
  const { copy } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const profileQuery = useProfile(Boolean(user));
  const updateProfile = useUpdateProfile();
  const clearHistory = useClearHistory();

  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [dietary, setDietary] = useState<DietaryTag[]>([]);
  const [avoidances, setAvoidances] = useState<Avoidance[]>([]);
  const [flavorPrefs, setFlavorPrefs] = useState<FlavorPrefs>({});

  useEffect(() => {
    const profile = profileQuery.data?.profile;
    if (!profile) return;
    setAllergens(profile.allergens);
    setDietary(profile.dietary);
    setAvoidances(profile.avoidances ?? []);
    setFlavorPrefs(profile.flavorPrefs ?? {});
  }, [profileQuery.data]);

  function handleSave() {
    updateProfile.mutate({
      allergens,
      dietary,
      avoidances,
      flavorPrefs,
    });
  }

  function handleClearHistory() {
    if (!window.confirm(copy.profile.clearConfirm)) return;
    clearHistory.mutate();
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col items-start gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
            <h1 className="text-xl font-semibold text-slate-950">
              {copy.profile.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSelector />
            <AuthNav />
          </div>
        </header>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{copy.profile.currentAccount}</div>
          <div className="mt-1 break-words text-lg font-semibold text-slate-950">
            {user?.email}
          </div>
        </section>

        {profileQuery.isLoading ? (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            {copy.profile.loading}
          </section>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <AllergenPicker value={allergens} onChange={setAllergens} />
              <DietaryPicker value={dietary} onChange={setDietary} />
              <AvoidancePicker value={avoidances} onChange={setAvoidances} />
            </div>
            <div className="space-y-4">
              <FlavorPrefGrid value={flavorPrefs} onChange={setFlavorPrefs} />

              {profileQuery.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {formatError(profileQuery.error, copy.profile.saveFailed)}
                </div>
              )}
              {updateProfile.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {formatError(updateProfile.error, copy.profile.saveFailed)}
                </div>
              )}
              {clearHistory.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {formatError(clearHistory.error, copy.profile.saveFailed)}
                </div>
              )}
              {updateProfile.isSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {copy.profile.saved}
                </div>
              )}
              {clearHistory.isSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {copy.profile.cleared(clearHistory.data.deleted)}
                </div>
              )}

              <button
                type="button"
                className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={updateProfile.isPending}
                onClick={handleSave}
              >
                {updateProfile.isPending ? copy.profile.saving : copy.profile.save}
              </button>
              <Link
                to="/"
                className="inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                {copy.profile.backToUpload}
              </Link>
              <button
                type="button"
                className="w-full rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                disabled={clearHistory.isPending}
                onClick={handleClearHistory}
              >
                {clearHistory.isPending
                  ? copy.profile.clearing
                  : copy.profile.clearHistory}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
