import { z } from 'zod';
import { image, text } from '../../validation.js';

const url = z.string().url().max(2000).refine(item => new URL(item).protocol === 'https:', 'Cần liên kết HTTPS');
export const listing = z.object({
  title: text(130), subject: text(90), category: text(70), description: text(1200),
  type: z.enum(['digital', 'sale', 'points']), price: z.number().int().min(0).max(100000000).default(0),
  cover: image.optional(), fileUrl: url.optional(),
  fileName: text(160).optional(), pdf: z.string().max(4_200_000).regex(/^JVBERi0[a-z0-9+/=]+$/i).optional(),
}).refine(v => v.type === 'digital' ? v.price === 0 && !!(v.fileUrl || v.pdf) : v.price > 0 && !v.fileUrl && !v.pdf && (v.type !== 'points' || v.price <= 1000), 'Hãy nhập đúng liên kết, giá hoặc số điểm cho loại tài liệu.');
