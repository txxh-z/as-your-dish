import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import multer from 'multer';
import { HttpError } from '../middleware/errorHandler.js';
import {
  analyzeMenuRateLimiter,
  monthlyUserQuota,
} from '../middleware/rateLimit.js';
import { combineImageHashes, sha256Hex } from '../services/hash.js';
import { getLLMProvider } from '../services/llm/index.js';
import type { AnalyzeOutcome, LLMProvider } from '../services/llm/provider.js';
import { recordCall } from '../services/llmAccounting.js';
import { menusService } from '../services/menus.service.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const FIELD_NAME = 'images';

interface AnalyzeMenuContext {
  buffers: Buffer[];
  imageHash: string;
  apiKey?: string;
  keySource: 'server' | 'user';
  provider: LLMProvider;
  userId: string | null;
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

// WHY: BYO-key path per PROJECT_PLAN §12.3. Read from header first (frontend
// UI surface), fall back to multipart body field (escape hatch). Format
// check is intentionally lenient — wrong prefix or too-short → silently
// ignore and fall back to server key, never log the value.
function readUserApiKey(req: Request): string | undefined {
  const headerValue = req.headers['x-anthropic-key'];
  const header = typeof headerValue === 'string' ? headerValue : undefined;
  const body =
    typeof req.body?.apiKey === 'string' ? (req.body.apiKey as string) : undefined;
  const candidate = header ?? body;
  if (!candidate) return undefined;
  if (!candidate.startsWith('sk-ant-') || candidate.length < 30) {
    return undefined;
  }
  return candidate;
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
    const imageHash = combineImageHashes(perImage);
    const apiKey = readUserApiKey(req);
    const provider = getLLMProvider();
    const keySource: 'server' | 'user' = apiKey ? 'user' : 'server';
    const userId = null;

    // ----- cache check -----
    const cached = await menusService.findByImageHash(imageHash);
    if (cached) {
      await recordCall({
        provider: provider.name,
        model: provider.defaultModel,
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
        result: cached.result,
        menuId: cached.menuId,
      });
      return;
    }

    res.locals.analyzeMenu = {
      buffers,
      imageHash,
      apiKey,
      keySource,
      provider,
      userId,
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
        userId: ctx.userId,
      });
    } catch (err) {
      await recordCall({
        provider: ctx.provider.name,
        model: ctx.provider.defaultModel,
        inputTokens: 0,
        outputTokens: 0,
        estimatedUsd: 0,
        keySource: ctx.keySource,
        cacheHit: false,
        status: 'error',
        callType: 'analyze_menu',
        userId: ctx.userId,
      });
      throw err;
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

    // ----- persist menus + dishes (cache for the next identical upload) -----
    const { menuId } = await menusService.saveAnalysisResult({
      imageHash: ctx.imageHash,
      userId: ctx.userId,
      result: outcome.result,
    });

    res.json({
      cached: false,
      menuId,
      result: outcome.result,
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
  analyzeMenuRateLimiter,
  handleMultipartUpload,
  prepareAnalyzeMenuRequest,
  monthlyUserQuota,
  analyzeMenuHandler,
);

export const analyzeMenuRouter = router;
