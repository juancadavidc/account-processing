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

async function createTestUser() {
  try {
    console.log('🔧 Creating test user with source associations...\n');
    
    // Create user with admin API
    console.log('1. Creating user...');
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'test@testbank.com',
      password: 'password123456',
      email_confirm: true, // Skip email confirmation
    });
    
    if (userError) {
      console.log('❌ Failed to create user:', userError.message);
      return;
    }
    
    console.log('✅ User created:', userData.user.id, userData.user.email);
    
    // Get existing sources
    console.log('\n2. Getting existing sources...');
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*');
      
    if (sourcesError) {
      console.log('❌ Failed to get sources:', sourcesError.message);
      return;
    }
    
    console.log(`✅ Found ${sources.length} sources`);
    sources.forEach(source => {
      console.log(`   - ${source.source_type}: ${source.source_value}`);
    });
    
    // Associate user with all sources
    console.log('\n3. Creating user-source associations...');
    
    for (const source of sources) {
      const { data: assocData, error: assocError } = await supabase
        .from('user_sources')
        .insert({
          user_id: userData.user.id,
          source_id: source.id,
          is_active: true
        })
        .select();
        
      if (assocError) {
        console.log(`❌ Failed to associate with ${source.source_type}:`, assocError.message);
      } else {
        console.log(`✅ Associated with ${source.source_type}: ${source.source_value}`);
      }
    }
    
    // Test the user can now access transactions
    console.log('\n4. Testing transaction access with new user...');
    
    // Sign in as the new user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@testbank.com',
      password: 'password123456'
    });
    
    if (authError) {
      console.log('❌ Failed to sign in:', authError.message);
      return;
    }
    
    console.log('✅ Signed in successfully');
    
    // Query transactions
    const { data: transactions, error: transError } = await supabase
      .from('v2_transactions')
      .select('*')
      .limit(3);
      
    if (transError) {
      console.log('❌ Failed to query transactions:', transError.message);
    } else {
      console.log(`✅ Successfully queried transactions: ${transactions.length} found`);
      if (transactions.length > 0) {
        console.log('Sample transaction:');
        console.log(`   Amount: ${transactions[0].amount} ${transactions[0].currency}`);
        console.log(`   Date: ${transactions[0].transaction_date}`);
        console.log(`   Sender: ${transactions[0].sender_name || 'N/A'}`);
      }
    }
    
    console.log('\n✅ Test user setup complete!');
    console.log('📧 Email: test@testbank.com');
    console.log('🔑 Password: password123456');
    console.log('🎯 User ID:', userData.user.id);
    
  } catch (error) {
    console.error('💥 Failed to create test user:', error.message);
  }
}

createTestUser().catch(console.error);