import type mongoose from 'mongoose';
import { models } from '../../models.js';
import { fail } from '../../middlewares/errors.js';

export async function delta(user: string, key: string, amount: number, reason: string, session: mongoose.ClientSession) {
  const filter = amount < 0 ? { _id: user, points: { $gte: -amount } } : { _id: user };
  const result = await models.users.updateOne(filter, { $inc: { points: amount } }, { session });
  if (!result.matchedCount) return fail(409, 'Không đủ điểm hoặc hồ sơ không còn tồn tại.');
  await models.points.create([{ user, key, amount, reason }], { session });
}
