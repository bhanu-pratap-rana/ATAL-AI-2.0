-- Migration 183: validate irt_item_bank.options JSONB shape
--
-- `options` stores the multiple-choice answer set. The app expects it
-- to be a JSON array of strings, but no DB-side check ensures that.
-- Pre-flight: zero rows have non-array shape.
--
-- The check uses jsonb_typeof to validate the top level + array length
-- bounds (2-6 options is the supported range per IRT calibration).
--
-- Rollback:
--   ALTER TABLE public.irt_item_bank DROP CONSTRAINT IF EXISTS irt_item_bank_options_shape;

ALTER TABLE public.irt_item_bank
  ADD CONSTRAINT irt_item_bank_options_shape
  CHECK (
    jsonb_typeof(options) = 'array'
    AND jsonb_array_length(options) BETWEEN 2 AND 6
  );
