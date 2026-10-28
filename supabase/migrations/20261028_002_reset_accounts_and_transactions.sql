-- Migration: Reset accounts to Canara Bank, Cash In Hand, Card, and delete all transactions
-- Date: 2026-10-28

-- 1. Delete all transactions, transfers, and loan payments
DELETE FROM public.transactions;
DELETE FROM public.transfers;
DELETE FROM public.loan_payments;

-- 2. Update default accounts seeded for new users
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

    -- 4. Seed Default Target Accounts: 1. Canara Bank, 2. Cash In Hand, 3. Card
    INSERT INTO public.accounts (user_id, name, account_type, opening_balance) VALUES
        (NEW.id, 'Canara Bank', 'bank', 0.00),
        (NEW.id, 'Cash In Hand', 'cash', 0.00),
        (NEW.id, 'Card', 'credit_card', 0.00)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

-- 3. Reset existing accounts for all registered users:
DELETE FROM public.accounts 
WHERE name NOT IN ('Canara Bank', 'Cash In Hand', 'Card');

-- Insert missing target accounts for existing profiles
INSERT INTO public.accounts (user_id, name, account_type, opening_balance)
SELECT p.id, 'Canara Bank', 'bank', 0.00 
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE a.user_id = p.id AND a.name = 'Canara Bank'
);

INSERT INTO public.accounts (user_id, name, account_type, opening_balance)
SELECT p.id, 'Cash In Hand', 'cash', 0.00 
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE a.user_id = p.id AND a.name = 'Cash In Hand'
);

INSERT INTO public.accounts (user_id, name, account_type, opening_balance)
SELECT p.id, 'Card', 'credit_card', 0.00 
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE a.user_id = p.id AND a.name = 'Card'
);

-- Set opening balance to 0.00
UPDATE public.accounts SET opening_balance = 0.00;
