import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Allergen, DietaryTag } from '@as-your-dish/shared';

import { AllergenPicker } from '../components/AllergenPicker';
import { AuthNav } from '../components/AuthNav';
import { DietaryPicker } from '../components/DietaryPicker';
import { FlavorPrefSlider } from '../components/FlavorPrefSlider';
import { useClearHistory } from '../hooks/useHistory';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { ApiError } from '../services/api';
import { useAuthStore } from '../store/authStore';

function formatError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return '保存失败';
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const profileQuery = useProfile(Boolean(user));
  const updateProfile = useUpdateProfile();
  const clearHistory = useClearHistory();

  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [dietary, setDietary] = useState<DietaryTag[]>([]);
  const [spicyMax, setSpicyMax] = useState(5);

  useEffect(() => {
    const profile = profileQuery.data?.profile;
    if (!profile) return;
    setAllergens(profile.allergens);
    setDietary(profile.dietary);
    setSpicyMax(profile.flavorPrefs.spicy_max ?? 5);
  }, [profileQuery.data]);

  function handleSave() {
    updateProfile.mutate({
      allergens,
      dietary,
      flavorPrefs: { spicy_max: spicyMax },
    });
  }

  function handleClearHistory() {
    if (!window.confirm('确认清空所有菜单历史？')) return;
    clearHistory.mutate();
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col items-start gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
            <h1 className="text-xl font-semibold text-slate-950">个人档案</h1>
          </div>
          <AuthNav />
        </header>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">当前账号</div>
          <div className="mt-1 break-words text-lg font-semibold text-slate-950">
            {user?.email}
          </div>
        </section>

        {profileQuery.isLoading ? (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            正在加载档案
          </section>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <AllergenPicker value={allergens} onChange={setAllergens} />
              <DietaryPicker value={dietary} onChange={setDietary} />
            </div>
            <div className="space-y-4">
              <FlavorPrefSlider spicyMax={spicyMax} onChange={setSpicyMax} />

              {profileQuery.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {formatError(profileQuery.error)}
                </div>
              )}
              {updateProfile.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {formatError(updateProfile.error)}
                </div>
              )}
              {clearHistory.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {formatError(clearHistory.error)}
                </div>
              )}
              {updateProfile.isSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  已保存
                </div>
              )}
              {clearHistory.isSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  已清空 {clearHistory.data.deleted} 条历史
                </div>
              )}

              <button
                type="button"
                className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={updateProfile.isPending}
                onClick={handleSave}
              >
                {updateProfile.isPending ? '保存中' : '保存档案'}
              </button>
              <Link
                to="/"
                className="inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                返回上传
              </Link>
              <button
                type="button"
                className="w-full rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                disabled={clearHistory.isPending}
                onClick={handleClearHistory}
              >
                {clearHistory.isPending ? '清空中' : '清空历史'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
