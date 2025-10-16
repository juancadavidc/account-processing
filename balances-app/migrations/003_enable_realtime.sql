-- Migration: 003_enable_realtime.sql
-- Description: Enable real-time replication for transactions table
-- Date: 2025-09-06

-- Enable real-time for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Enable real-time for parse_errors table (optional, for monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE public.parse_errors;

-- Verify the publication includes our tables
-- This is just a comment for reference:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';