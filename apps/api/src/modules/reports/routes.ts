import { Router } from 'express';
import { z } from 'zod';
import { models } from '../../models.js';
import { requireStudent } from '../../middlewares/auth.js';
import { fail } from '../../middlewares/errors.js';
import { image, objectId, text } from '../../validation.js';

const router = Router();

router.post('/reports', async (req, res) => {
  const user = await requireStudent(req);
  const input = z.object({ doc: objectId, reason: text(100), description: text(1200), image: image.optional() }).parse(req.body);
  if (!await models.docs.exists({ _id: input.doc, status: 'approved' })) return fail(404, 'Không tìm thấy tài liệu.');
  res.status(201).json(await models.reports.create({ ...input, user: user.id, status: 'pending' }));
});

export default router;
