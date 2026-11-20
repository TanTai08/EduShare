import mongoose from 'mongoose';
import { models } from '../../models.js';
import { fail } from '../../middlewares/errors.js';
import { findSchool } from '../academic/catalog.js';
import { delta } from '../points/service.js';
import type { User } from '../users/profile.js';

export type DealAction = 'accept' | 'cancel' | 'confirm';

export function createDeal(user: User, input: { doc: string; location: string; time: string }) {
  return mongoose.connection.transaction(async session => {
    const doc = await models.docs.findOne({ _id: input.doc, status: 'approved' }).session(session) || fail(404, 'Không tìm thấy tài liệu.');
    if (doc.type === 'digital' || doc.owner === user.id) return fail(400, 'Tài liệu này không thể đặt hẹn.');
    const seller = await models.users.findById(doc.owner).session(session) || fail(404, 'Không tìm thấy người đăng.');
    if (seller.status === 'locked' || seller.status === 'restricted') return fail(403, 'Người đăng hiện không nhận lịch hẹn mới.');
    if (seller.role === 'admin') return fail(403, 'Bài của tài khoản quản trị không nhận đặt hẹn.');
    if (!findSchool(user.schoolId) || findSchool(seller.schoolId)?.region !== findSchool(user.schoolId)?.region) return fail(403, 'Chỉ giao nhận trong cùng khu vực.');
    // Serialize opening a deal with account status changes for either participant.
    const participants = await models.users.updateMany({ _id: { $in: [user.id, seller.id] }, status: { $nin: ['restricted', 'locked'] } },
      { $inc: { dealVersion: 1 } }, { session });
    if (participants.matchedCount !== 2) return fail(403, 'Một tài khoản hiện không thể tạo lịch hẹn.');
    if (await models.deals.exists({ doc: doc.id, status: 'completed' }).session(session)) return fail(409, 'Tài liệu đã được giao.');
    const available = await models.docs.updateOne({ _id: doc.id, status: 'approved' }, { $inc: { dealVersion: 1 } }, { session });
    if (!available.matchedCount) return fail(409, 'Tài liệu đã bị gỡ.');
    const [entry] = await models.deals.create([{ ...input, seller: seller.id, buyer: user.id, type: doc.type, price: doc.price, status: 'requested' }], { session });
    if (doc.type === 'points') await delta(user.id, 'hold:' + entry.id, -doc.price!, 'Giữ điểm nhận bản in', session);
    return entry;
  });
}

export function updateDeal(userId: string, id: string, action: DealAction) {
  return mongoose.connection.transaction(async session => {
    const deal = await models.deals.findById(id).session(session);
    if (!deal || (deal.buyer !== userId && deal.seller !== userId)) return fail(404, 'Không tìm thấy giao dịch.');
    if (action === 'accept' && deal.status === 'requested' && deal.seller === userId) {
      deal.status = 'scheduled';
    } else if (action === 'cancel' && ['requested', 'scheduled'].includes(deal.status!)) {
      deal.status = 'cancelled';
      if (deal.type === 'points') await delta(deal.buyer!, 'refund:' + deal.id, deal.price!, 'Hoàn điểm khi hủy', session);
    } else if (action === 'confirm' && ['scheduled', 'waiting', 'completed'].includes(deal.status!)) {
      if (deal.confirmations.includes(userId)) return deal;
      deal.confirmations = [...deal.confirmations, userId];
      deal.status = deal.confirmations.length === 2 ? 'completed' : 'waiting';
      if (deal.status === 'completed') {
        await delta(deal.buyer!, 'reward:buyer:' + deal.id, 2, 'Giao nhận hoàn tất', session);
        await delta(deal.seller!, 'reward:seller:' + deal.id, 5, 'Giao nhận hoàn tất', session);
      }
    } else return fail(409, 'Thao tác không phù hợp với trạng thái hiện tại.');
    await deal.save({ session });
    return deal;
  });
}
