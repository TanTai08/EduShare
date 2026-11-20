import { models } from '../../models.js';
import { findSchool, listMajors } from '../academic/catalog.js';

export type User = InstanceType<typeof models.users>;

export function publicUser(user: User) {
  const school = findSchool(user.schoolId);
  return { id: user.id, name: user.name, school: school?.name, region: school?.region, avatar: user.avatar };
}
export function privateUser(user: User) {
  const major = listMajors(user.schoolId).find(item => item.id === user.majorId);
  return { ...publicUser(user), email: user.email, points: user.points, saved: user.saved, role: user.role || 'student',
    schoolId: user.schoolId, majorId: user.majorId, major: major?.name,
    specializationId: user.specializationId, specialization: major?.specializations.find(item => item.id === user.specializationId)?.name };
}
