#!/usr/bin/env node

/**
 * Apply Database Migrations to Supabase
 *
 * This script reads migration files and executes them against the Supabase database.
 * Usage: node apply-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hnlsqznoviwnyrkskfay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Migrations to apply (in order)
const MIGRATIONS = [
  'apps/db/migrations/066_enable_rls_adaptive_tables.sql',
  'apps/db/migrations/067_add_foreign_key_indexes.sql',
];

async function applyMigrations() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    console.error('Please set your Supabase service role key:');
    console.error('  export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"');
    console.error('\nFind it at: https://app.supabase.com → Settings → API → Service role secret');
    process.exit(1);
  }

  console.log('🚀 Applying database migrations...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔐 Using Service Role Key\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: {
      schema: 'public',
    },
  });

  let successCount = 0;
  let errorCount = 0;

  for (const migrationPath of MIGRATIONS) {
    const fullPath = path.resolve(migrationPath);
    const migrationName = path.basename(migrationPath);

    try {
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ Migration not found: ${fullPath}`);
        errorCount++;
        continue;
      }

      console.log(`⏳ Applying: ${migrationName}`);
      const sql = fs.readFileSync(fullPath, 'utf8');

      // Split SQL into individual statements (handle multiple statements)
      const statements = sql
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of statements) {
        const { error } = await supabase.rpc('exec', { p_query: statement });

        if (error) {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;
        }
      }

      console.log(`   ✅ Applied successfully\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to apply ${migrationName}:`);
      console.error(`   ${error.message}\n`);
      errorCount++;
    }
  }

  // Summary
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${MIGRATIONS.length}\n`);

  if (errorCount === 0) {
    console.log('🎉 All migrations applied successfully!');
    process.exit(0);
  } else {
    console.log('⚠️  Some migrations failed. Please check the errors above.');
    process.exit(1);
  }
}

applyMigrations();
