import { models } from '../../models.js';
import { findSchool } from '../academic/catalog.js';

export type User = InstanceType<typeof models.users>;

export function publicUser(user: User) {
  return { id: user.id, name: user.name, school: findSchool(user.schoolId)?.name, region: findSchool(user.schoolId)?.region, avatar: user.avatar };
}
export const privateUser = (user: User) => ({ ...publicUser(user), email: user.email, points: user.points, saved: user.saved, role: user.role || "student" });
