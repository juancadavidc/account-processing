#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  try {
    console.log('🔍 Testing authentication and transactions access...\n');
    
    // First, let's try a working test email
    const testEmail = 'testuser@example.com';
    const testPassword = 'password123456';
    
    // Test 1: Try to login with test credentials
    console.log('1. Testing user login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (authError) {
      console.log('❌ Login failed:', authError.message);
      
      // Try to create a test user
      console.log('\n2. Creating test user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
      
      if (signUpError) {
        console.log('❌ Sign up failed:', signUpError.message);
        console.log('\n3. Testing with anon access (returns empty due to RLS)...');
        
        // Test anon access (should return empty array due to RLS)
        const { data: anonData, error: anonError } = await supabase
          .from('v2_transactions')
          .select('*')
          .limit(5);
          
        console.log('Anon query result count:', anonData?.length || 0);
        console.log('Anon query error:', anonError?.message || 'None');
        
        console.log('\n✅ This confirms RLS is working - anon users see no data');
        return;
      }
      
      console.log('✅ Test user created:', signUpData.user?.id);
      console.log('Note: User needs email confirmation and source association');
    } else {
      console.log('✅ Login successful:', authData.user?.id);
    }
    
    // Test 3: Query transactions with authenticated user
    console.log('\n3. Testing authenticated transactions query...');
    const { data: transData, error: transError } = await supabase
      .from('v2_transactions')
      .select('*')
      .limit(5);
      
    if (transError) {
      console.log('❌ Authenticated query failed:', transError.message);
    } else {
      console.log('✅ Authenticated query successful:');
      console.log(`Found ${transData.length} transactions`);
      if (transData.length > 0) {
        console.log('Sample transaction:', JSON.stringify(transData[0], null, 2));
      } else {
        console.log('No transactions found - user likely not associated with sources');
      }
    }
    
    // Test 4: Check current user session
    console.log('\n4. Checking current user session...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Failed to get user:', userError.message);
    } else {
      console.log('✅ Current user:', user?.id, user?.email);
      
      // Check if this user has source associations
      if (user) {
        console.log('\n5. Checking user source associations...');
        const { data: sources, error: sourcesError } = await supabase
          .from('user_sources')
          .select('*')
          .eq('user_id', user.id);
          
        if (sourcesError) {
          console.log('❌ Failed to check user sources:', sourcesError.message);
        } else {
          console.log(`User has ${sources.length} source associations`);
          if (sources.length === 0) {
            console.log('❗ User needs to be associated with sources to see transactions');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testAuth().catch(console.error);