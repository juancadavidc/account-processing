-- Migration Rollback: 001_drop_initial_schema.sql
-- Description: Drop initial database schema (transactions and parse_errors tables)
-- Date: 2025-09-05

-- Drop RLS policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.parse_errors;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.parse_errors;

-- Drop indexes
DROP INDEX IF EXISTS idx_transactions_date;
DROP INDEX IF EXISTS idx_transactions_webhook;
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_transactions_created_at;
DROP INDEX IF EXISTS idx_parse_errors_webhook;
DROP INDEX IF EXISTS idx_parse_errors_occurred_at;
DROP INDEX IF EXISTS idx_parse_errors_resolved;

-- Drop tables
DROP TABLE IF EXISTS public.parse_errors;
DROP TABLE IF EXISTS public.transactions;