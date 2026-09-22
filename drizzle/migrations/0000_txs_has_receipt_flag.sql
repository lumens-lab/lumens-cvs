-- Receipt images are large (base64 photos) and must not be pulled with the
-- history list. Expose a cheap flag instead so the app knows a receipt exists
-- and can fetch the image only when a record is opened.
ALTER TABLE public.txs
  ADD COLUMN IF NOT EXISTS has_receipt boolean
  GENERATED ALWAYS AS (receipt IS NOT NULL) STORED;

-- Supports the app's history query (user + newest first).
CREATE INDEX IF NOT EXISTS txs_user_date_created_idx
  ON public.txs (user_id, date DESC, created_at DESC);