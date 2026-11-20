import { z } from 'zod';

export const credentials = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(8).max(128) });
