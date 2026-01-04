#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Supabase credentials (from run-migrations.js)
const SUPABASE_URL = 'https://hnlsqznoviwnyrkskfay.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubHNxem5vdml3bnlya3NrZmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwMTM3NiwiZXhwIjoyMDc4MDc3Mzc2fQ.cm9trOy1x_oxoBzAz57vYyOV4VsfGlTPlZsoqvmaxXg';

async function executeQuery(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Query execution error:', error.message);
    throw error;
  }
}

async function verifySchemа() {
  console.log('🔍 Verifying practice_questions table schema...\n');

  // Query 1: Get all columns
  const columnsQuery = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      ordinal_position
    FROM information_schema.columns
    WHERE table_name = 'practice_questions'
    ORDER BY ordinal_position;
  `;

  // Query 2: Verify data volume
  const countQuery = `
    SELECT COUNT(*) as total_rows FROM practice_questions;
  `;

  // Query 3: Verify table exists
  const tableExistsQuery = `
    SELECT EXISTS(
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'practice_questions'
    ) as table_exists;
  `;

  try {
    console.log('⏳ Executing Query 1: Get all columns...');
    console.log('');
    const columnsResult = await executeQuery(columnsQuery);

    if (columnsResult && Array.isArray(columnsResult)) {
      console.log('✅ Columns Found:');
      console.log('');
      columnsResult.forEach(col => {
        console.log(`  ${col.ordinal_position}. ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | NULL: ${col.is_nullable} | Default: ${col.column_default || 'none'}`);
      });
      console.log(`\n📊 Total columns: ${columnsResult.length}`);
    } else {
      console.log('⚠️ Unexpected response format:', columnsResult);
    }

    console.log('\n⏳ Executing Query 2: Count rows...');
    const countResult = await executeQuery(countQuery);
    if (countResult && countResult.length > 0) {
      console.log(`✅ Total rows: ${countResult[0].total_rows}`);
    }

    console.log('\n⏳ Executing Query 3: Verify table exists...');
    const tableExistsResult = await executeQuery(tableExistsQuery);
    if (tableExistsResult && tableExistsResult.length > 0) {
      console.log(`✅ Table exists: ${tableExistsResult[0].table_exists}`);
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    console.log('\n📝 Alternative approach:');
    console.log('Please manually run these queries in Supabase Dashboard SQL Editor:\n');
    console.log('Query 1: Get columns');
    console.log('```sql');
    console.log(columnsQuery);
    console.log('```\n');
    console.log('Query 2: Count rows');
    console.log('```sql');
    console.log(countQuery);
    console.log('```\n');
    console.log('Query 3: Verify table exists');
    console.log('```sql');
    console.log(tableExistsQuery);
    console.log('```\n');
  }
}

verifySchemа();
