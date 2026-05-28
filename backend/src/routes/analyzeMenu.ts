import {
  DEFAULT_LLM_MODEL_BY_PROVIDER,
  LLM_PROVIDER_IMAGE_INPUT_SUPPORTED,
  LLM_PROVIDER_LABELS,
  isLLMModelForProvider,
  isLLMProviderName,
  normalizeLLMModel,
  normalizeLLMProvider,
  normalizeTargetLanguage,
  isTargetLanguage,
  type LLMProviderName,
  type TargetLanguage,
} from '@as-your-dish/shared';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import multer from 'multer';
import { dailyAnonymousDemoLimit } from '../middleware/demoLimit.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  analyzeMenuRateLimiter,
  monthlyUserQuota,
} from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import { combineImageHashes, sha256Hex } from '../services/hash.js';
import { attachDishImagesToResult } from '../services/imageSearch.js';
import { decorateAnalysisResult } from '../services/allergen.js';
import { getLLMProvider, hasServerApiKey } from '../services/llm/index.js';
import type { AnalyzeOutcome, LLMProvider } from '../services/llm/provider.js';
import { recordCall } from '../services/llmAccounting.js';
import { menusService } from '../services/menus.service.js';
import { getProfile, type ProfilePayload } from '../services/profile.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const FIELD_NAME = 'images';
const REQUIRED_FETCH_HEADER = 'x-requested-with';

// WHY: multipart/form-data is a CORS "simple request" and skips preflight,
// which means a logged-in user visiting a malicious site could be tricked
// into POSTing to /api/analyze-menu with cookies attached, burning their
// quota and polluting their menu history. Requiring a custom header turns
// the request non-simple → browser must preflight → CORS allowlist rejects
// foreign origins. A `<form>` submit cannot set this header either.
function requireFetchHeader(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.headers[REQUIRED_FETCH_HEADER]) {
    next(
      new HttpError(403, 'missing_fetch_header', '请通过应用页面发起请求。'),
    );
    return;
  }
  next();
}

interface AnalyzeMenuContext {
  buffers: Buffer[];
  imageHash: string;
  targetLanguage: TargetLanguage;
  providerName: LLMProviderName;
  model: string;
  apiKey?: string;
  keySource: 'server' | 'user';
  provider: LLMProvider;
  userId: string | null;
  profile: ProfilePayload | null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
});

// WHY: multer surfaces upload-size / file-count violations as MulterError,
// which the default errorHandler would map to a generic 500. Convert them
// to specific HttpError so the client sees an actionable status + code
// (413/400) instead of "internal error".
function handleMultipartUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.array(FIELD_NAME, MAX_FILES)(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new HttpError(
            413,
            'file_too_large',
            `单个文件超过 ${MAX_FILE_BYTES / 1024 / 1024}MB 限制，请压缩后再试。`,
          ),
        );
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(
          new HttpError(400, 'too_many_files', `一次最多 ${MAX_FILES} 张图。`),
        );
      }
      return next(new HttpError(400, 'upload_error', err.message));
    }
    return next(err);
  });
}

function readStringHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return typeof value === 'string' ? value.trim() : undefined;
}

function readStringBody(req: Request, name: string): string | undefined {
  const value = req.body?.[name];
  return typeof value === 'string' ? value.trim() : undefined;
}

function readLLMProvider(req: Request): LLMProviderName {
  const raw =
    readStringBody(req, 'llmProvider') ?? readStringHeader(req, 'x-llm-provider');
  if (raw && !isLLMProviderName(raw)) {
    throw new HttpError(400, 'invalid_llm_provider', '不支持的 LLM 服务商。');
  }
  return normalizeLLMProvider(raw);
}

function readLLMModel(req: Request, provider: LLMProviderName): string {
  const raw =
    readStringBody(req, 'llmModel') ?? readStringHeader(req, 'x-llm-model');
  if (raw && !isLLMModelForProvider(provider, raw)) {
    throw new HttpError(400, 'invalid_llm_model', '不支持的 LLM 模型。');
  }
  return normalizeLLMModel(provider, raw);
}

function isPlausibleApiKey(
  provider: LLMProviderName,
  value: string,
): boolean {
  if (provider === 'anthropic') return value.startsWith('sk-ant-') && value.length >= 30;
  if (provider === 'openai') return value.startsWith('sk-') && value.length >= 20;
  return value.length >= 20 && !/\s/.test(value);
}

