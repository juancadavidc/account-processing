-- Migration: 004_v2_schema_sources.sql
-- Description: Add sources and user_sources tables for V2 multi-user support
-- Date: 2025-10-16

-- Create sources table for managing transaction sources (emails, phones, webhooks)
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('email', 'phone', 'webhook')),
    source_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique source values per type
    UNIQUE(source_type, source_value)
);

-- Create user_sources table for many-to-many relationship between users and sources
CREATE TABLE IF NOT EXISTS public.user_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure a user can't have duplicate sources
    UNIQUE(user_id, source_id)
);

-- Create v2_transactions table (new structure for V2 API)
CREATE TABLE IF NOT EXISTS public.v2_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE RESTRICT,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'COP' NOT NULL,
    sender_name VARCHAR(255),
    account_number VARCHAR(10),
    transaction_date DATE NOT NULL,
    transaction_time TIME NOT NULL,
    raw_message TEXT NOT NULL,
    parsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    webhook_id VARCHAR(255) UNIQUE NOT NULL,
    event VARCHAR(20) DEFAULT 'deposit' NOT NULL CHECK (event IN ('deposit', 'withdrawal', 'transfer')),
    status VARCHAR(20) DEFAULT 'processed' NOT NULL CHECK (status IN ('processed', 'failed', 'duplicate', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create performance indexes for sources table
CREATE INDEX IF NOT EXISTS idx_sources_type ON public.sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_value ON public.sources(source_value);
CREATE INDEX IF NOT EXISTS idx_sources_created_at ON public.sources(created_at DESC);

-- Create performance indexes for user_sources table
CREATE INDEX IF NOT EXISTS idx_user_sources_user_id ON public.user_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_source_id ON public.user_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_active ON public.user_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sources_user_active ON public.user_sources(user_id, is_active);

-- Create performance indexes for v2_transactions table
CREATE INDEX IF NOT EXISTS idx_v2_transactions_source_id ON public.v2_transactions(source_id);
CREATE INDEX IF NOT EXISTS idx_v2_transactions_date ON public.v2_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_v2_transactions_webhook ON public.v2_transactions(webhook_id);
CREATE INDEX IF NOT EXISTS idx_v2_transactions_status ON public.v2_transactions(status);
CREATE INDEX IF NOT EXISTS idx_v2_transactions_event ON public.v2_transactions(event);
CREATE INDEX IF NOT EXISTS idx_v2_transactions_created_at ON public.v2_transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sources table
CREATE POLICY "Users can view sources they have configured" ON public.sources
    FOR SELECT USING (
        id IN (
            SELECT source_id FROM public.user_sources 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Service role can manage all sources" ON public.sources
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_sources table
CREATE POLICY "Users can view their own source configurations" ON public.user_sources
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own source configurations" ON public.user_sources
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all user sources" ON public.user_sources
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for v2_transactions table
CREATE POLICY "Users can view transactions from their configured sources" ON public.v2_transactions
    FOR SELECT USING (
        source_id IN (
            SELECT source_id FROM public.user_sources 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Service role can manage all v2 transactions" ON public.v2_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Sources table permissions
GRANT SELECT ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;

-- User sources table permissions
GRANT ALL ON public.user_sources TO authenticated;
GRANT ALL ON public.user_sources TO service_role;

-- V2 transactions table permissions
GRANT SELECT ON public.v2_transactions TO authenticated;
GRANT ALL ON public.v2_transactions TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.sources IS 'Transaction sources (emails, phones, webhooks) that can be shared between users';
COMMENT ON TABLE public.user_sources IS 'Many-to-many relationship between users and their configured transaction sources';
COMMENT ON TABLE public.v2_transactions IS 'V2 transactions table with source-based routing for multi-user support';

COMMENT ON COLUMN public.sources.source_type IS 'Type of source: email, phone, or webhook';
COMMENT ON COLUMN public.sources.source_value IS 'The actual source value (email address, phone number, webhook URL)';
COMMENT ON COLUMN public.user_sources.is_active IS 'Whether this source is active for the user';
COMMENT ON COLUMN public.v2_transactions.source_id IS 'Reference to the source that generated this transaction';
COMMENT ON COLUMN public.v2_transactions.event IS 'Type of transaction: deposit, withdrawal, or transfer';