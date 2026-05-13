// minimal logger. swap for pino in phase 5 if needed.
// WHY: never log user.profile fields, API keys, or X-Anthropic-Key header values.
// callers are responsible for redacting; logger is intentionally dumb.

type Level = 'debug' | 'info' | 'warn' | 'error';

function ts(): string {
  return new Date().toISOString();
}

function log(level: Level, msg: string, meta?: unknown) {
  const line = meta === undefined ? `[${ts()}] ${level.toUpperCase()} ${msg}` : `[${ts()}] ${level.toUpperCase()} ${msg} ${JSON.stringify(meta)}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
};
