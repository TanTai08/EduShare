import { Router } from 'express';
import { schools } from './catalog.js';

const router = Router();

router.get('/schools', (_, res) => res.json(schools));

export default router;
