import { Router } from 'express';
import { academicRegions } from '../../../../../packages/contracts/index.js';
import { fail } from '../../middlewares/errors.js';
import { findSchool, listMajors, listSchools } from './catalog.js';

const router = Router();
router.get('/academic/regions', (_, res) => res.json(academicRegions));
router.get('/schools', (req, res) => {
  const region = req.query.region;
  if (region === undefined) return res.json(listSchools());
  const selected = academicRegions.find(item => item.id === region || item.name === region);
  if (!selected) return fail(400, 'Khu vực không hợp lệ.');
  res.json(listSchools().filter(item => item.region === selected.name));
});
router.get('/schools/:id/majors', (req, res) => {
  const school = findSchool(req.params.id);
  if (!school) return fail(404, 'Không tìm thấy trường.');
  res.json(listMajors(school.id));
});

export default router;