// WHY: BYO-key path per PROJECT_PLAN §12.3. Read provider-neutral headers first,
// then provider-specific/legacy headers, then multipart body. Format check is
// intentionally lenient: malformed values are ignored and never logged.
function readUserApiKey(
  req: Request,
  provider: LLMProviderName,
): string | undefined {
  const genericHeader = readStringHeader(req, 'x-llm-api-key');
  const providerHeader = readStringHeader(req, `x-${provider}-key`);
  const legacyAnthropicHeader =
    provider === 'anthropic' ? readStringHeader(req, 'x-anthropic-key') : undefined;
  const body =
    readStringBody(req, 'apiKey') ?? readStringBody(req, `${provider}ApiKey`);
  const candidate =
    genericHeader ?? providerHeader ?? legacyAnthropicHeader ?? body;
  if (!candidate) return undefined;
  return isPlausibleApiKey(provider, candidate) ? candidate : undefined;
}

function readTargetLanguage(req: Request): TargetLanguage {
  const raw = readStringBody(req, 'targetLanguage');
  if (raw && !isTargetLanguage(raw)) {
    throw new HttpError(400, 'invalid_target_language', '不支持的输出语言。');
  }
  return normalizeTargetLanguage(raw);
}

function cacheHashForAnalysis(
  imageHash: string,
  targetLanguage: TargetLanguage,
  provider: LLMProviderName,
  model: string,
): string {
  if (
    provider === 'anthropic' &&
    model === DEFAULT_LLM_MODEL_BY_PROVIDER.anthropic
  ) {
    return targetLanguage === 'zh' ? imageHash : `${targetLanguage}:${imageHash}`;
  }
  return `${targetLanguage}:${provider}:${model}:${imageHash}`;
}

function readErrorStatus(err: unknown): number | undefined {
  if (err === null || typeof err !== 'object') return undefined;
  const status = (err as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function readErrorMessage(err: unknown): string | undefined {
  if (err === null || typeof err !== 'object') return undefined;
  const message = (err as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}

function toProviderHttpError(
  err: unknown,
  keySource: 'server' | 'user',
  provider: LLMProviderName,
): HttpError | null {
  const status = readErrorStatus(err);
  if (!status) return null;
  // WHY: keep upstream error visible in server logs so future 4xx/5xx from
  // a provider can be diagnosed from stderr instead of guessing. Status code
  // is enough to know the category; message carries the provider's own text.
  logger.warn('llm upstream error', {
    provider,
    status,
    keySource,
    message: readErrorMessage(err),
  });
  const providerLabel = LLM_PROVIDER_LABELS[provider];
  const codePrefix = provider === 'anthropic' ? 'anthropic' : provider;

  if (status === 401) {
    return new HttpError(
      401,
      `${codePrefix}_auth_failed`,
      keySource === 'user'
        ? `你提供的 ${providerLabel} API key 无效，请检查后重试。`
        : `服务器 ${providerLabel} API key 无效，请使用自己的 API key 后重试。`,
    );
  }

  if (status === 403) {
    return new HttpError(
      403,
      `${codePrefix}_permission_denied`,
      keySource === 'user'
        ? `你提供的 ${providerLabel} API key 没有权限调用当前模型。`
        : `服务器 ${providerLabel} API key 没有权限调用当前模型，请使用自己的 API key 后重试。`,
    );
  }

  if (status === 429) {
    if (keySource === 'server') {
      return new HttpError(
        402,
        'quota_exceeded',
        `服务端 ${providerLabel} 额度或频率限制已触发，请使用自己的 API key。`,
      );
    }
    return new HttpError(
      429,
      `${codePrefix}_rate_limited`,
      `你的 ${providerLabel} API key 额度或频率限制已触发，请稍后重试或更换 key。`,
    );
  }

  // WHY: Anthropic surfaces "spending limit reached" as 400
  // invalid_request_error rather than 429. Without this special case it falls
  // through to the generic 502 mapping, hiding the real cause (account hit a
  // user-configured budget cap and is locked until reset).
  if (status === 400) {
    const message = readErrorMessage(err) ?? '';
    if (/usage limits|spending limit|credit balance/i.test(message)) {
      return new HttpError(
        402,
        `${codePrefix}_budget_exceeded`,
        keySource === 'user'
          ? `你的 ${providerLabel} 账户用量已达上限，请到 console 提高额度或更换 key。`
          : `服务端 ${providerLabel} 账户用量已达上限，请使用自己的 API key 或换一个 provider。`,
      );
    }
  }

  if (status >= 400) {
    return new HttpError(
      502,
      `${codePrefix}_upstream_error`,
      `${providerLabel} API 请求失败，请稍后重试。`,
    );
  }

  return null;
}

async function prepareAnalyzeMenuRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new HttpError(400, 'no_images', '需要至少 1 张菜单图。');
    }

    const buffers = files.map((f) => f.buffer);
    const perImage = buffers.map((b) => sha256Hex(b));
    const rawImageHash = combineImageHashes(perImage);
    const targetLanguage = readTargetLanguage(req);
    const providerName = readLLMProvider(req);
    const model = readLLMModel(req, providerName);
    if (!LLM_PROVIDER_IMAGE_INPUT_SUPPORTED[providerName]) {
      throw new HttpError(
        400,
        'provider_image_input_unsupported',
        `${LLM_PROVIDER_LABELS[providerName]} 当前官方 API 不支持图片输入，无法直接分析菜单照片。请改用支持视觉的服务商，或先接入 OCR 后再使用该服务商。`,
      );
    }
    const imageHash = cacheHashForAnalysis(
      rawImageHash,
      targetLanguage,
      providerName,
      model,
    );
    const apiKey = readUserApiKey(req, providerName);
    const provider = getLLMProvider(providerName);
    const keySource: 'server' | 'user' = apiKey ? 'user' : 'server';
    const userId = req.user?.id ?? null;
    const profile = userId ? await getProfile(userId) : null;

    // ----- cache check -----
    const cached = await menusService.findByImageHash(imageHash);
    if (cached) {
      if (userId) await menusService.recordHistory(cached.menuId, userId);
      const checked = decorateAnalysisResult(
        cached.result,
        profile,
        targetLanguage,
      );
      const response = await attachDishImagesToResult(checked.response);
      await recordCall({
        provider: provider.name,
        model,
        inputTokens: 0,
        outputTokens: 0,
        estimatedUsd: 0,
        keySource,
        cacheHit: true,
        status: 'ok',
        callType: 'analyze_menu',
        userId,
      });
      res.json({
        cached: true,
        result: response,
        menuId: cached.menuId,
      });
      return;
    }

    if (!apiKey && !hasServerApiKey(providerName)) {
      throw new HttpError(
        402,
        'provider_key_required',
        `当前 ${LLM_PROVIDER_LABELS[providerName]} 没有配置服务端 API key，请添加自己的 API key 后重试。`,
      );
    }

    res.locals.analyzeMenu = {
      buffers,
      imageHash,
      targetLanguage,
      providerName,
      model,
      apiKey,
      keySource,
      provider,
      userId,
      profile,
    } satisfies AnalyzeMenuContext;
    next();
  } catch (err) {
    next(err);
  }
}

