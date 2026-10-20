import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { getDb, runMigrations, closeDb, IDatabaseClient } from '../db/index.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { SevaService } from '../modules/sevas/seva.service.js';
import { BookingService } from '../modules/bookings/booking.service.js';
import { TicketService } from '../modules/tickets/ticket.service.js';
import { DevoteeService } from '../modules/devotees/devotee.service.js';
import { ReportService } from '../modules/reports/report.service.js';
import { RetentionService } from '../modules/retention/retention.service.js';
import { PoojariService } from '../modules/poojari/poojari.service.js';
import { getTempleToday, getTempleTomorrow } from '../utils/date.js';

describe('Temple Seva Booking System - V1 Complete Test Suite', () => {
  let app: FastifyInstance;
  let testDb: IDatabaseClient;
  let adminToken: string;
  let staffToken: string;
  let poojariAToken: string;
  let poojariBToken: string;

  let adminUser: any;
  let staffUser: any;
  let poojariA: any;
  let poojariB: any;

  let archanaSeva: any;
  let abhishekamSeva: any;
  let specialScheduledSeva: any;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = ':memory:';
    testDb = await getDb();
    await runMigrations(testDb);

    // Create Admin User
    adminUser = await AuthService.createUser({
      username: 'test_admin',
      name: 'Admin Ji',
      role: 'admin',
      password: 'AdminPassword123'
    }, testDb);

    // Create Staff User
    staffUser = await AuthService.createUser({
      username: 'test_staff',
      name: 'Counter Staff Ji',
      role: 'booking_staff',
      password: 'StaffPassword123'
    }, testDb);

    // Create Poojari A User
    poojariA = await AuthService.createUser({
      username: 'poojari_a',
      name: 'Sri Sharma Poojari',
      role: 'poojari',
      password: 'PoojariPassword123'
    }, testDb);

    // Create Poojari B User
    poojariB = await AuthService.createUser({
      username: 'poojari_b',
      name: 'Sri Shastri Poojari',
      role: 'poojari',
      password: 'PoojariPassword123'
    }, testDb);

    // Create Sevas
    archanaSeva = await SevaService.create({
      name: 'Test Archana',
      price: 50.00,
      category: 'Daily Pooja',
      is_active: true,
      assigned_poojari_ids: [poojariA.id]
    }, testDb);

    abhishekamSeva = await SevaService.create({
      name: 'Test Abhishekam',
      price: 200.00,
      category: 'Daily Pooja',
      is_active: true,
      assigned_poojari_ids: [poojariA.id]
    }, testDb);

    // Scheduled Seva for a future date (Tomorrow)
    const tomorrow = getTempleTomorrow();
    specialScheduledSeva = await SevaService.create({
      name: 'Test Special Pournami',
      price: 750.00,
      category: 'Special Pooja',
      is_active: true,
      is_scheduled: true,
      scheduled_date: tomorrow,
      assigned_poojari_ids: [poojariA.id]
    }, testDb);

    // Build Fastify App
    app = await buildApp();

    // Generate Tokens
    adminToken = app.jwt.sign({ id: adminUser.id, username: adminUser.username, name: adminUser.name, role: adminUser.role });
    staffToken = app.jwt.sign({ id: staffUser.id, username: staffUser.username, name: staffUser.name, role: staffUser.role });
    poojariAToken = app.jwt.sign({ id: poojariA.id, username: poojariA.username, name: poojariA.name, role: poojariA.role });
    poojariBToken = app.jwt.sign({ id: poojariB.id, username: poojariB.username, name: poojariB.name, role: poojariB.role });
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDb();
  });

  // =========================================================================
  // BOOKING RULES (Tests 1 - 9)
  // =========================================================================

  it('Rule 1 & 2: A cart with multiple seva items and one gothra creates one parent booking', async () => {
    const bookingResult = await BookingService.createBooking({
      ritual_beneficiary_name: 'Venkata Raman',
      gothra: 'Kashyapa',
      family_details: 'Wife: Lakshmi, Son: Srivatsa',
      payer_name: 'Venkata Raman',
      payer_mobile: '9849011111',
      items: [
        { seva_id: archanaSeva.id, quantity: 1 },
        { seva_id: abhishekamSeva.id, quantity: 1 }
      ],
      payment: {
        method: 'cash',
        status: 'confirmed'
      },
      created_by_id: staffUser.id
    }, testDb);

    expect(bookingResult.booking).toBeDefined();
    expect(bookingResult.booking.booking_number).toMatch(/^B-\d+/);
    expect(bookingResult.booking.ritual_beneficiary_name).toBe('Venkata Raman');
    expect(bookingResult.booking.gothra).toBe('Kashyapa');
    expect(parseFloat(bookingResult.booking.total_amount)).toBe(250.00); // 50 + 200
    expect(bookingResult.items.length).toBe(2);
  });

  it('Rule 4: Every seva item generates its own unique ticket', async () => {
    const bookingResult = await BookingService.createBooking({
      ritual_beneficiary_name: 'Subrahmanya Sarma',
      gothra: 'Bharadwaja',
      family_details: 'Self only',
      items: [
        { seva_id: archanaSeva.id, quantity: 2 }, // 2 Archana tickets
        { seva_id: abhishekamSeva.id, quantity: 1 } // 1 Abhishekam ticket
      ],
      payment: {
        method: 'cash',
        status: 'confirmed'
      },
      created_by_id: staffUser.id
    }, testDb);

    expect(bookingResult.tickets.length).toBe(3);
    const ticketNumbers = bookingResult.tickets.map(t => t.ticket_number);
    const uniqueTicketNumbers = new Set(ticketNumbers);
    expect(uniqueTicketNumbers.size).toBe(3);

    // Verify format: e.g. B-01025-01, B-01025-02
    expect(ticketNumbers[0]).toContain('-01');
    expect(ticketNumbers[1]).toContain('-02');
    expect(ticketNumbers[2]).toContain('-03');
  });

  it('Rule 3: A different ritual beneficiary requires a separate cart', async () => {
    await expect(
      BookingService.createBooking({
        ritual_beneficiary_name: 'Father Raman',
        gothra: 'Kashyapa',
        items: [
          { seva_id: archanaSeva.id, quantity: 1, ritual_beneficiary_name: 'Mother Sita' }
        ],
        payment: { method: 'cash' },
        created_by_id: staffUser.id
      }, testDb)
    ).rejects.toThrow(/Conflicting ritual beneficiary detected/);
  });

  it('Rule 3 & 5: The application rejects conflicting gothras within a cart', async () => {
    await expect(
      BookingService.createBooking({
        ritual_beneficiary_name: 'Devotee',
        gothra: 'Kashyapa',
        items: [
          { seva_id: archanaSeva.id, quantity: 1, gothra: 'Bharadwaja' }
        ],
        payment: { method: 'cash' },
        created_by_id: staffUser.id
      }, testDb)
    ).rejects.toThrow(/Conflicting gothra detected/);
  });

  it('Rule 7: Ticket reprinting does not create a booking or payment', async () => {
    const booking = await BookingService.createBooking({
      ritual_beneficiary_name: 'Reprint Devotee',
      gothra: 'Atreya',
      items: [{ seva_id: archanaSeva.id, quantity: 1 }],
      payment: { method: 'cash' },
      created_by_id: staffUser.id
    }, testDb);

    const ticketId = booking.tickets[0].id;

    // Check count of bookings and payments before
    const bBefore = await testDb.query(`SELECT COUNT(*)::int as count FROM bookings`);
    const pBefore = await testDb.query(`SELECT COUNT(*)::int as count FROM payments`);

    // Perform reprint
    const reprintedTicket = await TicketService.reprintTicket(ticketId, staffUser.id, testDb);

    expect(reprintedTicket.reprint_count).toBe(1);
    expect(reprintedTicket.last_reprinted_at).not.toBeNull();

    // Check count of bookings and payments after: MUST REMAIN IDENTICAL
    const bAfter = await testDb.query(`SELECT COUNT(*)::int as count FROM bookings`);
    const pAfter = await testDb.query(`SELECT COUNT(*)::int as count FROM payments`);

    expect(bAfter.rows[0].count).toBe(bBefore.rows[0].count);
    expect(pAfter.rows[0].count).toBe(pBefore.rows[0].count);
  });

  it('Rule 5: Consolidated payment is not double-counted across items', async () => {
    const today = getTempleToday();
    const bRes = await BookingService.createBooking({
      ritual_beneficiary_name: 'Consolidated Devotee',
      gothra: 'Vasishta',
      items: [
        { seva_id: archanaSeva.id, quantity: 1 }, // 50
        { seva_id: abhishekamSeva.id, quantity: 1 } // 200
      ],
      payment: { method: 'cash', status: 'confirmed' },
      created_by_id: staffUser.id
    }, testDb);

    // Verify 1 payment record was created with amount 250
    const payments = await testDb.query(`SELECT * FROM payments WHERE booking_id = $1`, [bRes.booking.id]);
    expect(payments.rows.length).toBe(1);
    expect(parseFloat(payments.rows[0].amount)).toBe(250.00);

    // Generate report
    const report = await ReportService.generateReport(today, today, testDb);
    // Verified: The report aggregates payments directly from payments table
    expect(report.financials.cash_total).toBeGreaterThanOrEqual(250.00);

    // Verify listBookings query succeeds without error and returns the booking with items_summary
    const listed = await BookingService.listBookings({ limit: 10 }, testDb);
    expect(listed.length).toBeGreaterThan(0);
    expect(listed[0]).toHaveProperty('items_summary');
    expect(listed[0]).toHaveProperty('ticket_count');
  });

  it('Rule 8: Historical prices remain unchanged when the seva price changes', async () => {
    // 1. Book Archana at current price (50.00)
    const booking = await BookingService.createBooking({
      ritual_beneficiary_name: 'Historical Price Check',
      gothra: 'Kaundinya',
      items: [{ seva_id: archanaSeva.id, quantity: 1 }],
      payment: { method: 'cash' },
      created_by_id: staffUser.id
    }, testDb);

    const snapshotPrice = booking.items[0].seva_price_snapshot;
    expect(parseFloat(snapshotPrice)).toBe(50.00);

    // 2. Admin updates the current price of Archana to 100.00
    await SevaService.update(archanaSeva.id, { price: 100.00 }, testDb);

    // 3. Inspect historical booking item: snapshot must remain 50.00!
    const reloadedBooking = await BookingService.getBookingDetails(booking.booking.id, testDb);
    expect(parseFloat(reloadedBooking.items[0].seva_price_snapshot)).toBe(50.00);
    expect(parseFloat(reloadedBooking.tickets[0].amount)).toBe(50.00);

    // Revert price back to 50
    await SevaService.update(archanaSeva.id, { price: 50.00 }, testDb);
  });

  it('Rule 9: Historical booking snapshots remain unchanged when devotee profile changes', async () => {
    const devotee = await DevoteeService.create({
      mobile: '9999900000',
      name: 'Original Devotee Name',
      gothra: 'Gargya',
      family_details: 'Initial Details'
    }, testDb);

    const booking = await BookingService.createBooking({
      devotee_id: devotee.id,
      ritual_beneficiary_name: devotee.name,
      gothra: devotee.gothra,
      family_details: devotee.family_details,
      items: [{ seva_id: archanaSeva.id, quantity: 1 }],
      payment: { method: 'cash' },
      created_by_id: staffUser.id
    }, testDb);

    // Devotee updates their profile to a new gothra and name
    await DevoteeService.update(devotee.id, {
      name: 'Updated Devotee Name',
      gothra: 'Mudgala',
      family_details: 'Changed Details'
    }, testDb);

    // Verify historical booking snapshot did NOT silently change!
    const reloaded = await BookingService.getBookingDetails(booking.booking.id, testDb);
    expect(reloaded.booking.ritual_beneficiary_name).toBe('Original Devotee Name');
    expect(reloaded.booking.gothra).toBe('Gargya');
    expect(reloaded.booking.family_details).toBe('Initial Details');
  });

  // =========================================================================
  // PAYMENTS (Tests 10 - 14)
  // =========================================================================

  it('Payment 10: Cash can be recorded successfully as confirmed', async () => {
    const result = await BookingService.createBooking({
      ritual_beneficiary_name: 'Cash Devotee',
      gothra: 'Kashyapa',
      items: [{ seva_id: archanaSeva.id, quantity: 1 }],
      payment: { method: 'cash' },
      created_by_id: staffUser.id
    }, testDb);

    expect(result.payment.payment_method).toBe('cash');
    expect(result.payment.payment_status).toBe('confirmed');
    expect(result.payment.verified_by).toBe(staffUser.id);
  });

  it('Payment 11 & 12: UPI can be recorded as pending and is NOT counted as confirmed collections', async () => {
    const today = getTempleToday();
    const initialReport = await ReportService.generateReport(today, today, testDb);
    const initialConfirmed = initialReport.financials.confirmed_amount;

    const result = await BookingService.createBooking({
      ritual_beneficiary_name: 'UPI Pending Devotee',
      gothra: 'Kashyapa',
      items: [{ seva_id: abhishekamSeva.id, quantity: 1 }], // 200
      payment: { method: 'upi', status: 'pending', transaction_reference: 'UPI12345' },
      created_by_id: staffUser.id
    }, testDb);

    expect(result.payment.payment_method).toBe('upi');
    expect(result.payment.payment_status).toBe('pending');

    // Report check: Confirmed collections must NOT increase by the pending 200 amount!
    const afterReport = await ReportService.generateReport(today, today, testDb);
    expect(afterReport.financials.confirmed_amount).toBe(initialConfirmed);
    expect(afterReport.financials.pending_amount).toBeGreaterThanOrEqual(200.00);
  });

  it('Payment 13: Repeated requests with idempotency key do not create duplicate payment records', async () => {
    const idempotencyKey = 'unique-req-abc-123';
    const input = {
      ritual_beneficiary_name: 'Idempotent Devotee',
      gothra: 'Kashyapa',
      items: [{ seva_id: archanaSeva.id, quantity: 1 }],
      payment: { method: 'cash' as const },
      created_by_id: staffUser.id,
      idempotency_key: idempotencyKey
    };

    const first = await BookingService.createBooking(input, testDb);
    const second = await BookingService.createBooking(input, testDb);

    expect(second.booking.id).toBe(first.booking.id);
    expect(second.tickets.length).toBe(first.tickets.length);
  });

  it('Payment 14: Invalid client-submitted totals are rejected by server', async () => {
    await expect(
      BookingService.createBooking({
        ritual_beneficiary_name: 'Cheating Client',
        gothra: 'Kashyapa',
        items: [{ seva_id: abhishekamSeva.id, quantity: 1 }], // Server price is 200
        client_submitted_total: 10.00, // Client attempts to pay 10 instead of 200
        payment: { method: 'cash' },
        created_by_id: staffUser.id
      }, testDb)
    ).rejects.toThrow(/Payment total mismatch/);
  });

  // =========================================================================
  // AUTHORIZATION (Tests 15 - 21)
  // =========================================================================

  it('Auth 15: Admin can access authorized administrative functions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/users',
      headers: { authorization: `Bearer ${adminToken}` }
    });
    expect(res.statusCode).toBe(200);
  });

  it('Auth 16: Booking staff cannot modify seva prices', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/sevas/${archanaSeva.id}`,
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { price: 999.00 }
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toMatch(/Access denied/);
  });

  it('Auth 17: Booking staff cannot perform data cleanup', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/retention/cleanup',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { confirm: true }
    });
    expect(res.statusCode).toBe(403);
  });

  it('Auth 18: Poojaris cannot create or edit bookings', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: { authorization: `Bearer ${poojariAToken}` },
      payload: {
        ritual_beneficiary_name: 'Illegal Booking',
        gothra: 'Kashyapa',
        items: [{ seva_id: archanaSeva.id, quantity: 1 }],
        payment: { method: 'cash' }
      }
    });
    expect(res.statusCode).toBe(403);
  });

  it('Auth 19: Poojaris cannot access payment totals or financial reports', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/reports/summary',
      headers: { authorization: `Bearer ${poojariAToken}` }
    });
    expect(res.statusCode).toBe(403);
  });

  it('Auth 20: Poojari A cannot access Poojari B assigned records', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/poojari/dashboard?poojariId=${poojariB.id}`,
      headers: { authorization: `Bearer ${poojariAToken}` }
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toContain('Unauthorized');
  });

  it('Auth 21: Unauthenticated users cannot access protected booking data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/bookings'
    });
    expect(res.statusCode).toBe(401);
  });

  // =========================================================================
  // RETENTION (Tests 22 - 25)
  // =========================================================================

  it('Retention 22 & 23: Eligible profiles appear in cleanup preview based on 3-month policy', async () => {
    // Insert an old devotee inactive for 100 days
    await testDb.query(
      `INSERT INTO devotees (mobile, name, gothra, profile_status, last_activity_at)
       VALUES ('9111122222', 'Old Devotee', 'Kashyapa', 'active', NOW() - INTERVAL '100 days')`
    );

    const preview = await RetentionService.previewEligible(testDb);
    expect(preview.eligible_count).toBeGreaterThanOrEqual(1);
    const found = preview.sample_profiles.find(p => p.name === 'Old Devotee');
    expect(found).toBeDefined();
    expect(found!.days_inactive).toBeGreaterThanOrEqual(90);
  });

  it('Retention 24: Cleanup does not accidentally delete historical booking snapshots', async () => {
    // Devotee with historical booking
    const oldDevoteeRes = await testDb.query(
      `INSERT INTO devotees (mobile, name, gothra, profile_status, last_activity_at)
       VALUES ('9333344444', 'Devotee To Clean', 'Harithasa', 'active', NOW() - INTERVAL '120 days')
       RETURNING id`
    );
    const oldDevoteeId = oldDevoteeRes.rows[0].id;

    const booking = await BookingService.createBooking({
      devotee_id: oldDevoteeId,
      ritual_beneficiary_name: 'Devotee To Clean',
      gothra: 'Harithasa',
      items: [{ seva_id: archanaSeva.id, quantity: 1 }],
      payment: { method: 'cash' },
      created_by_id: staffUser.id
    }, testDb);

    // Devotee's last activity has crossed 120 days
    await testDb.query(`UPDATE devotees SET last_activity_at = NOW() - INTERVAL '120 days' WHERE id = $1`, [oldDevoteeId]);

    // Execute cleanup
    const cleanupResult = await RetentionService.executeCleanup(adminUser.id, 'Test cleanup', testDb);
    expect(cleanupResult.cleaned_count).toBeGreaterThan(0);

    // Verify historical booking and ticket snapshots are STILL completely intact!
    const historicalBooking = await BookingService.getBookingDetails(booking.booking.id, testDb);
    expect(historicalBooking.booking.ritual_beneficiary_name).toBe('Devotee To Clean');
    expect(historicalBooking.booking.gothra).toBe('Harithasa');
    expect(historicalBooking.tickets.length).toBe(1);
    expect(Number(historicalBooking.payment.amount)).toBe(50);
  });

  it('Retention 25: Cleanup operations are auditable', async () => {
    const runs = await RetentionService.listRuns(testDb);
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0].executed_by).toBe(adminUser.id);

    const auditLogs = await testDb.query(
      `SELECT * FROM audit_logs WHERE action = 'DATA_CLEANUP_PERFORMED'`
    );
    expect(auditLogs.rows.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // RELIABILITY & REQUIREMENT 9 (Tests 26 - 30)
  // =========================================================================

  it('Reliability 26: Duplicate submissions do not create duplicate tickets', async () => {
    const idempotencyKey = 'reliable-idemp-key-999';
    const payload = {
      ritual_beneficiary_name: 'Reliable Devotee',
      gothra: 'Kashyapa',
      items: [{ seva_id: archanaSeva.id, quantity: 1 }],
      payment: { method: 'cash' as const },
      created_by_id: staffUser.id,
      idempotency_key: idempotencyKey
    };

    const b1 = await BookingService.createBooking(payload, testDb);
    const b2 = await BookingService.createBooking(payload, testDb);

    expect(b1.tickets[0].id).toBe(b2.tickets[0].id);
    expect(b1.tickets[0].ticket_number).toBe(b2.tickets[0].ticket_number);
  });

  it('Reliability 27: Concurrent booking operations do not allocate the same ticket number', async () => {
    // Run two booking operations concurrently
    const [res1, res2] = await Promise.all([
      BookingService.createBooking({
        ritual_beneficiary_name: 'Concurrent Devotee 1',
        gothra: 'Kashyapa',
        items: [{ seva_id: archanaSeva.id, quantity: 1 }],
        payment: { method: 'cash' },
        created_by_id: staffUser.id
      }, testDb),
      BookingService.createBooking({
        ritual_beneficiary_name: 'Concurrent Devotee 2',
        gothra: 'Bharadwaja',
        items: [{ seva_id: archanaSeva.id, quantity: 1 }],
        payment: { method: 'cash' },
        created_by_id: staffUser.id
      }, testDb)
    ]);

    expect(res1.tickets[0].ticket_number).not.toBe(res2.tickets[0].ticket_number);
    expect(res1.booking.booking_number).not.toBe(res2.booking.booking_number);
  });

  it('Reliability 28: Printing failure does not erase a saved booking', async () => {
    const booking = await BookingService.createBooking({
      ritual_beneficiary_name: 'Printer Jam Devotee',
      gothra: 'Kashyapa',
      items: [{ seva_id: archanaSeva.id, quantity: 1 }],
      payment: { method: 'cash' },
      created_by_id: staffUser.id
    }, testDb);

    // Simulate browser printing failure in frontend (e.g. printer offline / paper jam)
    // Server state check: The booking must exist, be fully retrievable, and reprintable
    const retrieved = await BookingService.getBookingDetails(booking.booking.id, testDb);
    expect(retrieved.booking.id).toBe(booking.booking.id);
    expect(retrieved.tickets.length).toBe(1);

    // Ticket can be reprinted safely
    const reprinted = await TicketService.reprintTicket(retrieved.tickets[0].id, staffUser.id, testDb);
    expect(reprinted.reprint_count).toBe(1);
  });

  it('Reliability 29: Daily report totals reconcile with their underlying records', async () => {
    const today = getTempleToday();
    const report = await ReportService.generateReport(today, today, testDb);

    const actualDbBookings = await testDb.query(
      `SELECT COUNT(*)::int as count FROM bookings WHERE (created_at + INTERVAL '5 hours 30 minutes')::date = $1::date AND booking_status != 'cancelled'`,
      [today]
    );
    expect(report.total_bookings).toBe(actualDbBookings.rows[0].count);

    const actualDbConfirmed = await testDb.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric as total FROM payments WHERE (created_at + INTERVAL '5 hours 30 minutes')::date = $1::date AND payment_status = 'confirmed'`,
      [today]
    );
    expect(report.financials.confirmed_amount).toBe(parseFloat(actualDbConfirmed.rows[0].total));
  });

  it('Reliability 30: Unauthorized attempts are rejected by the backend', async () => {
    // Poojari attempting to access admin audit logs
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/audit-logs',
      headers: { authorization: `Bearer ${poojariAToken}` }
    });
    expect(res1.statusCode).toBe(403);

    // Booking staff attempting to access admin daily closure endpoint
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/daily-closure/close',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { date: '2026-10-20' }
    });
    expect(res2.statusCode).toBe(403);
  });

  // =========================================================================
  // REQUIREMENT 9: ADMIN SCHEDULED POOJA VISIBILITY
  // "9) Admin side while adding pooja they can schedule it so once a pooja is scheduled
  //     it will be shown in pooja dashboard for booking but for poojari the pooja
  //     will be shown on the scheduled date only"
  // =========================================================================

  it('Requirement 9: Scheduled pooja appears in booking catalogue, but appears on Poojari dashboard ONLY on scheduled date', async () => {
    const today = getTempleToday();
    const tomorrow = getTempleTomorrow();

    // 1. Counter Booking catalogue check: Special scheduled seva IS visible for booking
    const bookingCatalogue = await SevaService.listAll({ onlyActive: true }, testDb);
    const foundInBooking = bookingCatalogue.find(s => s.id === specialScheduledSeva.id);
    expect(foundInBooking).toBeDefined();
    expect(foundInBooking?.is_scheduled).toBe(true);
    expect(foundInBooking?.scheduled_date).toBe(tomorrow);

    // 2. Poojari Dashboard check for TODAY: The scheduled seva must NOT be shown today
    const poojariTodayRituals = await PoojariService.getAssignedRituals(poojariA.id, today, undefined, testDb);
    const foundInPoojariToday = poojariTodayRituals.find(r => r.seva_id === specialScheduledSeva.id);
    expect(foundInPoojariToday).toBeUndefined();

    // 3. Poojari Dashboard check for TOMORROW (Scheduled Date): The scheduled seva MUST be shown!
    const poojariTomorrowRituals = await PoojariService.getAssignedRituals(poojariA.id, tomorrow, undefined, testDb);
    const foundInPoojariTomorrow = poojariTomorrowRituals.find(r => r.seva_id === specialScheduledSeva.id);
    expect(foundInPoojariTomorrow).toBeDefined();
    expect(foundInPoojariTomorrow?.seva_name).toBe('Test Special Pournami');
  });
});
