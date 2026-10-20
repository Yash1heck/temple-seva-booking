import dotenv from 'dotenv';
dotenv.config();

import { buildApp } from './app.js';
import { getDb, runMigrations, closeDb } from './db/index.js';
import { seedInitialData } from './db/seed.js';

async function start() {
  try {
    console.log('Initializing database...');
    const db = await getDb();
    await runMigrations(db);
    console.log('Seeding / verifying initial temple catalog and staff...');
    await seedInitialData(db);

    const app = await buildApp();
    const port = parseInt(process.env.PORT || '4000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`Temple Seva Booking Backend running on http://${host}:${port}`);
    console.log(`Health check: http://${host}:${port}/health`);

    const shutdown = async () => {
      console.log('Gracefully stopping server...');
      await app.close();
      await closeDb();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

