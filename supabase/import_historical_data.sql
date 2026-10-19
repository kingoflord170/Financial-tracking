-- ============================================================================
-- MyFinance — Historical Data Upload & Account Balance Alignment
-- User: 165dd885-abf9-42a1-b547-3b689afa06a6
-- Period: 7 October 2026 – 16 October 2026
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID := '165dd885-abf9-42a1-b547-3b689afa06a6';
    v_bank_id UUID := '80e47da2-75d1-433d-8f1f-91a9c16a3628';
    v_cash_id UUID := 'd80884a0-e08f-4466-ae88-45e2872bb5e2';

    -- Categories
    v_cat_family UUID := '359c5b22-b81c-46ff-b616-319f36d17888';
    v_cat_refunds UUID := '8f85097c-ad41-4799-8cb4-2e1b88b66d2f';
    v_cat_shopping UUID := '53ed15fa-1a60-4c8a-a249-6cdc12923d29';
    v_cat_transit UUID := '75cb9ec1-724c-403d-882c-957581740ed5';
    v_cat_bills UUID := '1064dae9-1f86-44b3-a193-dbb1f1ff97c7';
    v_cat_food UUID := 'fad181a2-3670-4d5b-b5e0-8e7201c0242a';
    v_cat_misc UUID := 'b32aa3e6-8a5c-4bd5-905d-5e75cd50d814';
BEGIN
    -- 1. Set Opening Balances for Verified Accounts (7 October 2026)
    UPDATE public.accounts
    SET opening_balance = 1005.00,
        updated_at = now()
    WHERE id = v_bank_id AND user_id = v_user_id;

    UPDATE public.accounts
    SET opening_balance = 179.00,
        updated_at = now()
    WHERE id = v_cash_id AND user_id = v_user_id;

    -- 2. Insert Reconstructed Transactions with strict Idempotency Keys
    INSERT INTO public.transactions (
        user_id, account_id, type, amount, category_id,
        occurred_at, payment_method, notes, idempotency_key
    )
    VALUES
        -- 1. Akka Contribution: ₹100
        (v_user_id, v_bank_id, 'income', 100.00, v_cat_family,
         '2026-10-08 10:00:00+05:30', 'upi', 'Received from Akka', 'hist-202610-akka-100'),

        -- 2. Appa - For shoes: ₹1,000
        (v_user_id, v_bank_id, 'income', 1000.00, v_cat_family,
         '2026-10-09 10:30:00+05:30', 'upi', 'Received from Appa for shoes', 'hist-202610-appa-shoes-1000'),

        -- 3. Shoe Purchase: ₹850
        (v_user_id, v_bank_id, 'expense', 850.00, v_cat_shopping,
         '2026-10-09 16:45:00+05:30', 'upi', 'Shoe purchase', 'hist-202610-shoe-purchase-850'),

        -- 4. Bus Fare (10 Oct): ₹15 (Cash)
        (v_user_id, v_cash_id, 'expense', 15.00, v_cat_transit,
         '2026-10-10 09:15:00+05:30', 'cash', 'Bus fare', 'hist-202610-bus-10-15'),

        -- 5. Navi App Reward: ₹5
        (v_user_id, v_bank_id, 'income', 5.00, v_cat_refunds,
         '2026-10-11 08:30:00+05:30', 'upi', 'Navi app reward', 'hist-202610-navi-reward-5'),

        -- 6. Appa - Expense Management: ₹1,000
        (v_user_id, v_bank_id, 'income', 1000.00, v_cat_family,
         '2026-10-11 11:20:00+05:30', 'upi', 'Received from Appa for managing expenses', 'hist-202610-appa-expenses-1000'),

        -- 7. Petrol Advance to Colleague: ₹50
        (v_user_id, v_bank_id, 'expense', 50.00, v_cat_misc,
         '2026-10-12 10:00:00+05:30', 'upi', 'Petrol advance to office mate', 'hist-202610-petrol-advance-50'),

        -- 8. Petrol Advance Repayment: ₹50 (Expense Refund)
        (v_user_id, v_bank_id, 'income', 50.00, v_cat_refunds,
         '2026-10-13 14:15:00+05:30', 'upi', 'Petrol advance repayment from office mate (Expense refund)', 'hist-202610-petrol-refund-50'),

        -- 9. Mobile Recharge for Non-Personal Number: ₹320
        (v_user_id, v_bank_id, 'expense', 320.00, v_cat_bills,
         '2026-10-13 18:00:00+05:30', 'upi', 'Mobile recharge for non-personal number', 'hist-202610-recharge-other-320'),

        -- 10. Personal Mobile Recharge: ₹349
        (v_user_id, v_bank_id, 'expense', 349.00, v_cat_bills,
         '2026-10-14 12:45:00+05:30', 'upi', 'Mobile recharge', 'hist-202610-recharge-personal-349'),

        -- 11. Morning Bus Fare (15 Oct): ₹14 (Cash)
        (v_user_id, v_cash_id, 'expense', 14.00, v_cat_transit,
         '2026-10-15 08:30:00+05:30', 'cash', 'Morning bus fare', 'hist-202610-bus-morning-15-14'),

        -- 12. Evening Bus Fare (15 Oct): ₹14 (Cash)
        (v_user_id, v_cash_id, 'expense', 14.00, v_cat_transit,
         '2026-10-15 18:45:00+05:30', 'cash', 'Evening bus fare', 'hist-202610-bus-evening-15-14'),

        -- 13. Food / Snacks (15 Oct): ₹35 (Cash)
        (v_user_id, v_cash_id, 'expense', 35.00, v_cat_food,
         '2026-10-15 19:30:00+05:30', 'cash', 'Food / snacks', 'hist-202610-food-15-35'),

        -- 14. Consolidated Daily Transit, Rapido & Food Expenses (Oct 7–15): ₹1,223.80
        (v_user_id, v_bank_id, 'expense', 1223.80, v_cat_transit,
         '2026-10-15 22:00:00+05:30', 'upi', 'Daily Transit, Rapido rides & Food Expenses (Oct 7–15)', 'hist-202610-unitemized-transit-food-1223.80')

    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
    DO NOTHING;

END $$;
