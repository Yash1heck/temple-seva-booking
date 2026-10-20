import { getDb, runMigrations, closeDb, IDatabaseClient } from './index.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

export async function seedInitialData(db: IDatabaseClient): Promise<void> {
  const resetPasswords = process.env.RESET_DEFAULT_PASSWORDS === 'true';

  // 1. Initial Admin Account
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@Sringeri123';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  
  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO UPDATE
     SET password_hash = CASE WHEN $5 = true THEN EXCLUDED.password_hash ELSE staff_users.password_hash END`,
    ['admin', 'Sri Sringeri Admin', 'admin', adminHash, resetPasswords]
  );

  // 2. Initial Booking Staff Account
  const staffPassword = process.env.INITIAL_STAFF_PASSWORD || 'Staff@Sringeri123';
  const staffHash = await bcrypt.hash(staffPassword, 10);
  
  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO UPDATE
     SET password_hash = CASE WHEN $5 = true THEN EXCLUDED.password_hash ELSE staff_users.password_hash END`,
    ['staff', 'Counter Staff 1', 'booking_staff', staffHash, resetPasswords]
  );

  // 3. Initial Poojari Account (Shared Temple Archaka Account)
  const poojariPassword = process.env.INITIAL_POOJARI_PASSWORD || 'Poojari@Sringeri123';
  const poojariHash = await bcrypt.hash(poojariPassword, 10);

  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO UPDATE
     SET password_hash = CASE WHEN $5 = true THEN EXCLUDED.password_hash ELSE staff_users.password_hash END`,
    ['poojari', 'Temple Archaka Brindam (శ్రీ శారదా పీఠం అర్చకులు)', 'poojari', poojariHash, resetPasswords]
  );

  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO UPDATE
     SET password_hash = CASE WHEN $5 = true THEN EXCLUDED.password_hash ELSE staff_users.password_hash END`,
    ['poojari_sharma', 'Brahmasri Sharma Deekshitulu', 'poojari', poojariHash, resetPasswords]
  );

  // Retrieve poojari user id
  const poojariRes = await db.query(`SELECT id FROM staff_users WHERE username = 'poojari' LIMIT 1`);
  const poojariId = poojariRes.rows[0]?.id;

  // 4. Seed Sevas (Idempotent per-seva check)
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const sevas = [
    {
      name: 'Archana',
      telugu_name: 'అర్చన',
      description: 'Ashtothara Shatanama Archana with Kumkuma and flowers',
      category: 'Daily Pooja',
      price: 50.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '06:00 AM - 12:00 PM, 05:00 PM - 08:30 PM'
    },
    {
      name: 'Nitya Abhishekam',
      telugu_name: 'నిత్య అభిషేకం',
      description: 'Morning sacred bath of the deity with Panchamrita and Vedic Chanting',
      category: 'Daily Pooja',
      price: 200.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '07:30 AM - 08:30 AM'
    },
    {
      name: 'Sri Lalitha Sahasranama Archana',
      telugu_name: 'శ్రీ లలితా సహస్రనామ అర్చన',
      description: 'Chanting of 1000 holy names of Sri Sharadamba with saffron vermilion',
      category: 'Special Pooja',
      price: 150.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '10:00 AM - 11:00 AM'
    },
    {
      name: 'Rudrabhishekam',
      telugu_name: 'రుద్రాభిషేకం',
      description: 'Sri Rudra Prashna Abhishekam to Lord Chandramouleeswara with Bilva leaves',
      category: 'Daily Pooja',
      price: 500.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '08:30 AM - 09:30 AM'
    },
    {
      name: 'Ganapathi Homam',
      telugu_name: 'గణపతి హోమం',
      description: 'Sacred fire ritual to remove obstacles and invoke auspicious blessings',
      category: 'Daily Pooja',
      price: 1000.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '07:00 AM - 08:30 AM'
    },
    {
      name: 'Chandi Homam (Pratyaksha)',
      telugu_name: 'చండీ హోమం (ప్రత్యక్షం)',
      description: 'Grand sacred fire ritual invokes the benevolent warrior aspect of Jagadamba',
      category: 'Special Homam',
      price: 2500.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '09:00 AM - 01:00 PM'
    },
    {
      name: 'Navagraha Shanti Homam',
      telugu_name: 'నవగ్రహ శాంతి హోమం',
      description: 'Planetary appeasement ritual for health, prosperity and removal of obstacles',
      category: 'Special Homam',
      price: 1500.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '08:00 AM - 11:00 AM'
    },
    {
      name: 'Suvasini Pooja & Kumkumarchana',
      telugu_name: 'సువాసిని పూజ & కుంకుమార్చన',
      description: 'Offering traditional tambulam, saree and kumkuma pooja to married women as divine forms',
      category: 'Special Pooja',
      price: 350.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '11:00 AM - 12:00 PM'
    },
    {
      name: 'Pournami Maha Pooja (Today Scheduled)',
      telugu_name: 'పౌర్ణమి మహా పూజ (నేడు)',
      description: 'Special full moon evening Deeparadhana and Suvasini Pooja',
      category: 'Special Pooja',
      price: 750.00,
      is_active: true,
      is_scheduled: true,
      scheduled_date: today,
      timing: '06:00 PM - 08:00 PM'
    },
    {
      name: 'Lakshmi Narayana Sahasranama Pooja',
      telugu_name: 'లక్ష్మీ నారాయణ సహస్రనామ పూజ',
      description: 'Pooja on auspicious Ekadashi or Fridays with Tulasi and lotus petals',
      category: 'Scheduled Special',
      price: 500.00,
      is_active: true,
      is_scheduled: true,
      scheduled_date: tomorrow,
      timing: '05:30 PM - 07:00 PM'
    },
    {
      name: 'Maha Ganapathi Homam',
      telugu_name: 'మహా గణపతి హోమం',
      description: 'Early morning oblations for removing all doshas and starting new endeavors',
      category: 'Daily Pooja',
      price: 750.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '05:30 AM - 07:00 AM'
    },
    {
      name: 'Karpura Harathi & Prasada Seva',
      telugu_name: 'కర్పూర హారతి & ప్రసాద సేవ',
      description: 'Evening deeparadhana with special Laddu and Panchamrita prasadam packet',
      category: 'Daily Pooja',
      price: 30.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: 'All Day'
    }
  ];

  const allPoojarisRes = await db.query(`SELECT id FROM staff_users WHERE role = 'poojari'`);
  const poojariList = allPoojarisRes.rows;

  for (const s of sevas) {
    let sevaRes = await db.query(`SELECT id FROM sevas WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`, [s.name]);
    let sevaId = sevaRes.rows[0]?.id;

    if (!sevaId) {
      try {
        const ins = await db.query(
          `INSERT INTO sevas (name, telugu_name, description, category, price, is_active, is_scheduled, scheduled_date, timing)
           VALUES ($1, $2, $3, $4, $5::numeric, $6::boolean, $7::boolean, $8::date, $9)
           RETURNING id`,
          [s.name, s.telugu_name, s.description, s.category, s.price, s.is_active, s.is_scheduled, s.scheduled_date, s.timing]
        );
        sevaId = ins.rows[0]?.id;
      } catch (err: any) {
        console.error(`Error inserting seva '${s.name}':`, err.message);
      }
    }

    if (sevaId) {
      for (const p of poojariList) {
        await db.query(
          `INSERT INTO poojari_assignments (seva_id, poojari_id)
           SELECT $1, $2
           WHERE NOT EXISTS (
             SELECT 1 FROM poojari_assignments WHERE seva_id = $1 AND poojari_id = $2
           )`,
          [sevaId, p.id]
        );
      }
    }
  }

  // 5. Seed Temple Settings (if empty)
  const settingsCountRes = await db.query(`SELECT COUNT(*) as count FROM temple_settings`);
  const settingsCount = parseInt(settingsCountRes.rows[0]?.count || '0', 10);

  if (settingsCount === 0) {
    const defaultSettings = [
      {
        key: 'temple_info',
        value: {
          name: 'Sri Sringeri Sharada Peetham',
          name_telugu: 'శ్రీ శృంగేరి శారదా పీఠం',
          subtitle: 'Dakshinamnaya Sri Sharada Peetham Temple Seva Counter',
          address: 'Harihara Street, Sringeri, Chikkamagaluru District, Karnataka - 577139',
          phone: '+91 8265 250123 / 250192',
          email: 'seva@sringeripeetham.org',
          tax_exemption_info: '80G Exemption Order No: DIT(E)/BLR/80G/12/2012-13',
          receipt_footer: 'సర్వే జనాః సుఖినో భవంతు • సమస్త సన్మంగళాని భవంతు',
          currency_symbol: '₹'
        },
        description: 'Core temple administrative details and receipt headings'
      },
      {
        key: 'upi_payment_config',
        value: {
          upi_id: 'sringeripeetham@sbi',
          payee_name: 'Sri Sringeri Sharada Peetham Seva Trust',
          merchant_code: '5999',
          notes: 'Temple Seva Counter Direct Collections',
          enable_qr: true,
          standee_photo_url: ''
        },
        description: 'Official UPI merchant configuration and dynamic QR parameters'
      },
      {
        key: 'data_retention_policy',
        value: {
          retention_months: 3,
          auto_cleanup_enabled: false,
          exempt_gothras: []
        },
        description: 'Data retention compliance policy for devotee personal contacts'
      }
    ];

    for (const st of defaultSettings) {
      await db.query(
        `INSERT INTO temple_settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [st.key, JSON.stringify(st.value), st.description]
      );
    }
  }

  // 6. Seed Devotees (if empty)
  const devCountRes = await db.query(`SELECT COUNT(*) as count FROM devotees`);
  const devCount = parseInt(devCountRes.rows[0]?.count || '0', 10);

  if (devCount === 0) {
    const devotees = [
      {
        mobile: '9848012345',
        name: 'Kashyapa Venkata Ramana Rao',
        gothra: 'Kashyapa',
        family_details: 'Wife: Lakshmi, Son: Aditya, Daughter: Sharada'
      },
      {
        mobile: '9849054321',
        name: 'Bharadwaja Sitarama Sastry',
        gothra: 'Bharadwaja',
        family_details: 'Wife: Vani, Mother: Saraswathi'
      },
      {
        mobile: '9440112233',
        name: 'Subrahmanya Sarma',
        gothra: 'Harithasa',
        family_details: 'Wife: Annapurna, Daughter: Sharada'
      }
    ];

    for (const d of devotees) {
      await db.query(
        `INSERT INTO devotees (mobile, name, gothra, family_details, profile_status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [d.mobile, d.name, d.gothra, d.family_details]
      );
    }
  }

  console.log('Seeding completed successfully!');
}

async function main() {
  console.log('Seeding initial temple database...');
  const db = await getDb();
  await runMigrations(db);
  await seedInitialData(db);
  await closeDb();
}

// Allow direct CLI invocation: tsx src/db/seed.ts
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  main().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
