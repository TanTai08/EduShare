import mongoose, { Schema } from 'mongoose';

export const models = {
  users: mongoose.model('User', new Schema({
    name: String, email: { type: String, unique: true }, password: String, schoolId: String,
    avatar: String, points: { type: Number, default: 0 }, role: { type: String, default: 'student' },
    saved: [String],
  }, { timestamps: true })),
  tokens: mongoose.model('Session', new Schema({
    hash: { type: String, unique: true }, user: String, expires: { type: Date, expires: 0 },
  })),
  docs: mongoose.model('Document', new Schema({
    title: String, subject: String, category: String, description: String, type: String,
    price: Number, cover: String, fileUrl: String, fileName: String,
    pdf: { type: Buffer, select: false }, owner: String, status: String, feedback: String,
  }, { timestamps: true })),
  deals: mongoose.model('Deal', new Schema({
    doc: String, buyer: String, seller: String, type: String, price: Number, location: String,
    time: String, status: String, confirmations: [String],
  }, { timestamps: true })),
  points: mongoose.model('PointEntry', new Schema({
    key: { type: String, unique: true }, user: String, amount: Number, reason: String,
  }, { timestamps: true })),
  messages: mongoose.model('Message', new Schema({
    from: String, to: String, text: String,
  }, { timestamps: true })),
  reports: mongoose.model('Report', new Schema({
    user: String, doc: String, reason: String, description: String, image: String, status: String,
  }, { timestamps: true })),
  reviews: mongoose.model('Review', new Schema({
    deal: String, from: String, to: String, rating: Number, text: String,
  }, { timestamps: true }).index({ deal: 1, from: 1 }, { unique: true })),
};
const claimedDeal = { $in: ['requested', 'scheduled', 'waiting', 'completed'] };
models.deals.schema.index({ doc: 1 }, { unique: true, partialFilterExpression: { status: claimedDeal } });
