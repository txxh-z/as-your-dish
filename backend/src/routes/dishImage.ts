import { Router } from 'express';

import { HttpError } from '../middleware/errorHandler.js';
import { findDishImage } from '../services/imageSearch.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    if (!query.trim()) {
      throw new HttpError(400, 'missing_query', '缺少菜品图片搜索关键词。');
    }

    const image = await findDishImage(query);
    if (!image.url) {
      res.status(404).json(image);
      return;
    }

    res.json(image);
  } catch (err) {
    next(err);
  }
});

export { router as dishImageRouter };
