import mongoose from 'mongoose';
import { models } from '../models.js';
import { loadCatalog } from '../modules/academic/catalog.js';

let configured = false;
let indexesReady = false;

export function databaseStatus() {
  if (mongoose.connection.readyState === 1 && indexesReady) return 'connected';
  return configured ? 'disconnected' : 'not_configured';
}

export async function connectDatabase(uri: string | undefined) {
  configured = Boolean(uri);
  indexesReady = false;
  if (!uri) return;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
  await Promise.all(Object.values(models).map(model => model.init()));
  await loadCatalog();
  indexesReady = true;
}
