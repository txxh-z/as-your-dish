import { Router } from 'express';
import { z } from 'zod';

import { requireUser } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { decorateAnalysisResult } from '../services/allergen.js';
import { attachDishImagesToResult } from '../services/imageSearch.js';
import { menusService } from '../services/menus.service.js';
import { getProfile } from '../services/profile.js';

const HistoryQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const router = Router();

router.get('/', requireUser, async (req, res, next) => {
  try {
    const parsed = HistoryQuery.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'invalid_history_query', '历史记录分页参数不正确。');
    }
    const query = parsed.data;
    const items = await menusService.listHistory(req.user!.id, query);
    res.json({
      items,
      nextOffset: items.length === query.limit ? query.offset + query.limit : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:menuId', requireUser, async (req, res, next) => {
  try {
    const menu = await menusService.findByIdForUser(req.params.menuId, req.user!.id);
    if (!menu) {
      throw new HttpError(404, 'history_not_found', '未找到这条菜单历史。');
    }

    const profile = await getProfile(req.user!.id);
    const checked = decorateAnalysisResult(
      menu.result,
      profile,
      menu.targetLanguage,
    );
    const response = await attachDishImagesToResult(checked.response);
    res.json({
      cached: true,
      menuId: menu.menuId,
      createdAt: menu.createdAt,
      result: response,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/', requireUser, async (req, res, next) => {
  try {
    const deleted = await menusService.clearHistory(req.user!.id);
    res.json({ deleted });
  } catch (err) {
    next(err);
  }
});

export { router as historyRouter };
