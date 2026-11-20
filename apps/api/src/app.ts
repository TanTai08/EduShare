import express from 'express';
import cors from 'cors';
import { databaseStatus } from './config/database.js';
import { errorHandler } from './middlewares/errors.js';
import academicRoutes from './modules/academic/routes.js';
import { createAdminRouter } from './modules/admin/routes.js';
import aiRoutes from './modules/ai/routes.js';
import authRoutes from './modules/auth/routes.js';
import dealRoutes from './modules/deals/routes.js';
import documentRoutes from './modules/documents/routes.js';
import messageRoutes from './modules/messages/routes.js';
import notificationRoutes from './modules/notifications/routes.js';
import pointRoutes from './modules/points/routes.js';
import reportRoutes from './modules/reports/routes.js';
import reviewRoutes from './modules/reviews/routes.js';
import userRoutes from './modules/users/routes.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_, res) => res.json({ api: 'ok', database: databaseStatus() }));
  app.use(academicRoutes);
  app.use((_, res, next) => {
    if (databaseStatus() !== 'connected') {
      res.status(503).json({ error: 'MongoDB chưa kết nối.' });
      return;
    }
    next();
  });

  app.use(authRoutes, userRoutes, documentRoutes, notificationRoutes, pointRoutes, createAdminRouter(),
    dealRoutes, reviewRoutes, reportRoutes, messageRoutes, aiRoutes);
  app.use((_req, res) => res.status(404).json({ error: 'API không tồn tại.' }));
  app.use(errorHandler);
  return app;
}
