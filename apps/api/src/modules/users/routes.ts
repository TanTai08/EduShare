import { Router } from 'express';
import { z } from 'zod';
import { models } from '../../models.js';
import { auth } from '../../middlewares/auth.js';
import { fail } from '../../middlewares/errors.js';
import { image, objectId, text } from '../../validation.js';
import { privateUser, publicUser } from './profile.js';

const router = Router();

router.get('/me', async (req, res) => res.json(privateUser(await auth(req))));
router.patch('/me', async (req, res) => {
  const user = await auth(req);
  user.set(z.object({ name: text(90).optional(), avatar: image.optional() }).parse(req.body));
  await user.save();
  res.json(privateUser(user));
});
router.get('/users/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const user = await models.users.findById(id) || fail(404, 'Không tìm thấy hồ sơ.');
  const reviews = await models.reviews.find({ to: id }).sort({ createdAt: -1 }).limit(30);
  res.json({ ...publicUser(user), reviews });
});

export default router;
