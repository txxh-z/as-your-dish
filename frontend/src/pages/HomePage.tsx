import { useState } from 'react';
import {
  DEFAULT_LLM_MODEL_BY_PROVIDER,
  isLLMModelForProvider,
  normalizeLLMModel,
  normalizeLLMProvider,
  type LLMProviderName,
  type TargetLanguage,
} from '@as-your-dish/shared';
import { useNavigate } from 'react-router-dom';

import { ApiKeyDialog } from '../components/ApiKeyDialog';
import { AuthNav } from '../components/AuthNav';
import { DishCardSkeleton } from '../components/DishCardSkeleton';
import { ExamplePickerDialog } from '../components/ExamplePickerDialog';
import { LanguageSelector } from '../components/LanguageSelector';
import { LlmSelector } from '../components/LlmSelector';
import { MenuUploader } from '../components/MenuUploader';
import { useToast } from '../components/Toast';
import { ApiError } from '../services/api';
import { useAnalyzeMenu } from '../hooks/useAnalyzeMenu';
import { useLanguage } from '../i18n';
import { removeStoredProviderApiKey } from '../utils/apiKey';
import type { AnalyzeMenuResponse } from '../types/analyze';

const LAST_ANALYSIS_KEY = 'as-your-dish:last-analysis';
const LLM_PROVIDER_STORAGE = 'as-your-dish:llm-provider';
const LLM_MODEL_STORAGE_PREFIX = 'as-your-dish:llm-model:';

interface AnalyzeSelection {
  files: File[];
  llmModel: string;
  llmProvider: LLMProviderName;
  targetLanguage: TargetLanguage;
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${err.status} ${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return fallback;
}

function llmModelStorageKey(provider: LLMProviderName): string {
  return `${LLM_MODEL_STORAGE_PREFIX}${provider}`;
}

function readInitialProvider(): LLMProviderName {
  return normalizeLLMProvider(localStorage.getItem(LLM_PROVIDER_STORAGE));
}

function readInitialModel(provider: LLMProviderName): string {
  return normalizeLLMModel(
    provider,
    localStorage.getItem(llmModelStorageKey(provider)),
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const analyzeMenu = useAnalyzeMenu();
  const { showToast } = useToast();
  const { language, copy } = useLanguage();
  const [llmProvider, setLlmProviderState] =
    useState<LLMProviderName>(readInitialProvider);
  const [llmModel, setLlmModelState] = useState(() =>
    readInitialModel(readInitialProvider()),
  );
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [apiKeyDialogReason, setApiKeyDialogReason] = useState<
    'quota' | 'invalid'
  >('quota');
  const [apiKeyDialogProvider, setApiKeyDialogProvider] =
    useState<LLMProviderName>(llmProvider);
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const [pendingAnalyze, setPendingAnalyze] =
    useState<AnalyzeSelection | null>(null);

  function setLlmProvider(provider: LLMProviderName) {
    const model = readInitialModel(provider);
    localStorage.setItem(LLM_PROVIDER_STORAGE, provider);
    setLlmProviderState(provider);
    setLlmModelState(model);
  }

  function setLlmModel(model: string) {
    if (!isLLMModelForProvider(llmProvider, model)) return;
    localStorage.setItem(llmModelStorageKey(llmProvider), model);
    setLlmModelState(model);
  }

  function startAnalyze(files: File[], override?: AnalyzeSelection) {
    const selection: AnalyzeSelection =
      override ?? {
        files,
        targetLanguage: language,
        llmProvider,
        llmModel:
          llmModel || DEFAULT_LLM_MODEL_BY_PROVIDER[llmProvider],
      };
    setPendingAnalyze(selection);
    analyzeMenu.mutate(selection, {
      onSuccess: (data: AnalyzeMenuResponse) => {
        setPendingAnalyze(null);
        sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(data));
        navigate('/results', { state: data });
      },
      onError: (err) => {
        if (
          err instanceof ApiError &&
          err.status === 402 &&
          (err.code === 'quota_exceeded' ||
            err.code === 'provider_key_required')
        ) {
          setApiKeyDialogProvider(selection.llmProvider);
          setApiKeyDialogReason('quota');
          setQuotaDialogOpen(true);
          return;
        }
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403) &&
          (err.code.endsWith('_auth_failed') ||
            err.code.endsWith('_permission_denied'))
        ) {
          removeStoredProviderApiKey(selection.llmProvider);
          setApiKeyDialogProvider(selection.llmProvider);
          setApiKeyDialogReason('invalid');
          setQuotaDialogOpen(true);
          return;
        }
        showToast('error', formatError(err, copy.home.analyzeFailed));
      },
    });
  }

  function openExample(data: AnalyzeMenuResponse) {
    sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(data));
    setExampleDialogOpen(false);
    navigate('/results', { state: data });
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col items-start gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
            <h1 className="text-xl font-semibold text-slate-950">
              {copy.home.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LlmSelector
              provider={llmProvider}
              model={llmModel}
              onProviderChange={setLlmProvider}
              onModelChange={setLlmModel}
            />
            <LanguageSelector />
            <AuthNav />
          </div>
        </header>

        <div className="grid flex-1 items-start gap-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <MenuUploader
            disabled={analyzeMenu.isPending}
            onTryExample={() => setExampleDialogOpen(true)}
            onSubmit={startAnalyze}
          />

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-950">
              {copy.home.output}
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{copy.home.imageLimit}</dt>
                <dd className="font-medium text-slate-800">
                  {copy.home.imageLimitValue}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{copy.home.resultFields}</dt>
                <dd className="font-medium text-slate-800">
                  {copy.home.resultFieldsValue}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{copy.home.cache}</dt>
                <dd className="font-medium text-slate-800">
                  {copy.home.cacheValue}
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        {analyzeMenu.isPending && (
          <section className="grid gap-4 pb-5 md:grid-cols-2 xl:grid-cols-3">
            <DishCardSkeleton />
            <DishCardSkeleton />
            <DishCardSkeleton />
          </section>
        )}

        <ApiKeyDialog
          open={quotaDialogOpen}
          provider={apiKeyDialogProvider}
          reason={apiKeyDialogReason}
          onClose={() => setQuotaDialogOpen(false)}
          onSaved={() => {
            if (pendingAnalyze) startAnalyze(pendingAnalyze.files, pendingAnalyze);
          }}
        />
        <ExamplePickerDialog
          open={exampleDialogOpen}
          onClose={() => setExampleDialogOpen(false)}
          onSelected={openExample}
        />
      </div>
    </main>
  );
}

export { LAST_ANALYSIS_KEY };
