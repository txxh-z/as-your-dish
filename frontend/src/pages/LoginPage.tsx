import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ApiError, apiPostJson } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../types/auth';

const LoginSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少 8 位'),
});

type LoginForm = z.infer<typeof LoginSchema>;

function formatError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return '登录失败';
}

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: (body: LoginForm) => apiPostJson<AuthResponse>('/auth/login', body),
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
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">登录</h1>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit((values) => login.mutate(values))}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">邮箱</span>
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
            <span className="text-sm font-medium text-slate-700">密码</span>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-950"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <span className="mt-1 block text-xs text-red-700">
                {form.formState.errors.password.message}
              </span>
            )}
          </label>

          {login.isError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formatError(login.error)}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={login.isPending}
          >
            {login.isPending ? '登录中' : '登录'}
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-600">
          没有账号？
          <Link to="/register" className="ml-1 font-medium text-slate-950 underline">
            注册
          </Link>
        </div>
      </section>
    </main>
  );
}
