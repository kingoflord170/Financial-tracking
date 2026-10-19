-- ============================================================================
-- MyFinance Initial Schema Migration (Production Hardened)
-- Personal Finance & Monthly Budget Tracker
-- Currency: INR (₹) | Locale: en-IN | Timezone: Asia/Kolkata
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Profiles Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    preferences JSONB NOT NULL DEFAULT '{
        "theme": "dark",
        "budget_alert_thresholds": [50, 75, 90, 100],
        "default_account_id": null,
        "browser_notifications": false
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Accounts Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'cash', 'wallet', 'credit_card', 'investment', 'other')),
    opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_accounts_id_user UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_archived ON public.accounts(user_id, is_archived);

-- ----------------------------------------------------------------------------
-- 3. Categories Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT NOT NULL DEFAULT 'Folder',
    color TEXT NOT NULL DEFAULT '#3b82f6',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, name, type),
    CONSTRAINT uq_categories_id_user UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, type);

-- ----------------------------------------------------------------------------
-- 4. Transactions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    category_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi', 'cash', 'card', 'net_banking', 'cheque', 'other')),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    transfer_group_id UUID,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_transactions_account_user FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_category_user FOREIGN KEY (category_id, user_id) REFERENCES public.categories(id, user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer ON public.transactions(transfer_group_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.transactions(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. Transfers Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_account_id UUID NOT NULL,
    destination_account_id UUID NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_distinct_accounts CHECK (source_account_id <> destination_account_id),
    CONSTRAINT fk_transfers_source_user FOREIGN KEY (source_account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_dest_user FOREIGN KEY (destination_account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transfers_user_date ON public.transfers(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_source ON public.transfers(source_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_dest ON public.transfers(destination_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_idempotency ON public.transfers(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 6. Budgets Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID, -- NULL indicates overall monthly budget
    month DATE NOT NULL, -- Stored as first of the month e.g. 2026-10-01
    limit_amount NUMERIC(14,2) NOT NULL CHECK (limit_amount >= 0),
    warning_thresholds INT[] DEFAULT '{50, 75, 90, 100}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_budgets_category_user FOREIGN KEY (category_id, user_id) REFERENCES public.categories(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON public.budgets(category_id);
-- Partial unique indexes: Guarantees exactly one category budget per month AND exactly one overall budget per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category_month ON public.budgets(user_id, category_id, month) WHERE category_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_overall_month ON public.budgets(user_id, month) WHERE category_id IS NULL;

-- ----------------------------------------------------------------------------
-- 7. Loans Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lender TEXT NOT NULL,
    principal_amount NUMERIC(14,2) NOT NULL CHECK (principal_amount > 0),
    outstanding_principal NUMERIC(14,2) NOT NULL CHECK (outstanding_principal >= 0),
    annual_interest_rate NUMERIC(6,3),
    emi_amount NUMERIC(14,2) NOT NULL CHECK (emi_amount >= 0),
    due_day INT CHECK (due_day BETWEEN 1 AND 31),
    start_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'closed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_loans_id_user UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_loans_user_status ON public.loans(user_id, status);

-- ----------------------------------------------------------------------------
-- 8. Loan Payments Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL,
    account_id UUID NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
    principal_component NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (principal_component >= 0),
    interest_component NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (interest_component >= 0),
    fee_component NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (fee_component >= 0),
    linked_expense_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    idempotency_key TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_loan_payment_components CHECK (total_amount = (principal_component + interest_component + fee_component)),
    CONSTRAINT fk_loan_payments_loan_user FOREIGN KEY (loan_id, user_id) REFERENCES public.loans(id, user_id) ON DELETE CASCADE,
    CONSTRAINT fk_loan_payments_account_user FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_account ON public.loan_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_user_paid ON public.loan_payments(user_id, paid_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_payments_idempotency ON public.loan_payments(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 9. Reminders Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(14,2),
    due_at TIMESTAMPTZ NOT NULL,
    recurrence_rule TEXT DEFAULT 'none' CHECK (recurrence_rule IN ('none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    related_loan_id UUID,
    related_account_id UUID,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_reminders_loan_user FOREIGN KEY (related_loan_id, user_id) REFERENCES public.loans(id, user_id) ON DELETE SET NULL,
    CONSTRAINT fk_reminders_account_user FOREIGN KEY (related_account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_due ON public.reminders(user_id, due_at ASC);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reminders_loan ON public.reminders(related_loan_id);
CREATE INDEX IF NOT EXISTS idx_reminders_account ON public.reminders(related_account_id);

-- ----------------------------------------------------------------------------
-- 10. Savings Goals Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
    saved_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (saved_amount >= 0),
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'achieved', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_savings_goals_id_user UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id, status);

-- ----------------------------------------------------------------------------
-- 11. Savings Goal Contributions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL,
    account_id UUID,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    contributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_contributions_goal_user FOREIGN KEY (goal_id, user_id) REFERENCES public.savings_goals(id, user_id) ON DELETE CASCADE,
    CONSTRAINT fk_contributions_account_user FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_savings_contributions_user ON public.savings_goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON public.savings_goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_account ON public.savings_goal_contributions(account_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict tenant isolation based on auth.uid() = user_id
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goal_contributions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Standard User-Owned Financial Tables RLS
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'accounts', 'categories', 'transactions', 'transfers', 
        'budgets', 'loans', 'loan_payments', 'reminders', 
        'savings_goals', 'savings_goal_contributions'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can view own %I" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %I" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update own %I" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %I" ON public.%I;', tbl, tbl);

        EXECUTE format('CREATE POLICY "Users can view own %I" ON public.%I FOR SELECT USING (auth.uid() = user_id);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can insert own %I" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can update own %I" ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can delete own %I" ON public.%I FOR DELETE USING (auth.uid() = user_id);', tbl, tbl);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- User Provisioning & Default Category Seeding Function
-- SECURITY DEFINER with fixed search_path = public, pg_catalog
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- 1. Insert Profile
    INSERT INTO public.profiles (id, display_name, currency, timezone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'INR',
        'Asia/Kolkata'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Seed Default Expense Categories
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Groceries & Supplies', 'expense', 'ShoppingCart', '#10b981', true),
        (NEW.id, 'Food & Dining', 'expense', 'Utensils', '#f59e0b', true),
        (NEW.id, 'Housing & Rent', 'expense', 'Home', '#6366f1', true),
        (NEW.id, 'Utilities & Bills', 'expense', 'Zap', '#06b6d4', true),
        (NEW.id, 'Transit & Fuel', 'expense', 'Car', '#8b5cf6', true),
        (NEW.id, 'Shopping & Personal', 'expense', 'ShoppingBag', '#ec4899', true),
        (NEW.id, 'Healthcare & Medical', 'expense', 'HeartPulse', '#ef4444', true),
        (NEW.id, 'Entertainment & Leisure', 'expense', 'Film', '#3b82f6', true),
        (NEW.id, 'EMI & Debt Repayment', 'expense', 'CreditCard', '#f97316', true),
        (NEW.id, 'Education & Books', 'expense', 'BookOpen', '#14b8a6', true),
        (NEW.id, 'Miscellaneous Expense', 'expense', 'MoreHorizontal', '#64748b', true)
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- 3. Seed Default Income Categories
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Salary', 'income', 'Briefcase', '#10b981', true),
        (NEW.id, 'Freelance & Projects', 'income', 'Laptop', '#3b82f6', true),
        (NEW.id, 'Investments & Dividends', 'income', 'TrendingUp', '#8b5cf6', true),
        (NEW.id, 'Refunds & Cashbacks', 'income', 'RotateCcw', '#06b6d4', true),
        (NEW.id, 'Family Contribution', 'income', 'Users', '#f59e0b', true),
        (NEW.id, 'Other Income', 'income', 'PlusCircle', '#64748b', true)
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- 4. Seed Default Accounts
    INSERT INTO public.accounts (user_id, name, account_type, opening_balance) VALUES
        (NEW.id, 'Primary Bank (SBI/HDFC)', 'bank', 0.00),
        (NEW.id, 'Cash in Hand', 'cash', 0.00),
        (NEW.id, 'UPI / Wallet', 'wallet', 0.00)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

-- Trigger to execute on user sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Atomic Database Operations
-- ----------------------------------------------------------------------------

-- 1. Atomic Transfer Handler: Validates accounts, enforces user ownership,
-- prevents unauthenticated calls, checks archived accounts, and rejects
-- idempotency key reuse with different parameters.
CREATE OR REPLACE FUNCTION public.execute_transfer(
    p_source_id UUID,
    p_dest_id UUID,
    p_amount NUMERIC(14,2),
    p_occurred_at TIMESTAMPTZ DEFAULT now(),
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
    v_existing_transfer RECORD;
    v_transfer_id UUID;
BEGIN
    -- Authenticate caller: strictly derived from auth.uid()
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: session auth.uid() is null';
    END IF;

    -- Reject any attempt to spoof another user ID
    IF p_user_id IS NOT NULL AND p_user_id <> v_user_id THEN
        RAISE EXCEPTION 'Access denied: user mismatch';
    END IF;

    IF p_source_id = p_dest_id THEN
        RAISE EXCEPTION 'Source and destination accounts must be distinct';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be strictly positive';
    END IF;

    -- Idempotency check: if key already exists, verify that details match
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_transfer
        FROM public.transfers
        WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            -- Verify all transfer parameters match the original record
            IF v_existing_transfer.source_account_id <> p_source_id OR
               v_existing_transfer.destination_account_id <> p_dest_id OR
               v_existing_transfer.amount <> p_amount THEN
                RAISE EXCEPTION 'Idempotency conflict: key "%" was already processed with different transfer details', p_idempotency_key;
            END IF;

            RETURN jsonb_build_object(
                'success', true,
                'transfer_id', v_existing_transfer.id,
                'idempotent_duplicate', true
            );
        END IF;
    END IF;

    -- Verify source account ownership and active status
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_source_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Source account not found or access denied';
    END IF;

    IF EXISTS (SELECT 1 FROM public.accounts WHERE id = p_source_id AND user_id = v_user_id AND is_archived = true) THEN
        RAISE EXCEPTION 'Source account is archived and cannot be used for transfers';
    END IF;

    -- Verify destination account ownership and active status
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_dest_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Destination account not found or access denied';
    END IF;

    IF EXISTS (SELECT 1 FROM public.accounts WHERE id = p_dest_id AND user_id = v_user_id AND is_archived = true) THEN
        RAISE EXCEPTION 'Destination account is archived and cannot be used for transfers';
    END IF;

    -- Insert transfer atomically
    INSERT INTO public.transfers (
        user_id, source_account_id, destination_account_id,
        amount, occurred_at, notes, idempotency_key
    )
    VALUES (
        v_user_id, p_source_id, p_dest_id,
        p_amount, COALESCE(p_occurred_at, now()), p_notes, p_idempotency_key
    )
    RETURNING id INTO v_transfer_id;

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id
    );
END;
$$;

-- Overload for backwards compatibility with (p_user_id, p_source_id, p_dest_id, ...) signature
CREATE OR REPLACE FUNCTION public.execute_transfer(
    p_user_id UUID,
    p_source_id UUID,
    p_dest_id UUID,
    p_amount NUMERIC(14,2),
    p_occurred_at TIMESTAMPTZ,
    p_notes TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN public.execute_transfer(
        p_source_id := p_source_id,
        p_dest_id := p_dest_id,
        p_amount := p_amount,
        p_occurred_at := p_occurred_at,
        p_notes := p_notes,
        p_idempotency_key := p_idempotency_key,
        p_user_id := p_user_id
    );
END;
$$;

-- 2. Atomic Loan Payment Handler: Validates ownership, locks the loan row,
-- verifies repayment component sums, updates outstanding principal, prevents
-- unauthenticated calls, checks archived accounts, and rejects idempotency key reuse.
CREATE OR REPLACE FUNCTION public.execute_loan_payment(
    p_loan_id UUID,
    p_account_id UUID,
    p_total_amount NUMERIC(14,2),
    p_principal_component NUMERIC(14,2),
    p_interest_component NUMERIC(14,2),
    p_fee_component NUMERIC(14,2) DEFAULT 0.00,
    p_paid_at TIMESTAMPTZ DEFAULT now(),
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
    v_loan RECORD;
    v_existing_payment RECORD;
    v_payment_id UUID;
    v_new_outstanding NUMERIC(14,2);
    v_is_paid_off BOOLEAN;
BEGIN
    -- Authenticate caller: strictly derived from auth.uid()
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: session auth.uid() is null';
    END IF;

    -- Reject any attempt to spoof another user ID
    IF p_user_id IS NOT NULL AND p_user_id <> v_user_id THEN
        RAISE EXCEPTION 'Access denied: user mismatch';
    END IF;

    -- Validate payment components
    IF p_total_amount <= 0 THEN
        RAISE EXCEPTION 'Total payment amount must be strictly positive';
    END IF;

    IF p_principal_component < 0 OR p_interest_component < 0 OR p_fee_component < 0 THEN
        RAISE EXCEPTION 'Payment components cannot be negative';
    END IF;

    IF p_total_amount <> (p_principal_component + p_interest_component + p_fee_component) THEN
        RAISE EXCEPTION 'Payment components (%) do not match total amount (%)', 
            (p_principal_component + p_interest_component + p_fee_component), p_total_amount;
    END IF;

    -- Idempotency check: if key already exists, verify that details match
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_payment
        FROM public.loan_payments 
        WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            -- Verify that all payment parameters match the original record
            IF v_existing_payment.loan_id <> p_loan_id OR
               v_existing_payment.account_id <> p_account_id OR
               v_existing_payment.total_amount <> p_total_amount OR
               v_existing_payment.principal_component <> p_principal_component OR
               v_existing_payment.interest_component <> p_interest_component OR
               v_existing_payment.fee_component <> p_fee_component THEN
                RAISE EXCEPTION 'Idempotency conflict: key "%" was already processed with different payment details', p_idempotency_key;
            END IF;

            SELECT outstanding_principal INTO v_new_outstanding 
            FROM public.loans WHERE id = p_loan_id AND user_id = v_user_id;

            RETURN jsonb_build_object(
                'success', true,
                'payment_id', v_existing_payment.id,
                'outstanding_principal', v_new_outstanding,
                'idempotent_duplicate', true
            );
        END IF;
    END IF;

    -- Lock the loan record to ensure atomic isolation against concurrent payments
    SELECT * INTO v_loan 
    FROM public.loans 
    WHERE id = p_loan_id AND user_id = v_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loan not found or access denied';
    END IF;

    -- Verify paying account belongs to user and is not archived
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_account_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Payment account not found or access denied';
    END IF;

    IF EXISTS (SELECT 1 FROM public.accounts WHERE id = p_account_id AND user_id = v_user_id AND is_archived = true) THEN
        RAISE EXCEPTION 'Payment account is archived and cannot be used for loan repayment';
    END IF;

    -- Compute new outstanding principal (never negative)
    v_new_outstanding := GREATEST(0.00, v_loan.outstanding_principal - p_principal_component);
    v_is_paid_off := (v_new_outstanding = 0.00);

    -- Insert payment record
    INSERT INTO public.loan_payments (
        user_id, loan_id, account_id, paid_at,
        total_amount, principal_component, interest_component, fee_component,
        notes, idempotency_key
    )
    VALUES (
        v_user_id, p_loan_id, p_account_id, COALESCE(p_paid_at, now()),
        p_total_amount, p_principal_component, p_interest_component, p_fee_component,
        p_notes, p_idempotency_key
    )
    RETURNING id INTO v_payment_id;

    -- Update loan balance and status atomically
    UPDATE public.loans
    SET outstanding_principal = v_new_outstanding,
        status = CASE WHEN v_is_paid_off THEN 'paid_off' ELSE status END,
        updated_at = now()
    WHERE id = p_loan_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'outstanding_principal', v_new_outstanding,
        'is_paid_off', v_is_paid_off
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC Execution Privileges
-- Restricts execution to authenticated users only; prevents anon execution.
-- ----------------------------------------------------------------------------

-- handle_new_user: trigger execution only, revoke from client roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- execute_transfer: only authenticated users
REVOKE EXECUTE ON FUNCTION public.execute_transfer(UUID, UUID, NUMERIC, TIMESTAMPTZ, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_transfer(UUID, UUID, NUMERIC, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.execute_transfer(UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_transfer(UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

-- execute_loan_payment: only authenticated users
REVOKE EXECUTE ON FUNCTION public.execute_loan_payment(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_loan_payment(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;
