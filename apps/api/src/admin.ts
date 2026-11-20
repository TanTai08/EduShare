import type { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import { randomBytes, scryptSync } from 'node:crypto';
import { z } from 'zod';
import { schools } from '../../../packages/contracts/index.js';
import { models } from './models.js';

type User = InstanceType<typeof models.users>;
type Doc = InstanceType<typeof models.docs>;
type Dependencies = {
  requireAdmin: (req: Request) => Promise<User>;
  fail: (status: number, message: string) => never;
  hash: (value: string) => string;
  objectId: z.ZodType<string>;
  schoolId: z.ZodType<string>;
  credentials: z.ZodObject<{ email: z.ZodType<string>; password: z.ZodType<string> }>;
  publicUser: (user: User) => { id: string; name?: string | null; school?: string; region?: string; avatar?: string | null };
  serializeDoc: (doc: Doc) => Promise<{ id: string }>;
  delta: (user: string, key: string, amount: number, reason: string, session: mongoose.ClientSession) => Promise<void>;
};

const day = 86_400_000;
const highPriority = /bản quyền|lừa đảo|copyright|fraud/i;
const accountStates = ['active', 'restricted', 'locked'] as const;
const postStates = ['pending', 'approved', 'revision', 'rejected', 'removed'] as const;
const note = z.string().trim().max(500).default('');
const paging = {
  q: z.string().trim().max(130).default(''),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  order: z.enum(['new', 'old']).default('new'),
};
const matchText = (q: string) => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu');
function idFilter(q: string, prefix: string) {
  if (/^[a-f\d]{24}$/i.test(q)) return [{ _id: q }];
  const code = q.replace(new RegExp('^#?' + prefix, 'i'), '');
  if (!/^[a-f\d]{6}$/i.test(code)) return [];
  return [{ $expr: { $eq: [{ $substrBytes: [{ $toString: '$_id' }, 18, 6] }, code.toLowerCase()] } }];
}
const sortBy = (order: 'new' | 'old'): 1 | -1 => order === 'new' ? -1 : 1;
const offset = (p: { page: number; limit: number }) => (p.page - 1) * p.limit;
const accountState = (status?: string | null) => status || 'active';
const accountMatch = (status?: string) => status === 'active'
  ? { $or: [{ status: 'active' }, { status: null }] } : status ? { status } : {};
const dateRange = (value: number, now: Date) => {
  const timeZone = 'Asia/Ho_Chi_Minh';
  const local = new Intl.DateTimeFormat('sv-SE', { timeZone }).format(now);
  const last = new Date(local + 'T00:00:00+07:00');
  const from = new Date(last.getTime() - (value - 1) * day);
  const to = new Date(last.getTime() + day);
  return { from, to, timeZone };
};

async function audit(actor: string, target: string, kind: string, action: string, message: string, session: mongoose.ClientSession) {
  await models.moderationLog.create([{ actor, target, kind, action, note: message }], { session });
}

export function registerAdmin(app: Express, { requireAdmin, fail, hash, objectId, schoolId, credentials, publicUser, delta, serializeDoc }: Dependencies) {
  async function decidePost(actor: string, id: string, decision: string, feedback: string, session: mongoose.ClientSession) {
    const doc = await models.docs.findOneAndUpdate({ _id: id, status: 'pending' }, {
      status: decision, feedback, ...(decision === 'approved' && { approvedAt: new Date() }),
    }, { session, new: true }) || fail(409, 'Bài đăng đã được xử lý.');
    if (decision === 'approved' && doc.type === 'digital') {
      await delta(doc.owner!, 'document:' + doc.id, 10, 'Tài liệu số được duyệt', session);
    }
    await audit(actor, doc.id, 'post', decision, feedback, session);
  }
  async function decide(req: Request, res: Response, legacy = false) {
    const admin = await requireAdmin(req);
    const id = objectId.parse(req.params.id);
    const input = legacy ? z.object({ approved: z.boolean(), feedback: note }).transform(v => ({
      decision: v.approved ? 'approved' : 'revision', feedback: v.feedback,
    })).parse(req.body) : z.object({ decision: z.enum(['approved', 'revision', 'rejected']), feedback: note }).parse(req.body);
    if (!legacy && input.decision !== 'approved' && !input.feedback) return fail(400, 'Hãy nhập lý do.');
    const feedback = input.feedback || (input.decision === 'revision' ? 'Vui lòng kiểm tra thông tin tài liệu.' : '');
    await mongoose.connection.transaction(session => decidePost(admin.id, id, input.decision, feedback, session));
    res.json({ ok: true });
  }

  app.get('/moderation', async (req, res) => {
    await requireAdmin(req);
    res.json(await Promise.all((await models.docs.find({ status: 'pending' }).limit(50)).map(serializeDoc)));
  });
  app.post('/moderation/:id', (req, res) => decide(req, res, true));
  app.post('/admin/posts/bulk-approve', async (req, res) => {
    const admin = await requireAdmin(req);
    const ids = [...new Set(z.object({ ids: z.array(objectId).min(1).max(25) }).parse(req.body).ids)];
    await mongoose.connection.transaction(async session => {
      for (const id of ids) await decidePost(admin.id, id, 'approved', '', session);
    });
    res.json({ ok: true });
  });
  app.post('/admin/posts/:id/decision', (req, res) => decide(req, res));

  app.get('/admin/posts', async (req, res) => {
    await requireAdmin(req);
    const query = z.object({ ...paging, status: z.enum(postStates).optional(), category: z.string().max(70).optional(),
      type: z.enum(['digital', 'sale', 'points']).optional() }).parse(req.query);
    const { status, category, type, q, order, limit } = query;
    const filter: mongoose.FilterQuery<Doc> = { ...(status && { status }), ...(category && { category }), ...(type && { type }) };
    if (q) {
      const regex = matchText(q);
      const owners = await models.users.find({ name: regex }).distinct('_id');
      filter.$or = [{ title: regex }, { subject: regex }, { owner: { $in: owners.map(String) } }];
    }
    const [rows, total] = await Promise.all([
      models.docs.find(filter).sort({ submittedAt: sortBy(order), createdAt: sortBy(order), _id: sortBy(order) }).skip(offset(query)).limit(limit),
      models.docs.countDocuments(filter),
    ]);
    res.json({ rows: await Promise.all(rows.map(serializeDoc)), total });
  });
  app.get('/admin/posts/:id', async (req, res) => {
    await requireAdmin(req);
    const doc = await models.docs.findById(objectId.parse(req.params.id)) || fail(404, 'Không tìm thấy bài đăng.');
    const history = await models.moderationLog.find({ target: doc.id, $or: [{ kind: 'post' }, { kind: 'report', action: 'remove' }] })
      .sort({ createdAt: -1 }).limit(20).select('action note createdAt');
    res.json({ ...await serializeDoc(doc), history });
  });
  app.post('/admin/posts/:id/preview', async (req, res) => {
    const admin = await requireAdmin(req);
    const doc = await models.docs.findById(objectId.parse(req.params.id)).select('fileUrl fileName') || fail(404, 'Không tìm thấy bài đăng.');
    if (doc.fileUrl) {
      if (!doc.fileUrl.startsWith('https://')) return fail(400, 'Liên kết tài liệu không hợp lệ.');
      res.json({ url: doc.fileUrl }); return;
    }
    if (!doc.fileName || !await models.docs.exists({ _id: doc.id, pdf: { $exists: true } })) return fail(404, 'Bài đăng không đính kèm PDF.');
    const token = randomBytes(32).toString('hex');
    await models.previews.create({ hash: hash(token), doc: doc.id, user: admin.id,
      session: hash(req.get('authorization')!.slice(7)), expires: new Date(Date.now() + 60_000) });
    res.json({ path: '/admin/previews/' + token });
  });
  app.get('/admin/previews/:token', async (req, res) => {
    const key = z.string().regex(/^[a-f0-9]{64}$/).parse(req.params.token);
    const preview = await models.previews.findOne({ hash: hash(key), expires: { $gt: new Date() } }) || fail(404, 'Liên kết xem thử đã hết hạn.');
    const [valid, admin, doc] = await Promise.all([
      models.tokens.exists({ hash: preview.session, user: preview.user, expires: { $gt: new Date() } }),
      models.users.exists({ _id: preview.user, role: 'admin', status: { $ne: 'locked' } }),
      models.docs.findById(preview.doc).select('+pdf'),
    ]);
    if (!valid || !admin || !doc?.pdf) return fail(404, 'Không tìm thấy tệp PDF.');
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.send(Buffer.from(doc.pdf));
  });

  function userRow(user: User) {
    return { ...publicUser(user), email: user.email, role: user.role || 'student', status: accountState(user.status), createdAt: user.createdAt };
  }
  app.get('/admin/users', async (req, res) => {
    await requireAdmin(req);
    const query = z.object({ ...paging, status: z.enum(accountStates).optional(), role: z.enum(['student', 'admin']).optional() }).parse(req.query);
    const { role, status, q, limit, order } = query;
    const criteria: mongoose.FilterQuery<User>[] = [accountMatch(status)];
    if (role) criteria.push(role === 'student' ? { $or: [{ role }, { role: null }] } : { role });
    if (q) {
      const regex = matchText(q);
      criteria.push({ $or: [{ name: regex }, { email: regex }, ...idFilter(q, 'ND')] });
    }
    const filter = { $and: criteria };
    const legacy = !Object.keys(req.query).length;
    const [rows, total] = await Promise.all([
      models.users.find(filter).select('-password -saved').sort({ createdAt: sortBy(order), _id: sortBy(order) }).skip(offset(query)).limit(legacy ? 100 : limit),
      models.users.countDocuments(filter),
    ]);
    const users = rows.map(userRow);
    res.json(legacy ? users : { rows: users, total });
  });
  app.get('/admin/users/:id', async (req, res) => {
    await requireAdmin(req);
    const id = objectId.parse(req.params.id);
    const user = await models.users.findById(id).select('-password -saved') || fail(404, 'Không tìm thấy người dùng.');
    const [posts, deals, reviews] = await Promise.all([
      models.docs.countDocuments({ owner: id }),
      models.deals.countDocuments({ status: 'completed', $or: [{ buyer: id }, { seller: id }] }),
      models.reviews.aggregate<{ average: number; count: number }>([{ $match: { to: id } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ]);
    res.json({ ...userRow(user), posts, deals, rating: reviews[0]?.average, reviewCount: reviews[0]?.count ?? 0 });
  });
  app.post('/admin/users', async (req, res) => {
    const admin = await requireAdmin(req);
    const input = credentials.extend({ name: z.string().trim().min(1).max(90), schoolId }).parse(req.body);
    const salt = randomBytes(16).toString('hex');
    const password = salt + ':' + scryptSync(input.password, salt, 64).toString('hex');
    const user = await mongoose.connection.transaction(async session => {
      const [member] = await models.users.create([{ ...input, password, role: 'student' }], { session });
      await audit(admin.id, member.id, 'user', 'create', '', session);
      return member;
    });
    res.status(201).json(userRow(user));
  });
  app.patch('/admin/users/:id/status', async (req, res) => {
    const admin = await requireAdmin(req);
    const id = objectId.parse(req.params.id);
    const { status, reason } = z.object({ status: z.enum(accountStates), reason: z.string().trim().min(1).max(500) }).parse(req.body);
    await mongoose.connection.transaction(async session => {
      const user = await models.users.findById(id).session(session) || fail(404, 'Không tìm thấy người dùng.');
      if (user.role === 'admin') return fail(403, 'Không thể thay đổi trạng thái của quản trị viên.');
      if (accountState(user.status) === status) return;
      if (status === 'locked' && await models.deals.exists({ status: { $in: ['requested', 'scheduled', 'waiting'] }, $or: [{ buyer: id }, { seller: id }] }).session(session)) {
        return fail(409, 'Tài khoản còn giao dịch đang tiến hành. Có thể hạn chế trong lúc chờ giao dịch kết thúc.');
      }
      user.status = status;
      await user.save({ session });
      if (status === 'locked') await models.tokens.deleteMany({ user: id }, { session });
      await audit(admin.id, id, 'user', status, reason, session);
    });
    res.json({ ok: true });
  });

  app.get('/admin/reports', async (req, res) => {
    await requireAdmin(req);
    const query = z.object({ ...paging, status: z.enum(['pending', 'reviewing', 'resolved']).default('pending'),
      priority: z.enum(['high', 'normal']).optional() }).parse(req.query);
    const { status, q, priority, limit, order } = query;
    const criteria: mongoose.FilterQuery<InstanceType<typeof models.reports>>[] = [{ status }];
    if (priority) criteria.push({ reason: priority === 'high' ? highPriority : { $not: highPriority } });
    if (q) {
      const regex = matchText(q);
      const ids = await models.docs.find({ title: regex }).distinct('_id');
      criteria.push({ $or: [{ reason: regex }, { description: regex }, { doc: { $in: ids.map(String) } },
        ...idFilter(q, 'BC')] });
    }
    const filter = { $and: criteria };
    const legacy = !Object.keys(req.query).length;
    const [reports, total] = await Promise.all([
      models.reports.find(filter).select(legacy ? '' : '-image').sort({ createdAt: sortBy(order), _id: sortBy(order) }).skip(offset(query)).limit(legacy ? 50 : limit),
      models.reports.countDocuments(filter),
    ]);
    const docs = await models.docs.find({ _id: { $in: reports.map(report => report.doc).filter(Boolean) } }).select('title');
    const titles = new Map(docs.map(doc => [doc.id, doc.title]));
    const rows = reports.map(report => ({ id: report.id, title: titles.get(report.doc!) || 'Tài liệu không còn tồn tại',
      reason: report.reason, description: report.description, status: report.status, createdAt: report.createdAt,
      priority: highPriority.test(report.reason || '') ? 'high' : 'normal', image: report.image }));
    res.json(legacy ? rows : { rows, total });
  });
  app.get('/admin/reports/:id', async (req, res) => {
    await requireAdmin(req);
    const report = await models.reports.findById(objectId.parse(req.params.id)) || fail(404, 'Không tìm thấy báo cáo.');
    const [reporter, doc] = await Promise.all([models.users.findById(report.user), models.docs.findById(report.doc)]);
    res.json({ ...report.toObject(), id: report.id, reporter: reporter && publicUser(reporter),
      title: doc?.title || 'Tài liệu không còn tồn tại', document: doc && await serializeDoc(doc),
      priority: highPriority.test(report.reason || '') ? 'high' : 'normal' });
  });
  async function resolveReport(req: Request, res: Response, legacy = false) {
    const admin = await requireAdmin(req);
    const id = objectId.parse(req.params.id);
    const input = legacy ? { action: 'dismiss', note: '' } :
      z.object({ action: z.enum(['review', 'dismiss', 'remove']), note }).parse(req.body);
    if (input.action === 'remove' && !input.note) return fail(400, 'Hãy ghi lý do gỡ bài đăng.');
    await mongoose.connection.transaction(async session => {
      const filter = { _id: id, status: input.action === 'review' ? 'pending' : { $in: ['pending', 'reviewing'] } };
      const change = input.action === 'review' ? { status: 'reviewing' } : {
        status: 'resolved', resolution: input.action, note: input.note, resolvedAt: new Date(),
      };
      const report = await models.reports.findOneAndUpdate(filter, change, { session }) || fail(409, 'Báo cáo đã được xử lý.');
      if (input.action === 'remove') {
        const doc = await models.docs.findOneAndUpdate({ _id: report.doc, status: 'approved' },
          { $set: { status: 'removed', feedback: input.note } }, { session }) || fail(409, 'Không tìm thấy bài đăng để gỡ.');
        await audit(admin.id, doc.id, 'report', 'remove', input.note, session);
      }
      await audit(admin.id, report.id, 'report', input.action, input.note, session);
    });
    res.json({ ok: true });
  }
  app.post('/admin/reports/:id/decision', (req, res) => resolveReport(req, res));
  app.post('/admin/reports/:id/resolve', (req, res) => resolveReport(req, res, true));

  app.get('/admin/overview', async (req, res) => {
    await requireAdmin(req);
    const { from: today } = dateRange(1, new Date());
    const [users, restricted, locked, approved, pending, pendingToday, revision, reports, reviewing, high, categories] = await Promise.all([
      models.users.countDocuments(), models.users.countDocuments({ status: 'restricted' }), models.users.countDocuments({ status: 'locked' }),
      models.docs.countDocuments({ status: 'approved' }), models.docs.countDocuments({ status: 'pending' }),
      models.docs.countDocuments({ status: 'pending', $or: [{ submittedAt: { $gte: today } }, { submittedAt: null, createdAt: { $gte: today } }] }),
      models.docs.countDocuments({ status: 'revision' }), models.reports.countDocuments({ status: 'pending' }),
      models.reports.countDocuments({ status: 'reviewing' }),
      models.reports.countDocuments({ status: { $in: ['pending', 'reviewing'] }, reason: highPriority }),
      models.docs.distinct('category'),
    ]);
    res.json({ users, active: users - restricted - locked, restricted, locked, approved, pending, pendingToday, revision, reports, reviewing, high, categories: categories.filter(Boolean).sort() });
  });

  app.get('/admin/stats', async (req, res) => {
    await requireAdmin(req);
    const { days } = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) }).parse(req.query);
    const { from, to, timeZone } = dateRange(days, new Date());
    const previous = new Date(from.getTime() - days * day);
    const range = { $gte: previous, $lt: to };
    const perDay = (field: string) => ({ $dateToString: { format: '%Y-%m-%d', date: '$' + field, timezone: timeZone } });
    type Counts = { _id: string; count: number };
    const [members, posts, opens, resolved, categories, bySchool, metrics] = await Promise.all([
      models.users.aggregate<Counts>([{ $match: { createdAt: range } }, { $group: { _id: perDay('createdAt'), count: { $sum: 1 } } }]),
      models.docs.aggregate<Counts>([{ $match: { approvedAt: range } }, { $group: { _id: perDay('approvedAt'), count: { $sum: 1 } } }]),
      models.opens.aggregate<Counts>([{ $match: { createdAt: range } }, { $group: { _id: perDay('createdAt'), count: { $sum: 1 } } }]),
      models.reports.aggregate<Counts>([{ $match: { resolvedAt: range } }, { $group: { _id: perDay('resolvedAt'), count: { $sum: 1 } } }]),
      models.docs.aggregate<Counts>([{ $match: { approvedAt: { $gte: from, $lt: to }, category: { $type: 'string' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
      models.users.aggregate<{ _id: string; members: number; posts: number }>([
        { $project: { schoolId: 1, createdAt: 1, userId: { $toString: '$_id' } } },
        { $lookup: { from: models.docs.collection.name, localField: 'userId', foreignField: 'owner', pipeline: [
          { $match: { approvedAt: { $gte: from, $lt: to } } }, { $count: 'total' },
        ], as: 'approved' } },
        { $group: { _id: '$schoolId', members: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', from] }, { $lt: ['$createdAt', to] }] }, 1, 0] } },
          posts: { $sum: { $ifNull: [{ $arrayElemAt: ['$approved.total', 0] }, 0] } } } },
      ]),
      models.reports.aggregate<{ hours: number }>([{ $match: { resolvedAt: { $gte: from, $lt: to }, createdAt: { $type: 'date' } } },
        { $group: { _id: null, hours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } } }]),
    ]);
    const approvedCount = posts.filter(row => row._id >= new Intl.DateTimeFormat('sv-SE', { timeZone }).format(from)).reduce((sum, row) => sum + row.count, 0);
    const approvedAfterRevision = await models.docs.countDocuments({ approvedAt: { $gte: from, $lt: to }, revisions: { $gt: 0 } });
    const format = new Intl.DateTimeFormat('sv-SE', { timeZone });
    const key = format.format(from);
    const stat = (rows: Counts[]) => ({
      count: rows.filter(row => row._id >= key).reduce((sum, row) => sum + row.count, 0),
      previous: rows.filter(row => row._id < key).reduce((sum, row) => sum + row.count, 0),
    });
    const lookup = (rows: Counts[]) => new Map(rows.map(row => [row._id, row.count]));
    const memberByDate = lookup(members), postByDate = lookup(posts);
    const timeline = Array.from({ length: days }, (_, i) => {
      const date = format.format(new Date(from.getTime() + i * day));
      return { date, members: memberByDate.get(date) ?? 0, posts: postByDate.get(date) ?? 0 };
    });
    res.json({ from, to, members: stat(members), posts: stat(posts), opens: stat(opens), resolved: stat(resolved), timeline,
      categories: categories.map(row => ({ name: row._id, count: row.count })),
      schools: bySchool.map(row => ({ name: schools.find(school => school.id === row._id)?.name || 'Trường chưa xác định', members: row.members, posts: row.posts })),
      averageHours: metrics[0]?.hours ?? null, firstApproval: approvedCount ? Math.max(0, approvedCount - approvedAfterRevision) / approvedCount : null,
    });
  });
}
