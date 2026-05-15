import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ApiError, apiPostJson } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../types/auth';

const RegisterSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少 8 位').max(128, '密码过长'),
});

type RegisterForm = z.infer<typeof RegisterSchema>;

function formatError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return '注册失败';
}

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
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
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">注册</h1>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit((values) => register.mutate(values))}
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
              {formatError(register.error)}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={register.isPending}
          >
            {register.isPending ? '注册中' : '注册'}
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-600">
          已有账号？
          <Link to="/login" className="ml-1 font-medium text-slate-950 underline">
            登录
          </Link>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          我们会保存你的菜单历史，可在档案页一键清空。
        </p>
      </section>
    </main>
  );
}
