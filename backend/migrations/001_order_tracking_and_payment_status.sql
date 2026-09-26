-- 001: tracking number + separate payment status on orders.
-- Idempotent: safe to run on every backend start (see src/utils/migrate.ts).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text NOT NULL DEFAULT 'pending'
      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

    -- Backfill from what was already stored (payment used to be inferred from order status)
    UPDATE orders SET payment_status = CASE
      WHEN refunded_at IS NOT NULL THEN 'refunded'
      WHEN razorpay_payment_id IS NOT NULL OR paid_at IS NOT NULL THEN 'paid'
      WHEN status IN ('paid', 'delivered', 'completed') THEN 'paid'
      ELSE 'pending'
    END;
  END IF;
END $$;
