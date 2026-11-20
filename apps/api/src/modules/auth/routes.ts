import { Router } from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { models } from '../../models.js';
import { auth } from '../../middlewares/auth.js';
import { fail } from '../../middlewares/errors.js';
import { text } from '../../validation.js';
import { educationFields, validateEducation } from '../academic/selection.js';
import { credentials } from './validation.js';
import { createSession, hashToken } from './session.js';

const router = Router();

router.post('/auth/register', async (req, res) => {
  const input = credentials.extend({ name: text(90), ...educationFields }).parse(req.body);
  const education = validateEducation(input);
  const salt = randomBytes(16).toString('hex');
  const password = salt + ':' + scryptSync(input.password, salt, 64).toString('hex');
  const user = await models.users.create({ name: input.name, email: input.email, ...education, password });
  res.status(201).json(await createSession(user));
});
router.post('/auth/login', async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await models.users.findOne({ email: input.email });
  const [salt, expected] = (user?.password ?? ':').split(':');
  if (!user || !expected || !timingSafeEqual(Buffer.from(expected, 'hex'), scryptSync(input.password, salt, 64))) {
    return fail(401, 'Email hoặc mật khẩu chưa đúng.');
  }
  if (user.status === 'locked') return fail(403, 'Tài khoản đã bị khóa.');
  res.json(await createSession(user));
});
router.post('/auth/logout', async (req, res) => {
  await auth(req);
  await models.tokens.deleteOne({ hash: hashToken(req.get('authorization')!.slice(7)) });
  res.sendStatus(204);
});

export default router;
