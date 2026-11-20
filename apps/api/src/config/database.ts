import mongoose from 'mongoose';
import { models } from '../models.js';
import { bundledCatalog, loadStoredCatalog, useBundledCatalog, writeCatalog } from '../modules/academic/catalog.js';
import { startupError } from './startup-error.js';

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
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
  } catch (error) {
    throw new Error(startupError('connection', error));
  }
  try {
    await Promise.all(Object.values(models).map(model => model.init()));
  } catch (error) {
    throw new Error(startupError('indexes', error));
  }

  useBundledCatalog();
  try {
    await writeCatalog(bundledCatalog, true);
  } catch (error) {
    console.warn(startupError('catalog-seed', error));
  }
  try {
    await loadStoredCatalog();
  } catch (error) {
    console.warn(startupError('catalog-read', error) + ' API đang dùng danh mục đi kèm.');
  }
  indexesReady = true;
}
