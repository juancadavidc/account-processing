-- Rollback Migration: 004_v2_schema_sources_down.sql
-- Description: Rollback V2 schema changes (sources, user_sources, v2_transactions)
-- Date: 2025-10-16

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.v2_transactions;
DROP TABLE IF EXISTS public.user_sources;
DROP TABLE IF EXISTS public.sources;