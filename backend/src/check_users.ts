import { getDb, closeDb } from './db/index.js';
import bcrypt from 'bcryptjs';

async function run() {
  const db = await getDb();
  const poojariHash = await bcrypt.hash('Poojari@Sringeri123', 10);
  
  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true`,
    ['poojari', 'Temple Archaka Brindam (శ్రీ శారదా పీఠం అర్చకులు)', 'poojari', poojariHash]
  );

  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true`,
    ['poojari_sharma', 'Brahmasri Sharma Deekshitulu', 'poojari', poojariHash]
  );

  const res = await db.query('SELECT username, role, name, is_active FROM staff_users');
  console.log('ALL USERS IN DB AFTER INSERT:', res.rows);
  await closeDb();
}

run().catch(console.error);
