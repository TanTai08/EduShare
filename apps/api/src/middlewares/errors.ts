import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const fail = (status: number, message: string): never => { throw new HttpError(status, message); };

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
  if (error instanceof ZodError) { res.status(400).json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }); return; }
  if (error?.code === 11000) { res.status(409).json({ error: 'Dữ liệu đã tồn tại hoặc tài liệu đã có người giữ chỗ.' }); return; }
  console.error('Request failed:', error?.name ?? 'Error');
  res.status(500).json({ error: 'Máy chủ chưa xử lý được yêu cầu.' });
};
