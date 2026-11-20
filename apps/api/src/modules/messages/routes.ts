import { Router } from 'express';
import { z } from 'zod';
import { models } from '../../models.js';
import { auth, checkParticipation, requireStudent } from '../../middlewares/auth.js';
import { fail } from '../../middlewares/errors.js';
import { objectId, text } from '../../validation.js';
import { publicUser } from '../users/profile.js';

const router = Router();

router.get('/chat', async (req, res) => {
  const user = await auth(req);
  const messages = await models.messages.find({ $or: [{ from: user.id }, { to: user.id }] }).sort({ createdAt: -1 }).limit(200);
  const ids = [...new Set(messages.map(m => m.from === user.id ? m.to : m.from))];
  res.json((await models.users.find({ _id: { $in: ids } })).map(publicUser));
});
router.get('/chat/:id', async (req, res) => {
  const user = await auth(req);
  const id = objectId.parse(req.params.id);
  res.json((await models.messages.find({ $or: [{ from: user.id, to: id }, { from: id, to: user.id }] }).sort({ createdAt: -1 }).limit(100)).reverse());
});
router.post('/chat/:id', async (req, res) => {
  const user = await requireStudent(req);
  checkParticipation(user);
  const to = objectId.parse(req.params.id);
  if (to === user.id || !await models.users.exists({ _id: to })) return fail(404, 'Không tìm thấy người nhận.');
  const { text: message } = z.object({ text: text(2000) }).parse(req.body);
  res.status(201).json(await models.messages.create({ from: user.id, to, text: message }));
});

export default router;
