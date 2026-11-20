import type { Request } from 'express';
import { models } from '../models.js';
import type { User } from '../modules/users/profile.js';
import { hashToken } from '../modules/auth/session.js';
import { fail } from './errors.js';

export async function auth(req: Request) {
  const token = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return fail(401, 'Vui lòng đăng nhập.');
  const session = await models.tokens.findOne({ hash: hashToken(token), expires: { $gt: new Date() } });
  const user = session && await models.users.findById(session.user);
  if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.');
  if (user.status === 'locked') return fail(403, 'Tài khoản đã bị khóa.');
  return user;
}
export async function requireStudent(req: Request) {
  const user = await auth(req);
  if (user.role === 'admin') return fail(403, 'Tài khoản quản trị chỉ dùng để quản lý EduShare.');
  return user;
}
export function checkParticipation(user: User) {
  if (user.status === 'restricted') return fail(403, 'Tài khoản đang bị hạn chế đăng bài, đặt hẹn và gửi tin nhắn.');
}
export async function requireAdmin(req: Request) {
  const user = await auth(req);
  if (user.role !== 'admin') return fail(403, 'Chỉ quản trị viên có quyền truy cập.');
  return user;
}
