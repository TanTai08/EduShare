import mongoose, { Schema } from 'mongoose';

export const models = {
  users: mongoose.model('User', new Schema({
    name: String, email: { type: String, unique: true }, password: String, schoolId: String, majorId: String, specializationId: String,
    avatar: String, points: { type: Number, default: 0 }, role: { type: String, default: 'student' },
    saved: [String], status: { type: String, default: 'active' }, dealVersion: Number,
  }, { timestamps: true })),
  tokens: mongoose.model('Session', new Schema({
    hash: { type: String, unique: true }, user: String, expires: { type: Date, expires: 0 },
  })),
  docs: mongoose.model('Document', new Schema({
    title: String, subject: String, category: String, description: String, type: String,
    price: Number, cover: String, fileUrl: String, fileName: String,
    pdf: { type: Buffer, select: false }, owner: String, status: String, feedback: String,
    approvedAt: Date, submittedAt: Date, revisions: Number, dealVersion: Number,
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
    resolvedAt: Date, resolution: String, note: String,
  }, { timestamps: true })),
  moderationLog: mongoose.model('ModerationLog', new Schema({
    actor: String, target: String, kind: String, action: String, note: String,
  }, { timestamps: true }).index({ kind: 1, action: 1, createdAt: 1 })),
  previews: mongoose.model('AdminPreview', new Schema({
    hash: { type: String, unique: true }, doc: String, user: String, session: String,
    expires: { type: Date, expires: 0 },
  })),
  opens: mongoose.model('DocumentOpen', new Schema({
    doc: String, user: String,
  }, { timestamps: true }).index({ createdAt: 1 }).index({ user: 1, createdAt: -1 })),
  reviews: mongoose.model('Review', new Schema({
    deal: String, from: String, to: String, rating: Number, text: String,
  }, { timestamps: true }).index({ deal: 1, from: 1 }, { unique: true })),
};
const claimedDeal = { $in: ['requested', 'scheduled', 'waiting', 'completed'] };
models.deals.schema.index({ doc: 1 }, { unique: true, partialFilterExpression: { status: claimedDeal } });
models.deals.schema.index({ doc: 1, status: 1 });
