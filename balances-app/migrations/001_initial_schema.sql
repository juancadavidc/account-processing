-- Migration: 001_initial_schema.sql
-- Description: Create initial database schema with transactions and parse_errors tables
-- Date: 2025-09-05

-- Enable UUID extension for auto-generated primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'COP' NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(10) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_time TIME NOT NULL,
    raw_message TEXT NOT NULL,
    parsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    webhook_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'processed' NOT NULL CHECK (status IN ('processed', 'failed', 'duplicate')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create parse_errors table
CREATE TABLE IF NOT EXISTS public.parse_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_message TEXT NOT NULL,
    error_reason TEXT NOT NULL,
    webhook_id VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    resolved BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create performance indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_webhook ON public.transactions(webhook_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- Create indexes for parse_errors table
CREATE INDEX IF NOT EXISTS idx_parse_errors_webhook ON public.parse_errors(webhook_id);
CREATE INDEX IF NOT EXISTS idx_parse_errors_occurred_at ON public.parse_errors(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_parse_errors_resolved ON public.parse_errors(resolved);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parse_errors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated access
CREATE POLICY "Enable read access for authenticated users" ON public.transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON public.transactions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable read access for authenticated users" ON public.parse_errors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON public.parse_errors
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
GRANT SELECT ON public.parse_errors TO authenticated;
GRANT ALL ON public.parse_errors TO service_role;