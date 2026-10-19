# Temple Seva Booking System (శ్రీ శారదా పీఠం సన్నిధానం)

> **Version:** V1  
> **Type:** Production-minded web application for a sacred Hindu temple associated with Sri Sringeri Sharada Peetham.  
> **Core Tenet:** A simple, fast, devotional Seva Booking and Gothra Recording System designed specifically for temple counter staff, poojaris, and administration.

---

## 1. Product Vision & Architecture

The application is purpose-built to record pooja and seva bookings at the temple counter, preserve accurate devotee gothra and family details for sankalpam, print individual 80mm thermal receipts for every seva item, provide poojaris with a read-only ritual schedule, and give temple administrators complete daily closing and reconciliation reports.

### Architecture Overview

The system is designed as a **Modular Monolith** to maximize reliability, performance, and operational simplicity without introducing premature microservices:

```
temple-seva-booking/
├── backend/                  # Fastify + TypeScript Modular Backend
│   ├── src/
│   │   ├── db/              # SQL Migrations, Seed, & PostgreSQL / PGlite Client
│   │   ├── middleware/      # JWT Authentication & Server-Side RBAC
│   │   ├── modules/
│   │   │   ├── auth/        # Staff, Admin, & Poojari identity & passwords
│   │   │   ├── devotees/    # Devotee registry & 90-day privacy retention
│   │   │   ├── sevas/       # Seva catalogue, pricing, & date scheduling
│   │   │   ├── bookings/    # Cart validation (Rules 1-5), transactions
│   │   │   ├── tickets/     # Unique ticket allocation & safe reprinting
│   │   │   ├── payments/    # Cash & temple UPI merchant verification
│   │   │   ├── poojari/     # Read-only dashboard with date isolation
│   │   │   ├── reports/     # Daily, weekly, monthly, & CSV exports
│   │   │   ├── daily-closure/# End-of-day reconciliation & sign-off
│   │   │   ├── retention/   # 90-day profile cleanup with audit logging
│   │   │   ├── audit/       # Append-only tamper-evident audit logs
│   │   │   └── settings/    # Temple identity & UPI merchant QR configuration
│   │   └── tests/           # 28+ Automated Vitest integration & security tests
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/      # GothraSelector, DevoteeLookup, ThermalTicketModal, Navbar
│   │   ├── context/         # AuthContext & role session management
│   │   ├── pages/           # BookingCounterPage, AdminDashboardPage, PoojariDashboardPage, LoginPage
│   │   └── types.ts         # Shared TypeScript interfaces
├── .env.example             # Configuration template
└── package.json             # Root npm workspaces orchestration
```

---

## 2. Core Booking Rules Implemented

| Rule | Specification | Implementation in V1 |
|---|---|---|
| **Rule 1** | **One Cart = One Ritual Beneficiary** | A cart represents one set of ritual details (Beneficiary Name, Gothra, Family details). Payer and Beneficiary are modeled separately. |
| **Rule 2** | **Multiple Sevas Allowed** | Devotees can add multiple sevas (e.g., Archana + Abhishekam) sharing the same beneficiary and gothra in one cart. |
| **Rule 3** | **Different Gothra/Beneficiary = Separate Cart** | Server strictly validates all items. Conflicting gothras or beneficiaries are rejected with a clear instruction to complete the current booking or start a new cart. |
| **Rule 4** | **1 Ticket Per Seva Item** | If a cart contains $N$ seva items (or quantity $N$), the system generates $N$ individual tickets (`B-01025-01`, `B-01025-02`, ...). |
| **Rule 5** | **Consolidated Payment Tracking** | One consolidated payment is recorded for the entire cart. Reports aggregate at the payment level to prevent double-counting. Server calculates totals and rejects client-tampered amounts. |
| **Rule 6** | **Offline Special Arrangements** | No arbitrary special-instruction text fields on tickets. Staff directs complex multi-gothra arrangements to the poojari offline. |
| **Rule 7** | **Ticket Reprinting Safety** | Reprinting increments `reprint_count`, updates timestamp, and creates an audit log. It never creates a new booking, ticket number, or payment entry. |
| **Rule 8** | **Cancellations & Corrections** | Completed bookings cannot be silently deleted. Only admins can cancel with an explicit audit reason; tickets are cancelled and payments marked as refunded. |
| **Rule 9** | **Pooja Scheduling (Requirement 9)** | Admin can schedule special poojas for a future date. The pooja is immediately available in the booking counter catalogue for advance registration, but **appears on the Poojari dashboard ONLY on the scheduled date**. |

