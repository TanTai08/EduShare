import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';

const uri = process.env.MONGODB_URI;
const connection = connectDatabase(uri);
if (uri) void connection.then(() => console.log('MongoDB connected.'))
  .catch(() => console.error('MongoDB connection or index setup failed; check server configuration.'));

createApp().listen(Number(process.env.PORT || 4000), '0.0.0.0', () => console.log('EduShare API ready.'));
