#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Direct execution using Supabase REST API
const SUPABASE_URL = 'https://hnlsqznoviwnyrkskfay.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubHNxem5vdml3bnlya3NrZmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwMTM3NiwiZXhwIjoyMDc4MDc3Mzc2fQ.cm9trOy1x_oxoBzAz57vYyOV4VsfGlTPlZsoqvmaxXg';

async function executeSql(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function runMigrations() {
  console.log('=== Applying Database Migrations ===\n');

  const migrations = [
    {
      name: 'Migration 066: Enable RLS on Adaptive Learning Tables',
      file: 'apps/db/migrations/066_enable_rls_adaptive_tables.sql',
    },
    {
      name: 'Migration 067: Add Foreign Key Indexes',
      file: 'apps/db/migrations/067_add_foreign_key_indexes.sql',
    },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const migration of migrations) {
    try {
      console.log(`⏳ Applying: ${migration.name}`);

      const filePath = path.join(__dirname, migration.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const sql = fs.readFileSync(filePath, 'utf8');

      // Try to execute
      console.log(`   Executing SQL (${sql.length} characters)...`);

      // For now, just show that we're ready to execute
      console.log(`   ✅ Migration file loaded successfully\n`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`\n📝 NOTE: Direct SQL execution via REST API requires a database function.`);
  console.log(`Please use one of these methods instead:\n`);

  console.log('METHOD 1: Copy-paste in Supabase Dashboard SQL Editor (Easiest)');
  console.log('  1. Go: https://app.supabase.com');
  console.log('  2. Select project: hnlsqznoviwnyrkskfay');
  console.log('  3. SQL Editor → New Query');
  console.log('  4. Copy contents of 066_enable_rls_adaptive_tables.sql → Run');
  console.log('  5. Copy contents of 067_add_foreign_key_indexes.sql → Run\n');

  console.log('METHOD 2: Use your Terminal with PostgreSQL password');
  console.log('  supabase db push --linked --password "<your_db_password>"\n');

  console.log('METHOD 3: Get connection string from Supabase Dashboard');
  console.log('  Settings → Database → Connection pooling (Session mode)');
  console.log('  Then run: psql "<connection_string>" -f apps/db/migrations/066_enable_rls_adaptive_tables.sql\n');
}

runMigrations();
