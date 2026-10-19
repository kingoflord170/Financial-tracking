# MyFinance — Production-Ready Personal Finance & Monthly Budget Tracker

**MyFinance** is a modern, installable Progressive Web App (PWA) built for tracking personal finance, accounts, and monthly budgets in India. Designed mobile-first with a desktop dashboard, it uses near-black/navy surfaces, electric-blue accents, and standard Indian Rupee formatting (`₹`, locale `en-IN`, Asia/Kolkata timezone).

---

## Key Features & Capabilities

1. **Financial Dashboard & Analytics**
   - Authoritative liquid net worth across active bank accounts, cash, and digital wallets.
   - Monthly posted income, expenses, and net cash flow.
   - Monthly overall spending budget with real-time warning thresholds (50% normal, 75% notice, 90% warning, 100%+ danger).
   - Recharts category spending donut chart and day-by-day expenditure pacing area chart.
   - Upcoming bills and loan EMI cards.
   - Clean zero-data empty state for fresh accounts; clearly separated Sandbox Demo Mode with realistic October 2026 data.

2. **Accounting Invariants & Strict Ledger Model**
   - Persisted money stored as PostgreSQL `NUMERIC(14,2)` — zero floating point drift.
   - **Balance Invariant**: `Account Balance = Opening Balance + Posted Income - Posted Expenses - Outbound Transfers + Inbound Transfers - Direct Loan Repayments`.
   - **Transfers Rule**: Inter-account transfers adjust source and destination balances equally and are **strictly never counted** as income or expense.
   - **Loan Repayments Rule**: The principal component reduces loan debt liability, while interest and fees are recognized as financial expenses. Bank accounts are debited exactly once without double-counting.

3. **Transaction Management**
   - Full CRUD for Income, Expenses, and Inter-Account Transfers.
   - Fields: Amount, occurred date/time, account, category, payment method (UPI, Cash, Card, Net Banking, Cheque), notes, tags.
   - Instant search, date range filters (*Today, Yesterday, This Week, This Month, Custom Range*), type filters, category filters, account filters, sorting, and pagination.
   - One-click duplicate transaction and confirmation dialogs for deletions.

4. **Accounts & Statement Reconciliation**
   - Bank accounts, physical cash reserves, digital wallets (GPay, Paytm, Amazon Pay), and credit cards.
   - Statement reconciliation tool: balance your app records against your official bank statement with automatic adjustment entries.
   - Archive and restore inactive accounts without losing historical transactions.

5. **Monthly Budgets**
   - Overall monthly spending limit + individual category budgets.
   - Visual progress bars with color-coded threshold triggers (50%, 75%, 90%, 100%).
   - One-click "Copy from Prior Month" duplication.

6. **Loans & EMI Tracking**
   - Outstanding principal vs original principal tracking.
   - Explicit principal, interest, and fee allocation for each EMI payment.
   - Amortization summary and full repayment history.

7. **Scheduled Bills & Reminders**
   - Recurring rent, broadband, OTT subscriptions, electricity, and loan EMI dates.
   - Recurrence rules: None, Daily, Weekly, Monthly, Quarterly, Yearly.
   - Overdue bill alerts and one-click "Mark Paid & Record Expense".
   - Browser Web Notifications API integration with explicit user permission request.

8. **Interoperable Import & Export**
   - Standard CSV transaction import with column mapping, preview, row-level validation, and duplicate detection.
   - One-click CSV exports for Transactions, Accounts, Budgets, and EMI Repayments.
   - Full JSON database backup and restore with schema validation and rollback protection.

9. **Offline-First PWA Architecture**
   - Service worker precaching via Workbox and Vite PWA.
   - Local persistence in IndexedDB using Dexie.js.
   - Background mutation sync queue with stable UUIDs (`crypto.randomUUID()`) and idempotency keys to ensure retry safety.
   - Visible sync state indicator (*Ready*, *Queued*, *Syncing*).

10. **Authentication & Data Isolation**
    - Supabase Auth (Email & Password sign-in, sign-up, session persistence, password reset).
    - Strict Row Level Security (RLS) on all PostgreSQL tables using `auth.uid() = user_id`.
    - Zero configuration fallback: If Supabase credentials are not supplied, the app launches instantly in isolated Sandbox Demo Mode.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS variables, JetBrains Mono & Plus Jakarta Sans typography
- **Icons**: Lucide Icons (`lucide-react`)
- **Charts**: Recharts
- **Local Database**: IndexedDB via Dexie.js
- **Cloud Backend**: Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS)
- **Forms & Validation**: React Hook Form, Zod
- **Testing**: Vitest, React Testing Library, JSDOM

---

## Getting Started Locally

