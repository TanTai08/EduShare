import { Router } from 'express';
import { z } from 'zod';
import { models } from '../../models.js';
import { requireStudent } from '../../middlewares/auth.js';
import { fail } from '../../middlewares/errors.js';
import { objectId, text } from '../../validation.js';

const router = Router();

router.post('/reviews', async (req, res) => {
  const user = await requireStudent(req);
  const input = z.object({ deal: objectId, rating: z.number().int().min(1).max(5), text: text(500) }).parse(req.body);
  const deal = await models.deals.findOne({ _id: input.deal, status: 'completed', $or: [{ buyer: user.id }, { seller: user.id }] }) || fail(404, 'Chỉ đánh giá giao dịch đã hoàn tất.');
  res.status(201).json(await models.reviews.create({ ...input, from: user.id, to: deal.buyer === user.id ? deal.seller : deal.buyer }));
});

export default router;