---

## 3. User Roles and Access Control (RBAC)

All endpoints enforce strict server-side authorization:

1. **Admin (`admin`)**:
   - Access to administrative dashboard and metric overviews.
   - Configure sevas, categories, prices, and date schedules.
   - Assign sevas to poojaris.
   - Create, enable, and disable staff and poojari accounts.
   - View reports (daily, weekly, monthly, custom) and export CSVs.
   - Perform end-of-day daily closures.
   - Cancel bookings with refund audit records.
   - Review and execute devotee profile retention cleanup.
   - Configure temple branding and UPI merchant settings.

2. **Booking Counter Staff (`booking_staff`)**:
   - Fast devotee lookup by mobile or name.
   - Auto-suggestion of saved gothra and family details for returning devotees.
   - Add multiple sevas to cart under one gothra.
   - Record Cash or verified UPI payments.
   - Instant 80mm thermal receipt printing and safe reprinting.
   - **Forbidden:** Cannot modify seva prices, delete financial records, manage accounts, or run data cleanup.

3. **Poojari (`poojari` - Strictly Read-Only)**:
   - Dedicated mobile-friendly dashboard.
   - View assigned sevas and devotee sankalpa lists for any selected date.
   - Displays ritual beneficiary name, gothra, family details, and ticket numbers.
   - Print-friendly ritual list view.
   - **Forbidden:** Strictly read-only. Cannot create/edit/cancel bookings, cannot modify assignments, cannot access devotee database, and **cannot view payment amounts or financial reports**.
   - **Poojari Isolation:** Poojari A cannot view Poojari B's assigned records.

---

## 4. Database Setup & Supabase Compatibility

The system uses standard PostgreSQL with version-controlled migrations:

### Option A: Zero-Setup Embedded PostgreSQL (Default for local development & testing)
If `DATABASE_URL` is omitted, the application uses **PGlite** (pure PostgreSQL WASM runtime in Node.js) saving data to `./temple_data.db`. It supports standard PostgreSQL dialect, transactions, constraints, indexes, and migrations without installing PostgreSQL locally!

