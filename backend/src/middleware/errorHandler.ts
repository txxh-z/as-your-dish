import type { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger.js';

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  // unexpected — log full and return generic 500 to client.
  // WHY: avoid leaking internal stack/details to the client; portfolio-quality basic.
  logger.error('unhandled error', { name: err?.name, message: err?.message });
  res.status(500).json({ error: 'internal_error', message: 'Internal server error' });
};
