import { Router } from 'express';
import { models } from '../../models.js';
import { auth } from '../../middlewares/auth.js';

const router = Router();

router.get('/points', async (req, res) => {
  const user = await auth(req);
  res.json({ balance: user.points, entries: await models.points.find({ user: user.id }).sort({ createdAt: -1 }).limit(100) });
});

export default router;
