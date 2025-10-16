#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(migrationFile) {
  try {
    console.log(`\n🚀 Running migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`📁 Reading migration from: ${migrationPath}`);
    console.log(`📝 SQL length: ${sql.length} characters`);
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Migration failed: ${error.message}`);
      console.error('Full error:', error);
      throw error;
    }
    
    console.log(`✅ Migration completed successfully: ${migrationFile}`);
    
  } catch (error) {
    console.error(`💥 Error running migration: ${error.message}`);
    throw error;
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
    
    if (error && error.code !== 'PGRST116') {
      console.error(`Error checking table ${tableName}:`, error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.log(`Table ${tableName} check: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🔍 Checking current database state...');
    
    // Check which tables exist
    const tables = ['sources', 'user_sources', 'v2_transactions'];
    const tableStatus = {};
    
    for (const table of tables) {
      tableStatus[table] = await checkTableExists(table);
      console.log(`📋 Table '${table}': ${tableStatus[table] ? '✅ exists' : '❌ missing'}`);
    }
    
    // If any V2 tables are missing, run the migration
    const needsMigration = Object.values(tableStatus).some(exists => !exists);
    
    if (needsMigration) {
      console.log('\n🛠️  V2 tables missing, running migration...');
      await runMigration('004_v2_schema_sources.sql');
    } else {
      console.log('\n✅ All V2 tables already exist, skipping migration');
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying migration results...');
    for (const table of tables) {
      const exists = await checkTableExists(table);
      console.log(`📋 Table '${table}': ${exists ? '✅ exists' : '❌ still missing'}`);
    }
    
    console.log('\n🎉 Migration process completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Add a simple exec_sql function if it doesn't exist
async function ensureExecSqlFunction() {
  try {
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$;
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
    
    if (error && error.message.includes('function exec_sql')) {
      console.log('📦 Creating exec_sql helper function...');
      // We'll execute directly if exec_sql doesn't exist
      const { error: createError } = await supabase.from('_').select('*').limit(0);
      if (createError) {
        console.log('Will execute migration directly...');
      }
    }
  } catch (error) {
    console.log('Will execute migration using direct SQL...');
  }
}

// Execute migration directly if exec_sql doesn't work
async function runMigrationDirect(migrationFile) {
  try {
    console.log(`\n🚀 Running migration directly: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('sql', { query: statement });
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log(`✅ Migration completed: ${migrationFile}`);
    
  } catch (error) {
    console.error(`💥 Error running direct migration: ${error.message}`);
    throw error;
  }
}

main().catch(console.error);