import { Router } from 'express';

import { HttpError } from '../middleware/errorHandler.js';
import { decorateAnalysisResult } from '../services/allergen.js';
import { attachDishImagesToResult } from '../services/imageSearch.js';
import { menusService } from '../services/menus.service.js';
import { getProfile } from '../services/profile.js';

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const router = Router();

function baseExampleSlug(slug: string): string {
  return slug.replace(/-(en|ko)$/, '');
}

router.get('/', async (_req, res, next) => {
  try {
    const items = await menusService.listExampleMenus();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!SLUG_PATTERN.test(slug)) {
      throw new HttpError(404, 'demo_menu_not_found', '未找到这份示例菜单。');
    }

    const menu = await menusService.findExampleBySlug(slug);
    if (!menu) {
      throw new HttpError(404, 'demo_menu_not_found', '未找到这份示例菜单。');
    }

    const profile = req.user ? await getProfile(req.user.id) : null;
    const checked = decorateAnalysisResult(
      menu.result,
      profile,
      menu.targetLanguage,
    );
    const response = await attachDishImagesToResult(checked.response);

    // WHY: demo menus are curated/static reads, not LLM calls and not
    // analyze-menu cache hits. Recording them in `llm_calls` would corrupt
    // monthly quota and operator cost accounting semantics.
    res.json({
      cached: true,
      isExample: true,
      exampleSlug: baseExampleSlug(slug),
      menuId: menu.menuId,
      result: response,
    });
  } catch (err) {
    next(err);
  }
});

export { router as demoMenuRouter };
