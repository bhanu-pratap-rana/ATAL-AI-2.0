#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://hnlsqznoviwnyrkskfay.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubHNxem5vdml3bnlya3NrZmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwMTM3NiwiZXhwIjoyMDc4MDc3Mzc2fQ.cm9trOy1x_oxoBzAz57vYyOV4VsfGlTPlZsoqvmaxXg';

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Try to query a system table
    const { data, error } = await supabase
      .from('pg_tables')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Status: Cannot query via REST API');
      console.log('Note: Direct SQL execution requires admin access\n');
      return false;
    }

    console.log('SUCCESS: Connected to Supabase database\n');
    return true;
  } catch (err) {
    console.log('Connection test error:', err.message);
    return false;
  }
}

async function main() {
  console.log('=== ATAL AI Database Migrations ===\n');

  const connected = await testConnection();

  if (!connected) {
    console.log('IMPORTANT: Supabase REST API has limited SQL execution capabilities.');
    console.log('\nTo apply migrations, you have two options:\n');
    console.log('OPTION 1: Supabase Dashboard (Manual)');
    console.log('  1. Go to: https://app.supabase.com');
    console.log('  2. Select project: hnlsqznoviwnyrkskfay');
    console.log('  3. Go to SQL Editor');
    console.log('  4. Create new query');
    console.log('  5. Copy-paste SQL from migration files');
    console.log('  6. Click Run\n');

    console.log('OPTION 2: Supabase CLI (Automated)');
    console.log('  1. Run: supabase login');
    console.log('  2. Run: supabase link --project-ref hnlsqznoviwnyrkskfay');
    console.log('  3. Run: supabase db push\n');

    console.log('OPTION 3: psql (Direct PostgreSQL)');
    console.log('  1. Get connection string from Supabase Dashboard');
    console.log('  2. Run: psql <connection_string> -f apps/db/migrations/066_enable_rls_adaptive_tables.sql');
    console.log('  3. Run: psql <connection_string> -f apps/db/migrations/067_add_foreign_key_indexes.sql\n');

    process.exit(1);
  }
}

main();
