-- Migration: 002_fix_rls_policies.sql
-- Description: Fix RLS policies to allow anonymous read access for dashboard
-- Date: 2025-09-06

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.parse_errors;

-- Create new RLS policies that allow anonymous read access
-- This allows the dashboard to work without authentication
CREATE POLICY "Enable read access for anonymous and authenticated users" ON public.transactions
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for anonymous and authenticated users" ON public.parse_errors
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Grant read permissions to anon role
GRANT SELECT ON public.transactions TO anon;
GRANT SELECT ON public.parse_errors TO anon;