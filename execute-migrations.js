#!/usr/bin/env node

/**
 * Execute Migrations 066 and 067 via Supabase PostgREST API
 * 
 * This script executes SQL migrations directly using the Supabase REST API.
 * Note: CREATE INDEX CONCURRENTLY requires direct database access and may
 * need to be run via psql or Supabase Dashboard SQL Editor.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hnlsqznoviwnyrkskfay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// For CREATE INDEX CONCURRENTLY, we need to remove CONCURRENTLY or use direct DB access
const MIGRATIONS = [
  {
    name: 'Migration 066: Enable RLS on Adaptive Learning Tables',
    file: 'apps/db/migrations/066_enable_rls_adaptive_tables.sql',
    canRunViaAPI: true,
  },
  {
    name: 'Migration 067: Add Foreign Key Indexes',
    file: 'apps/db/migrations/067_add_foreign_key_indexes.sql',
    canRunViaAPI: false, // CONCURRENTLY requires direct DB access
  },
];

async function executeSQL(sql, migrationName) {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  }

  // Use PostgREST REST API to execute SQL
  // Note: This may not work for all SQL statements, especially CREATE INDEX CONCURRENTLY
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

async function main() {
  console.log('🚀 Executing Database Migrations\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`);

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    console.error('\nPlease set it:');
    console.error('  export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"');
    console.error('\nOr get it from: https://app.supabase.com → Settings → API → Service role secret\n');
    process.exit(1);
  }

  for (const migration of MIGRATIONS) {
    const filePath = path.resolve(migration.file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      continue;
    }

    console.log(`\n📄 ${migration.name}`);
    console.log(`   File: ${migration.file}`);

    if (!migration.canRunViaAPI) {
      console.log(`   ⚠️  This migration contains CREATE INDEX CONCURRENTLY`);
      console.log(`   ⚠️  CONCURRENTLY requires direct database access`);
      console.log(`   ⚠️  Please run this migration via Supabase Dashboard SQL Editor or psql\n`);
      console.log(`   📋 SQL to copy-paste:\n`);
      console.log('─'.repeat(60));
      const sql = fs.readFileSync(filePath, 'utf8');
      // Remove verification queries for cleaner output
      const sqlWithoutVerification = sql.split('-- =====================================================\n-- Verification')[0];
      console.log(sqlWithoutVerification.trim());
      console.log('─'.repeat(60));
      continue;
    }

    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`   ⏳ Executing...`);
      
      // Remove verification queries
      const sqlToExecute = sql.split('-- =====================================================\n-- Verification')[0].trim();
      
      await executeSQL(sqlToExecute, migration.name);
      console.log(`   ✅ Successfully applied\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      console.error(`   💡 Tip: Try running this migration via Supabase Dashboard SQL Editor\n`);
    }
  }

  console.log('\n📊 Summary:');
  console.log('   Migration 066: RLS Policies - Can be run via API');
  console.log('   Migration 067: Indexes - Requires Dashboard/psql (CONCURRENTLY)\n');
  console.log('✅ Next Steps:');
  console.log('   1. Run Migration 066 via this script (if not already done)');
  console.log('   2. Go to: https://app.supabase.com → SQL Editor');
  console.log('   3. Copy-paste Migration 067 SQL and run it');
  console.log('   4. Run the verification query to confirm success\n');
}

main().catch(console.error);

