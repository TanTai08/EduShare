import { createHash, randomBytes } from 'node:crypto';
import { models } from '../../models.js';
import { privateUser, type User } from '../users/profile.js';

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

export async function createSession(user: User) {
  const token = randomBytes(32).toString('hex');
  await models.tokens.create({ hash: hashToken(token), user: user.id, expires: new Date(Date.now() + 7 * 86400000) });
  return { token, user: privateUser(user) };
}
