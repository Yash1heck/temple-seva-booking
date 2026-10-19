import { getDb, runMigrations, closeDb } from './index.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Seeding initial temple database...');
  const db = await getDb();
  await runMigrations(db);

  // 1. Initial Admin Account
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@Sringeri123';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  
  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO NOTHING`,
    ['admin', 'Sri Sringeri Admin', 'admin', adminHash]
  );

  // 2. Initial Booking Staff Account
  const staffPassword = process.env.INITIAL_STAFF_PASSWORD || 'Staff@Sringeri123';
  const staffHash = await bcrypt.hash(staffPassword, 10);
  
  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO NOTHING`,
    ['staff', 'Counter Staff 1', 'booking_staff', staffHash]
  );

  // 3. Initial Poojari Account (Shared Temple Archaka Account)
  const poojariPassword = process.env.INITIAL_POOJARI_PASSWORD || 'Poojari@Sringeri123';
  const poojariHash = await bcrypt.hash(poojariPassword, 10);

  // Standard shared poojari account
  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO NOTHING`,
    ['poojari', 'Temple Archaka Brindam (శ్రీ శారదా పీఠం అర్చకులు)', 'poojari', poojariHash]
  );

  // Named poojari account for legacy/individual reference
  await db.query(
    `INSERT INTO staff_users (username, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO NOTHING`,
    ['poojari_sharma', 'Brahmasri Sharma Deekshitulu', 'poojari', poojariHash]
  );

  // Retrieve poojari user id
  const poojariRes = await db.query(`SELECT id FROM staff_users WHERE username = 'poojari' LIMIT 1`);
  const poojariId = poojariRes.rows[0]?.id;

  // 4. Seed Sevas (Catalogue)
  // Note: One scheduled pooja to fulfill requirement:
  // "9) Admin side while adding pooja they can schedule it so once a pooja is scheduled it will be shown in pooja dashboard for booking but for poojari the pooja will be shown on the scheduled date only"
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
      description: 'Sri Rudra Prashna recitation with Bilva and holy offerings',
      category: 'Special Pooja',
      price: 500.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '08:30 AM - 10:00 AM'
    },
    {
      name: 'Ganapathi Homam',
      telugu_name: 'గణపతి హోమం',
      description: 'Sacred fire ritual to remove obstacles and invoke auspicious blessings',
      category: 'Homam',
      price: 1000.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '07:00 AM - 08:30 AM'
    },
    {
      name: 'Chandi Homam',
      telugu_name: 'చండీ హోమం',
      description: 'Maha Chandi Yagnyam for divine protection, peace, and spiritual prosperity',
      category: 'Homam',
      price: 2500.00,
      is_active: true,
      is_scheduled: false,
      scheduled_date: null,
      timing: '08:00 AM - 12:00 PM'
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
      name: 'Upcoming Special Kalashabhishekam',
      telugu_name: 'ప్రత్యేక కలశాభిషేకం (రాబోయే తేదీ)',
      description: 'Scheduled upcoming holy Kalasha ritual',
      category: 'Special Pooja',
      price: 1200.00,
      is_active: true,
      is_scheduled: true,
      scheduled_date: tomorrow,
      timing: '09:00 AM - 11:30 AM'
    }
  ];

  for (const s of sevas) {
    const existing = await db.query(`SELECT id FROM sevas WHERE name = $1 LIMIT 1`, [s.name]);
    let sevaId: string;
    if (existing.rows.length === 0) {
      const ins = await db.query(
        `INSERT INTO sevas (name, telugu_name, description, category, price, is_active, is_scheduled, scheduled_date, timing)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [s.name, s.telugu_name, s.description, s.category, s.price, s.is_active, s.is_scheduled, s.scheduled_date, s.timing]
      );
      sevaId = ins.rows[0].id;
    } else {
      sevaId = existing.rows[0].id;
    }

    // Assign Daily Poojas and Today's Special Pooja to poojari
    if (poojariId && (s.name.includes('Archana') || s.name.includes('Abhishekam') || s.name.includes('Today Scheduled'))) {
      await db.query(
        `INSERT INTO poojari_assignments (poojari_id, seva_id)
         VALUES ($1, $2)
         ON CONFLICT (poojari_id, seva_id) DO NOTHING`,
        [poojariId, sevaId]
      );
    }
  }

  // 5. Seed Temple Settings
  const settings = [
    {
      key: 'temple_info',
      value: JSON.stringify({
        name: 'Sri Sharada Peetham Temple (Sringeri Mutt Affiliated)',
        telugu_name: 'శ్రీ శారదా పీఠం సన్నిధానం',
        address: 'Temple Road, Sacred Kshetram',
        contact_phone: '+91 8265 250123',
        tagline: 'శృంగేరి జగద్గురు శంకరాచార్య మహాసంస్థానం'
      }),
      description: 'Temple identity, display names, and contact details'
    },
    {
      key: 'upi_config',
      value: JSON.stringify({
        merchant_name: 'SRI SRINGERI SHARADA PEETHAM TEMPLE',
        upi_id: 'sringeri.temple@sbi',
        qr_image_url: '/assets/temple_upi_qr.png',
        verification_instruction: 'Devotee scans QR at counter. Verify confirmation on temple soundbox or bank merchant notification before completing.'
      }),
      description: 'Temple merchant UPI configuration for counter collection'
    },
    {
      key: 'retention_policy',
      value: JSON.stringify({
        min_retention_days: 90,
        policy_name: '90-Day Devotee Profile Retention Policy',
        description: 'Profiles inactive for more than 90 days are eligible for cleanup preview. Historical bookings are never deleted.'
      }),
      description: 'Devotee profile retention configuration'
    }
  ];

  for (const set of settings) {
    await db.query(
      `INSERT INTO temple_settings (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description`,
      [set.key, set.value, set.description]
    );
  }

  // 6. Seed Sample Devotees for Lookup Testing
  const devotees = [
    {
      mobile: '9849012345',
      name: 'Narasimha Sastry',
      gothra: 'Kashyapa',
      family_details: 'Wife: Lakshmi, Son: Srivatsa'
    },
    {
      mobile: '9849098765',
      name: 'Venkata Raman',
      gothra: 'Bharadwaja',
      family_details: 'Self: Venkata Raman (Anuradha Nakshatra)'
    },
    {
      mobile: '9848055555',
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

  console.log('Seeding completed successfully!');
  await closeDb();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

