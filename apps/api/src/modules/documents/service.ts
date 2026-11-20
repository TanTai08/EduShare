import { models } from '../../models.js';
import { publicUser } from '../users/profile.js';

export async function serializeDoc(item: InstanceType<typeof models.docs>) {
  const user = await models.users.findById(item.owner);
  const { pdf: _pdf, ...data } = item.toObject();
  return { ...data, id: item.id, owner: user ? publicUser(user) : null };
}
