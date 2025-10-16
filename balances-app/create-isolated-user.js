#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createIsolatedUser() {
  try {
    console.log('🔧 Creating isolated test user (no source associations)...\n');
    
    // Create user with admin API
    console.log('1. Creating isolated user...');
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'isolated@testbank.com',
      password: 'password123456',
      email_confirm: true, // Skip email confirmation
    });
    
    if (userError) {
      console.log('❌ Failed to create user:', userError.message);
      return;
    }
    
    console.log('✅ Isolated user created:', userData.user.id, userData.user.email);
    
    // Deliberately NOT creating any source associations for this user
    console.log('\n2. Skipping source associations (intentionally isolated)...');
    console.log('   This user will have NO access to any transaction sources');
    
    // Test the user can sign in but sees no transactions
    console.log('\n3. Testing transaction access with isolated user...');
    
    // Sign in as the new user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'isolated@testbank.com',
      password: 'password123456'
    });
    
    if (authError) {
      console.log('❌ Failed to sign in:', authError.message);
      return;
    }
    
    console.log('✅ Signed in successfully');
    
    // Query transactions (should return empty due to RLS)
    const { data: transactions, error: transError } = await supabase
      .from('v2_transactions')
      .select('*')
      .limit(10);
      
    if (transError) {
      console.log('❌ Failed to query transactions:', transError.message);
    } else {
      console.log(`✅ Successfully queried transactions: ${transactions.length} found`);
      if (transactions.length === 0) {
        console.log('   🎯 Perfect! RLS is working - user sees no transactions without source associations');
      } else {
        console.log('   ⚠️  Unexpected: user should not see any transactions');
      }
    }
    
    // Check user sources (should be empty)
    console.log('\n4. Verifying user has no source associations...');
    const { data: userSources, error: sourcesError } = await supabase
      .from('user_sources')
      .select('*')
      .eq('user_id', userData.user.id);
      
    if (sourcesError) {
      console.log('❌ Failed to check user sources:', sourcesError.message);
    } else {
      console.log(`✅ User has ${userSources.length} source associations (should be 0)`);
      if (userSources.length === 0) {
        console.log('   🎯 Perfect! User is properly isolated');
      }
    }
    
    console.log('\n✅ Isolated test user setup complete!');
    console.log('📧 Email: isolated@testbank.com');
    console.log('🔑 Password: password123456');
    console.log('🎯 User ID:', userData.user.id);
    console.log('🚫 Source Access: NONE (by design)');
    console.log('📊 Expected Transactions: 0 (due to RLS)');
    
    console.log('\n📋 Test Summary:');
    console.log('   User 1 (test@testbank.com): Has source associations → Sees transactions');
    console.log('   User 2 (isolated@testbank.com): No source associations → Sees NO transactions');
    
  } catch (error) {
    console.error('💥 Failed to create isolated user:', error.message);
  }
}

createIsolatedUser().catch(console.error);