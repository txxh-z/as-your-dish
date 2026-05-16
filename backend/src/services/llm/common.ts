import {
  AnalyzeMenuResult,
  TARGET_LANGUAGE_NAMES,
  type TargetLanguage,
} from '@as-your-dish/shared';

export type ImageMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif';

export function debugLog(...args: unknown[]): void {
  if (process.env.LLM_DEBUG === '1') console.error(...args);
}

export function buildMenuAnalysisInstruction(
  action: string,
  targetLanguage: TargetLanguage,
): string {
  return `Analyze these menu images. Identify every dish and ${action}.\n\n${targetLanguageInstruction(
    targetLanguage,
  )}`;
}

export function targetLanguageInstruction(
  targetLanguage: TargetLanguage,
): string {
  const languageName = TARGET_LANGUAGE_NAMES[targetLanguage];
  return [
    `Output language: ${languageName}.`,
    `Write translated_name, description, ingredients[].name, and warnings in ${languageName}.`,
    'Keep original_name verbatim from the menu photo, preserving the original language and script.',
    'Keep image_search_keywords in English for image search.',
    'Do not JSON-stringify schema fields. dishes, warnings, ingredients, allergens, dietary, and flavor must be native arrays/objects, not strings containing JSON.',
  ].join('\n');
}

export function parseMenuAnalysisJson(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(unfenced);
}

export function parseMenuAnalysisResult(input: unknown): AnalyzeMenuResult {
  const parsed = AnalyzeMenuResult.safeParse(coerceJsonStringFields(input));
  if (!parsed.success) {
    throw new Error(
      `LLM schema validation failed. issues=${JSON.stringify(parsed.error.issues)}`,
    );
  }
  return parsed.data;
}

export function safeParseMenuAnalysisText(
  text: string,
):
  | { success: true; data: AnalyzeMenuResult }
  | { success: false; issues: unknown } {
  try {
    const parsed = AnalyzeMenuResult.safeParse(
      coerceJsonStringFields(parseMenuAnalysisJson(text)),
    );
    if (parsed.success) return { success: true, data: parsed.data };
    return { success: false, issues: parsed.error.issues };
  } catch (err) {
    return {
      success: false,
      issues: [
        {
          message: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }
}

// WHY: some providers occasionally return top-level array/object fields as
// JSON-stringified blobs even when the schema declares native arrays/objects.
// Coerce those shallow fields before Zod validation.
const OPTIONAL_ARRAY_FIELDS = new Set(['warnings']);

export function coerceJsonStringFields(input: unknown): unknown {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          out[key] = JSON.parse(trimmed);
          continue;
        } catch {
          if (trimmed.startsWith('[') && OPTIONAL_ARRAY_FIELDS.has(key)) {
            debugLog(
              `[llm adapter] dropping malformed JSON string in optional field "${key}"`,
            );
            out[key] = [];
            continue;
          }
        }
      }
    }
    out[key] = value;
  }
  return out;
}

// Magic-byte sniff avoids shipping a heavy mime library and never trusts
// client-claimed types.
export function detectMediaType(buf: Buffer): ImageMediaType {
  if (buf.length >= 4) {
    if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      return 'image/png';
    }
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      return 'image/gif';
    }
    if (
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return 'image/webp';
    }
  }
  return 'image/jpeg';
}

export function upstreamError(
  provider: string,
  status: number,
  body: unknown,
): Error & { status: number; body: unknown } {
  const message =
    typeof body === 'object' && body !== null && 'error' in body
      ? JSON.stringify((body as { error: unknown }).error)
      : JSON.stringify(body);
  return Object.assign(new Error(`${provider} upstream ${status}: ${message}`), {
    status,
    body,
  });
}
