import { Router } from 'express';
import { models } from '../../models.js';
import { auth } from '../../middlewares/auth.js';

const router = Router();

router.get('/notifications/moderation', async (req, res) => {
  const user = await auth(req);
  const documents = await models.docs.find({ owner: user.id }).select('title');
  const byId = new Map(documents.map(doc => [doc.id, doc.title]));
  const entries = await models.moderationLog.find({ target: { $in: [...byId.keys()] }, $or: [{ kind: 'post' }, { kind: 'report', action: 'remove' }] })
    .sort({ createdAt: -1 }).limit(30).select('action target note createdAt');
  res.json(entries.map(entry => ({ id: entry.id, title: byId.get(entry.target!), action: entry.action, note: entry.note, createdAt: entry.createdAt })));
});

export default router;
