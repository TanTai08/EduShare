import { z } from 'zod';
import type { EducationSelection } from '../../../../../packages/contracts/index.js';
import { fail } from '../../middlewares/errors.js';
import { schoolId, text } from '../../validation.js';
import { listMajors } from './catalog.js';

export const educationFields = {
  schoolId,
  majorId: text(120).optional(),
  specializationId: text(120).optional(),
};
export const educationSchema = z.object(educationFields);

export function validateEducation(input: EducationSelection) {
  const majors = listMajors(input.schoolId);
  const major = majors.find(item => item.id === input.majorId);
  if (!input.majorId && majors.length) fail(400, 'Vui lòng chọn ngành học.');
  if (input.majorId && !major) fail(400, 'Ngành học không thuộc trường đã chọn.');
  if (input.specializationId && !major?.specializations.some(item => item.id === input.specializationId)) {
    fail(400, 'Chuyên ngành không thuộc ngành đã chọn.');
  }
  return { schoolId: input.schoolId, majorId: input.majorId, specializationId: input.specializationId };
}
