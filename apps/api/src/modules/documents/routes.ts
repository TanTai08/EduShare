import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { models } from '../../models.js';
import { auth, checkParticipation, requireStudent } from '../../middlewares/auth.js';
import { HttpError, fail } from '../../middlewares/errors.js';
import { objectId } from '../../validation.js';
import { schoolIdsInRegion } from '../academic/catalog.js';
import type { User } from '../users/profile.js';
import { findAvailableDocuments, serializeDoc, serializeDocuments } from './service.js';
import { listing } from './validation.js';

const router = Router();

router.get('/documents', async (req, res) => {
  const query = z.object({ q: z.string().max(100).optional(), region: z.enum(['Đà Nẵng', 'Huế']).optional(), type: z.enum(['digital', 'sale', 'points']).optional() }).parse(req.query);
  const match: Record<string, unknown> = { status: 'approved' };
  if (query.q) {
    const regex = new RegExp(query.q.replace(/[.*+?^{}()|[\]\\$]/g, '\\$&'), 'iu');
    match.$or = [{ title: regex }, { subject: regex }, { category: regex }];
  }
  if (query.type) match.type = query.type;
  if (query.region) {
    const ids = await models.users.find({ schoolId: { $in: schoolIdsInRegion(query.region) } }).distinct('_id');
    match.$and = [{ $or: [{ type: 'digital' }, { owner: { $in: ids.map(String) } }] }];
  }
  const documents = await findAvailableDocuments(match, 60);
  res.json(await Promise.all(documents.map(doc => serializeDoc(models.docs.hydrate(doc)))));
});
router.get('/documents/mine', async (req, res) => {
  const user = await auth(req);
  res.json(await serializeDocuments(await models.docs.find({ owner: user.id }).sort({ createdAt: -1 })));
});
router.get('/documents/saved', async (req, res) => {
  const user = await auth(req);
  res.json(await serializeDocuments(await models.docs.find({ _id: { $in: user.saved }, status: 'approved' })));
});
router.get('/documents/library', async (req, res) => {
  const user = await requireStudent(req);
  const [completed, opened] = await Promise.all([
    models.deals.distinct('doc', { buyer: user.id, status: 'completed' }),
    models.opens.aggregate<{ _id: string; latest: Date }>([
      { $match: { user: user.id, doc: { $type: 'string' } } },
      { $group: { _id: '$doc', latest: { $max: '$createdAt' } } },
      { $sort: { latest: -1, _id: 1 } },
    ]),
  ]);
  const saved = user.saved || [];
  const recent = opened.map(entry => entry._id);
  const ids = [...new Set([...saved, ...completed, ...recent])].filter(id => typeof id === 'string' && Types.ObjectId.isValid(id));
  const entries = await models.docs.find({ _id: { $in: ids }, status: 'approved' }).sort({ createdAt: -1 });
  res.json({ rows: await serializeDocuments(entries), saved, acquired: completed, recent });
});
router.get('/documents/:id/pdf', async (req, res) => {
  const doc = await models.docs.findOne({ _id: objectId.parse(req.params.id), status: 'approved', type: 'digital' }).select('+pdf');
  if (!doc?.pdf) return fail(404, 'Không tìm thấy tệp PDF.');
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' });
  res.send(Buffer.from(doc.pdf));
});
router.post('/documents/:id/open', async (req, res) => {
  const doc = await models.docs.findOne({ _id: objectId.parse(req.params.id), status: 'approved', type: 'digital' }).select('fileUrl fileName');
  if (!doc || (!doc.fileUrl && !doc.fileName)) return fail(404, 'Không tìm thấy tệp tài liệu.');
  let reader: User | undefined;
  if (req.get('authorization')) {
    try { reader = await auth(req); }
    catch (error) { if (!(error instanceof HttpError && [401, 403].includes(error.status))) throw error; }
  }
  await models.opens.create({ doc: doc.id, user: reader?.role === 'student' ? reader.id : undefined });
  res.json({ url: doc.fileUrl, path: doc.fileUrl ? undefined : '/documents/' + doc.id + '/pdf' });
});
router.get('/documents/:id', async (req, res) => {
  const doc = await models.docs.findOne({ _id: objectId.parse(req.params.id), status: 'approved' }) || fail(404, 'Không tìm thấy tài liệu.');
  const [detail] = await serializeDocuments([doc]);
  res.json(detail);
});
router.post('/documents', async (req, res) => {
  const user = await requireStudent(req);
  checkParticipation(user);
  const { pdf, ...input } = listing.parse(req.body);
  const doc = await models.docs.create({ ...input, fileName: pdf ? input.fileName || 'tai-lieu.pdf' : undefined,
    pdf: pdf ? Buffer.from(pdf, 'base64') : undefined, owner: user.id, status: 'pending', submittedAt: new Date() });
  res.status(201).json(await serializeDoc(doc));
});
router.patch('/documents/:id', async (req, res) => {
  const user = await requireStudent(req);
  checkParticipation(user);
  const id = objectId.parse(req.params.id);
  const previous = await models.docs.findOne({ _id: id, owner: user.id, status: 'revision' }).select('+pdf') || fail(404, 'Chỉ sửa được bài được yêu cầu bổ sung.');
  const body = { ...req.body };
  if (body.type === 'digital' && !body.fileUrl && !body.pdf && previous.pdf) {
    body.pdf = Buffer.from(previous.pdf).toString('base64');
    body.fileName = previous.fileName;
  }
  const { pdf, ...input } = listing.parse(body);
  const doc = await models.docs.findOneAndUpdate({ _id: id, owner: user.id, status: 'revision' }, { $set: {
    title: input.title, subject: input.subject, category: input.category, description: input.description, type: input.type, price: input.price,
    ...(input.cover && { cover: input.cover }), ...(input.fileUrl && { fileUrl: input.fileUrl }),
    ...(pdf && { pdf: Buffer.from(pdf, 'base64'), fileName: input.fileName || 'tai-lieu.pdf' }),
    status: 'pending', submittedAt: new Date(), feedback: '',
  }, $unset: { ...(!input.cover && { cover: 1 }), ...(!input.fileUrl && { fileUrl: 1 }), ...(!pdf && { pdf: 1, fileName: 1 }) },
    $inc: { revisions: 1 },
  }, { new: true }) || fail(409, 'Bài đăng đã đổi trạng thái.');
  res.json(await serializeDoc(doc));
});
router.post('/documents/:id/save', async (req, res) => {
  const user = await requireStudent(req);
  const id = objectId.parse(req.params.id);
  const doc = await models.docs.exists({ _id: id, status: 'approved' });
  if (!doc) return fail(404, 'Không tìm thấy tài liệu.');
  const { saved } = z.object({ saved: z.boolean() }).parse(req.body);
  await models.users.updateOne({ _id: user.id }, saved ? { $addToSet: { saved: id } } : { $pull: { saved: id } });
  res.json({ saved });
});

export default router;
