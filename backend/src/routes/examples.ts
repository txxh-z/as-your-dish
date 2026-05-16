import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Router } from 'express';

import { HttpError } from '../middleware/errorHandler.js';

const EXAMPLE_FILENAME_PATTERN = /^[a-z0-9-]+\.jpg$/;

// WHY: resolve relative to this module so the path is correct in both dev
// (backend/src/routes/examples.ts) and the compiled image
// (backend/dist/routes/examples.js) — process.cwd() was `backend/` locally
// but `/app` inside the Fly container, which broke `/api/examples/:slug` in
// production while local development still worked.
function getExamplesDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../examples');
}

const router = Router();

router.get('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!EXAMPLE_FILENAME_PATTERN.test(filename)) {
      throw new HttpError(404, 'example_image_not_found', '未找到示例菜单图片。');
    }

    const filePath = resolve(getExamplesDir(), filename);
    await access(filePath);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  } catch (err) {
    if (err instanceof HttpError) {
      next(err);
      return;
    }
    next(new HttpError(404, 'example_image_not_found', '未找到示例菜单图片。'));
  }
});

export { router as examplesRouter };
