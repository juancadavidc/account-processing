# Database Migrations

This directory contains database migration files for the Bancolombia Balances application.

## Migration Files

- `001_initial_schema.sql` - Creates initial database schema with transactions and parse_errors tables
- `down/001_drop_initial_schema.sql` - Rollback script for initial schema

## Execution Instructions

### Manual Execution via Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the migration SQL from the appropriate file
4. Execute the script

### Migration Order

Execute migrations in numerical order:
1. `001_initial_schema.sql`

### Rollback Process

To rollback a migration, execute the corresponding file from the `down/` directory in reverse order.

## Schema Overview

The initial schema includes:

### Tables
- **transactions** - Stores processed transaction data with proper indexing
- **parse_errors** - Tracks SMS parsing failures for debugging

### Security
- Row Level Security (RLS) enabled on all tables
- Authenticated users can read data
- Service role can insert/update data for webhook operations

### Performance
- Optimized indexes for date-based queries
- Webhook ID lookup optimization
- Status filtering support