import { Router } from 'express';

import { requireUser } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  getProfile,
  ProfilePayload,
  updateProfile,
} from '../services/profile.js';

const router = Router();

router.get('/', requireUser, async (req, res, next) => {
  try {
    const profile = await getProfile(req.user!.id);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireUser, async (req, res, next) => {
  try {
    const parsed = ProfilePayload.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'invalid_profile', '用户档案格式不正确。');
    }
    const profile = await updateProfile(req.user!.id, parsed.data);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

export { router as profileRouter };