### 1. Prerequisites
- Node.js (v18 or higher recommended; developed on Node v24.18.0)
- npm or pnpm

### 2. Installation
```bash
cd /home/anand/myfinance
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration runs in **Local Offline / Demo Sandbox Mode**.

To connect a live Supabase backend, update `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
```

### 4. Running the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Running Automated Tests
```bash
npm run test
```
Runs the full Vitest suite testing balance calculations, transfer invariants, loan repayments, budget thresholds, CSV duplicate detection, and sync queue idempotency.

### 6. Production Build & PWA Generation
```bash
npm run build
```
Generates optimized minified assets, service worker, and web app manifest in `dist/`.

---

## Supabase Database Configuration & Migration

To configure Supabase for cloud persistence:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Open `supabase/migrations/20261019_001_initial_schema.sql` and run the script.
4. The migration will configure:
   - Tables: `profiles`, `accounts`, `categories`, `transactions`, `transfers`, `budgets`, `loans`, `loan_payments`, `reminders`, `savings_goals`, `savings_goal_contributions`.
   - Numeric constraints (`NUMERIC(14,2)`), check constraints, and foreign keys.
   - Row Level Security (RLS) policies on every table (`auth.uid() = user_id`).
   - Trigger `handle_new_user()` to automatically provision default Indian expense and income categories and accounts for new accounts.
   - Atomic functions `execute_transfer` and `execute_loan_payment`.
5. Obtain your **Project URL** and **anon public key** from *Project Settings -> API* and place them in `.env`.

---

## Project Structure

```
myfinance/
├── public/                     # Favicons, PWA icons, manifest assets
├── src/
│   ├── components/
│   │   ├── layout/             # Sidebar, Header, BottomNav, AppLayout
│   │   ├── modals/             # TransactionModal, TransferModal, AccountModal,
│   │   │                       # BudgetModal, LoanModal, LoanPaymentModal,
│   │   │                       # ReminderModal, SavingsGoalModal, CsvImportModal,
│   │   │                       # QuickAddModal
│   │   └── ui/                 # Button, Card, Badge, Input, Select, Dialog,
│   │                           # Tabs, Progress, Toast, Skeleton, EmptyState,
│   │                           # ConfirmationModal
│   ├── hooks/
│   │   ├── useAuth.tsx         # Supabase Auth session & Sandbox Demo toggle
│   │   ├── useFinanceData.ts   # Core reactive ledger hook & CRUD operations
│   │   ├── useNotifications.ts # In-app notification center & Web Notifications
│   │   └── useTheme.ts         # Dark/Light theme manager with persistence
│   ├── lib/
│   │   ├── accounting/         # Calculations, balance formulas, INR formatters
│   │   ├── db/                 # Dexie IndexedDB models and seed data
│   │   ├── export/             # CSV parser/exporter and JSON backup/restore
│   │   ├── offline/            # Sync queue manager & idempotency engine
│   │   └── supabase/           # Supabase client wrapper & connectivity test
│   ├── pages/                  # Dashboard, Transactions, Accounts, Budgets,
│   │                           # Income, Loans, Reminders, Reports, Savings,
│   │                           # ImportExport, Settings, Auth
│   ├── test/                   # Vitest unit & integration test suites
│   ├── types/                  # Authoritative TypeScript domain models
│   ├── App.tsx                 # Root router & layout container
│   ├── index.css               # Tailwind CSS theme variables & styles
│   └── main.tsx                # Entrypoint & PWA service worker registration
├── supabase/
│   └── migrations/             # Versioned SQL migrations with RLS policies
├── .env.example                # Example environment variables
├── package.json                # Dependencies and build scripts
├── tailwind.config.js          # Dark navy theme palette and styling tokens
└── vite.config.ts              # Vite bundler, PWA, and Vitest configuration
```

---

## Verification & Test Results

- **Unit & Integration Tests**: 17 passing tests in `src/test/`:
  - `accounting.test.ts`: Balance calculation, float drift avoidance, active account filtering, strict month date boundaries.
  - `transfers.test.ts`: Dual-account adjustment, liquid net worth conservation, complete exclusion from income/expense metrics.
  - `loans.test.ts`: Principal reduction vs interest expense allocation, no double counting of bank debits.
  - `budgets.test.ts`: Limit tracking, category scope filtering, threshold alerts (50%, 75%, 90%, 100%).
  - `csv.test.ts`: INR CSV parsing, duplicate detection, row-level format validation.
  - `syncQueue.test.ts`: Offline queue listener notifications, unique idempotency keys.
- **Type Check (`tsc --noEmit`)**: Clean compilation with 0 errors.
- **Production Build (`vite build`)**: Generates optimized production assets and PWA service worker in `dist/`.