async function analyzeMenuHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ctx = res.locals.analyzeMenu as AnalyzeMenuContext | undefined;
    if (!ctx) {
      throw new Error('analyzeMenuHandler: missing prepared request context.');
    }

    // ----- LLM call -----
    let outcome: AnalyzeOutcome;
    try {
      outcome = await ctx.provider.analyze(ctx.buffers, {
        apiKey: ctx.apiKey,
        model: ctx.model,
        userId: ctx.userId,
        targetLanguage: ctx.targetLanguage,
      });
    } catch (err) {
      await recordCall({
        provider: ctx.provider.name,
        model: ctx.model,
        inputTokens: 0,
        outputTokens: 0,
        estimatedUsd: 0,
        keySource: ctx.keySource,
        cacheHit: false,
        status: 'error',
        callType: 'analyze_menu',
        userId: ctx.userId,
      });
      throw toProviderHttpError(err, ctx.keySource, ctx.providerName) ?? err;
    }

    // ----- accounting (fire and forget, never blocks the response) -----
    await recordCall({
      provider: ctx.provider.name,
      model: outcome.model,
      inputTokens: outcome.usage.inputTokens,
      outputTokens: outcome.usage.outputTokens,
      estimatedUsd: outcome.estimatedUsd,
      keySource: outcome.keySource,
      cacheHit: false,
      status: 'ok',
      callType: 'analyze_menu',
      userId: ctx.userId,
    });

    const checked = decorateAnalysisResult(
      outcome.result,
      ctx.profile,
      ctx.targetLanguage,
    );

    // ----- persist menus + dishes (cache for the next identical upload) -----
    const { menuId } = await menusService.saveAnalysisResult({
      imageHash: ctx.imageHash,
      userId: ctx.userId,
      result: checked.result,
    });

    const response = await attachDishImagesToResult(checked.response);

    res.json({
      cached: false,
      menuId,
      result: response,
      usage: outcome.usage,
      model: outcome.model,
      estimatedUsd: outcome.estimatedUsd,
    });
  } catch (err) {
    next(err);
  }
}

const router = Router();
router.post(
  '/',
  requireFetchHeader,
  analyzeMenuRateLimiter,
  handleMultipartUpload,
  prepareAnalyzeMenuRequest,
  dailyAnonymousDemoLimit,
  monthlyUserQuota,
  analyzeMenuHandler,
);

export const analyzeMenuRouter = router;
