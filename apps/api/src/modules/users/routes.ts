import { Router } from 'express';
import { z } from 'zod';
import { models } from '../../models.js';
import { auth } from '../../middlewares/auth.js';
import { fail } from '../../middlewares/errors.js';
import { image, objectId, text } from '../../validation.js';
import { educationSchema, validateEducation } from '../academic/selection.js';
import { privateUser, publicUser } from './profile.js';

const router = Router();

router.get('/me', async (req, res) => res.json(privateUser(await auth(req))));
router.patch('/me', async (req, res) => {
  const user = await auth(req);
  const { education, ...details } = z.object({
    name: text(90).optional(), avatar: image.optional(), education: educationSchema.optional(),
  }).parse(req.body);
  if (education && user.role === 'admin') return fail(403, 'Hồ sơ quản trị không có thông tin ngành học.');
  user.set(details);
  if (education) user.set(validateEducation(education));
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
