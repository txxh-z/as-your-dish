import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { LanguageSelector } from '../components/LanguageSelector';
import { useLanguage } from '../i18n';
import { ApiError, apiPostJson } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../types/auth';

interface RegisterForm {
  email: string;
  password: string;
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const { copy } = useLanguage();
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(copy.auth.invalidEmail),
        password: z
          .string()
          .min(8, copy.auth.passwordMin)
          .max(128, copy.auth.passwordMax),
      }),
    [copy],
  );
  const form = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const register = useMutation({
    mutationFn: (body: RegisterForm) =>
      apiPostJson<AuthResponse>('/auth/register', body),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['auth', 'me'], { user: data.user });
      navigate('/profile', { replace: true });
    },
  });

  return (
    <main className="min-h-full bg-slate-50 px-4 py-6">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-slate-950">
              {copy.auth.register}
            </h1>
            <LanguageSelector />
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit((values) => register.mutate(values))}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {copy.auth.email}
            </span>
            <input
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-950"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <span className="mt-1 block text-xs text-red-700">
                {form.formState.errors.email.message}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {copy.auth.password}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-950"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <span className="mt-1 block text-xs text-red-700">
                {form.formState.errors.password.message}
              </span>
            )}
          </label>

          {register.isError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formatError(register.error, copy.auth.registerFailed)}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={register.isPending}
          >
            {register.isPending ? copy.auth.registering : copy.auth.register}
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-600">
          {copy.auth.hasAccount}
          <Link to="/login" className="ml-1 font-medium text-slate-950 underline">
            {copy.auth.login}
          </Link>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {copy.auth.registerNote}
        </p>
      </section>
    </main>
  );
}
