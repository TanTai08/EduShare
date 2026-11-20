import { Types } from 'mongoose';
import { z } from 'zod';
import { findSchool } from './modules/academic/catalog.js';

export const objectId = z.string().refine(Types.ObjectId.isValid, 'ID không hợp lệ');
export const text = (max: number) => z.string().trim().min(1).max(max);
export const image = z.string().max(4_000_000).regex(/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i);
export const schoolId = text(30).refine(id => !!findSchool(id), 'Trường không hợp lệ');
