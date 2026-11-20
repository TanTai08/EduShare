import { Router } from 'express';
import { z } from 'zod';
import { models } from '../../models.js';
import { auth, checkParticipation, requireStudent } from '../../middlewares/auth.js';
import { objectId, text } from '../../validation.js';
import { createDeal, updateDeal } from './service.js';
import { publicUser } from '../users/profile.js';

const router = Router();

router.post('/deals', async (req, res) => {
  const user = await requireStudent(req);
  checkParticipation(user);
  const input = z.object({ doc: objectId, location: text(160), time: text(80) }).parse(req.body);
  const deal = await createDeal(user, input);
  res.status(201).json(deal);
});
router.get('/deals', async (req, res) => {
  const user = await auth(req);
  const deals = await models.deals.find({ $or: [{ buyer: user.id }, { seller: user.id }] }).sort({ createdAt: -1 }).limit(75);
  const counterparties = await models.users.find({ _id: { $in: [...new Set(deals.map(deal => deal.buyer === user.id ? deal.seller : deal.buyer))] } });
  const people = new Map(counterparties.map(person => [person.id, publicUser(person)]));
  const documents = await models.docs.find({ _id: { $in: deals.map(deal => deal.doc) } }).select('title cover').lean();
  const byId = new Map(documents.map(doc => [String(doc._id), doc]));
  res.json(deals.map(deal => ({ ...deal.toObject(), document: byId.get(deal.doc!), counterparty: people.get((deal.buyer === user.id ? deal.seller : deal.buyer)!) })));
});
router.post('/deals/:id/action', async (req, res) => {
  const user = await requireStudent(req);
  const { action } = z.object({ action: z.enum(['accept', 'cancel', 'confirm']) }).parse(req.body);
  const entry = await updateDeal(user.id, objectId.parse(req.params.id), action);
  res.json(entry);
});

export default router;
