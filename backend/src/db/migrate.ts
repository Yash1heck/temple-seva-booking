import { getDb, runMigrations, closeDb } from './index.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Running database migrations...');
  const db = await getDb();
  await runMigrations(db);
  console.log('Migrations completed successfully.');
  await closeDb();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

