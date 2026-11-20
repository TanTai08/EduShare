import type { InferSchemaType, Types } from 'mongoose';
import { models } from '../../models.js';
import { publicUser } from '../users/profile.js';

type Document = InstanceType<typeof models.docs>;
type StoredDocument = InferSchemaType<typeof models.docs.schema> & { _id: Types.ObjectId };

export async function findAvailableDocuments(match: Record<string, unknown>, limit: number, fields?: Record<string, 1>) {
  return models.docs.aggregate<StoredDocument>([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $project: { pdf: 0 } },
    { $set: { listingId: { $toString: '$_id' } } },
    { $lookup: {
      from: models.deals.collection.name,
      localField: 'listingId',
      foreignField: 'doc',
      pipeline: [{ $match: { status: 'completed' } }, { $limit: 1 }, { $project: { _id: 1 } }],
      as: 'completedDeals',
    } },
    { $match: { $or: [{ type: 'digital' }, { 'completedDeals.0': { $exists: false } }] } },
    { $limit: limit },
    { $project: fields ?? { listingId: 0, completedDeals: 0 } },
  ]);
}

async function serialize(item: Document, fulfilled?: boolean) {
  const user = await models.users.findById(item.owner);
  const { pdf: _pdf, ...data } = item.toObject();
  return { ...data, id: item.id, owner: user ? publicUser(user) : null, fulfilled };
}

export function serializeDoc(item: Document) {
  return serialize(item);
}

export async function serializeDocuments(items: Document[]) {
  const physicalIds = items.filter(item => item.type === 'sale' || item.type === 'points').map(item => item.id);
  const fulfilled = new Set(physicalIds.length ? await models.deals.distinct('doc', {
    doc: { $in: physicalIds }, status: 'completed',
  }) : []);
  return Promise.all(items.map(item => serialize(item, fulfilled.has(item.id))));
}