### Option B: Supabase or Managed PostgreSQL
To connect to Supabase:
1. Create a project in [Supabase](https://supabase.com).
2. Go to **Project Settings** -> **Database** -> **Connection String** (Transaction Pooler or Direct).
3. Set in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. Run migrations:
   ```bash
   npm run migrate
   ```

---

## 5. Quickstart & Local Development

### Prerequisites
- Node.js v20.x or higher
- npm 10.x or higher

### 1. Installation
Clone the repository and install all workspace dependencies:
```bash
git clone <repo-url> temple-seva-booking
cd temple-seva-booking
npm install
```

### 2. Configure Environment
```bash
cp .env.example backend/.env
```

### 3. Initialize Database & Seed Initial Accounts
```bash
npm run seed
```

This runs migrations and creates initial credentials:
- **Admin:** `username: admin` | `password: Admin@Sringeri123`
- **Booking Staff:** `username: staff` | `password: Staff@Sringeri123`
- **Poojari:** `username: poojari_sharma` | `password: Poojari@Sringeri123`

### 4. Start Development Servers
Run backend and frontend concurrently:
```bash
# Terminal 1: Backend (Port 4000)
npm run dev:backend

# Terminal 2: Frontend (Port 3000)
npm run dev:frontend
```

Open your browser at `http://localhost:3000`.

---

## 6. Running Automated Tests

A comprehensive Vitest test suite verifies all 30 core requirements from the project specification:
```bash
npm test
```

### What the test suite verifies:
- **Booking Rules 1 - 9:** Cart rules, single beneficiary per cart, conflicting gothra rejection, 1 ticket per item, safe reprinting, price snapshot isolation, and profile snapshot isolation.
- **Payments 10 - 14:** Cash confirmation, UPI pending vs confirmed, pending exclusion from confirmed totals, idempotency keys, and rejection of client-tampered totals.
- **Authorization 15 - 21:** Admin access, staff price restriction, staff cleanup restriction, poojari read-only restrictions, poojari financial isolation, and unauthenticated rejections.
- **Retention 22 - 25:** 90-day threshold preview, snapshot preservation during profile cleanup, and audit logging.
- **Reliability 26 - 30:** Duplicate prevention, concurrent ticket allocation safety, printing failure recovery, report reconciliation, and unauthorized rejection.
- **Requirement 9:** Advance booking of scheduled poojas and date-specific poojari visibility.

---

## 7. Operational Guidelines

### A. Initial Admin Setup
1. Set `INITIAL_ADMIN_PASSWORD` in `backend/.env`.
2. Run `npm run seed`.
3. Sign in at `/login` with `admin` and your password.
4. From the **Staff & Poojaris** tab, create accounts for counter operators and temple poojaris.

### B. Thermal Printer Setup (80mm)
1. Connect any standard 80mm thermal receipt printer (USB, Ethernet, or Bluetooth) to the counter PC/tablet.
2. In the OS printer settings:
   - Paper Size: **80mm Receipt** / **Continuous Roll 80mm**.
   - Margins: **None** (0mm).
   - Headers and Footers: **Disabled**.
3. In the counter UI, clicking **Confirm Booking** opens the print modal with pre-formatted 80mm thermal receipt layout. Pressing **Print All Tickets** triggers the browser print dialog with page breaks for each individual ticket.

### C. Temple Merchant UPI QR Configuration
1. Sign in as Admin and navigate to **Temple Settings & UPI**.
2. Update the `upi_config`:
   - Merchant Name (e.g., `SRI SRINGERI SHARADA PEETHAM TEMPLE`)
   - UPI VPA ID (e.g., `sringeri.temple@sbi`)
   - Upload or configure your official bank QR image URL.
   - Verification instructions for counter staff.
3. At the counter, selecting **Temple UPI QR** displays the temple's merchant info. Staff verifies confirmation on the counter soundbox/SMS before toggling **Confirmed**.

### D. End-of-Day Daily Closure Procedure
1. Navigate to **Daily Closure** in the Admin Dashboard.
2. Review the checklist:
   - Count cash drawer notes and match with the system cash total.
   - Reconcile UPI collections against bank merchant soundbox records.
   - Resolve any pending payments.
3. Enter closure notes and click **Verify & Sign-Off Daily Closure**.
4. The snapshot is permanently stored and audited.

### E. Devotee Privacy & 90-Day Retention Policy
1. Reusable profiles inactive for >90 days appear under **Devotee Privacy & Retention**.
2. The admin can preview the list of eligible profiles and the exact count.
3. When the admin authorizes cleanup with explicit confirmation:
   - Reusable profile contact details are cleaned up.
   - **Crucial:** All historical bookings, tickets, and payment records remain 100% untouched.

---

## 8. Backup & Restore Procedures

### Embedded Database (PGlite)
- Backup: Copy the `./temple_data.db` folder to a secure backup storage location.
- Restore: Replace the `./temple_data.db` folder while the backend is stopped.

### PostgreSQL / Supabase
- Backup via `pg_dump`:
  ```bash
  pg_dump "$DATABASE_URL" -F c -b -v -f temple_backup_$(date +%Y%m%d).dump
  ```
- Restore via `pg_restore`:
  ```bash
  pg_restore -d "$DATABASE_URL" -v temple_backup_YYYYMMDD.dump
  ```

---

## 9. Feature Implementation Status

### Implemented in V1:
- [x] Fast counter seva booking workflow with devotional styling.
- [x] Strict Rule 1-5 cart enforcement (1 beneficiary, 1 gothra per cart, separate carts for conflicting details).
- [x] Unique ticket numbering (`B-01025-01`, `B-01025-02`).
- [x] Safe ticket reprinting with duplicate badge and audit log.
- [x] Devotee lookup with saved gothra and family details auto-suggestion.
- [x] Admin Seva catalogue with price management and active/inactive status.
- [x] **Requirement 9:** Seva date scheduling (visible for advance counter booking, shown to poojaris on scheduled date only).
- [x] Poojari assignments and mobile-friendly read-only poojari dashboard.
- [x] Zero financial data exposure to poojaris.
- [x] Cash and Temple UPI QR payment workflows.
- [x] Consolidated cart payment recording (no double counting).
- [x] Server-side price calculation and tamper protection.
- [x] Daily, weekly, monthly reports with 1-click CSV download.
- [x] Daily closing checklist and reconciliation sign-off.
- [x] 90-day devotee profile retention preview and audited cleanup.
- [x] Historical snapshot preservation (booking records survive profile updates/cleanups).
- [x] Server-side RBAC and safe error messages without technical logs.
- [x] 28 Automated test suite passing with 100% success.

### Excluded from V1 (Future Capabilities):
- Public devotee self-booking portal (OTP auth model designed for future readiness).
- Direct payment gateway API (Razorpay/Cashfree webhook integration).
- Multi-temple ERP / Inventory / Procurement / Payroll.

