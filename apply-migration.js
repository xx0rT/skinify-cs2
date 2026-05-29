const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Try to load dotenv if available
try {
  require('dotenv').config();
} catch (e) {
  console.log('Note: dotenv not installed, using environment variables directly');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.log('Please ensure your .env file contains:');
  console.log('  VITE_SUPABASE_URL=your_url');
  console.log('  VITE_SUPABASE_ANON_KEY=your_key');
  console.log('\nOr run: npm install dotenv');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Add new columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferred_currency'
  ) THEN
    ALTER TABLE users ADD COLUMN preferred_currency text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE users ADD COLUMN preferred_language text DEFAULT 'en';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'detected_country'
  ) THEN
    ALTER TABLE users ADD COLUMN detected_country text;
  END IF;
END $$;

-- Create index for currency queries
CREATE INDEX IF NOT EXISTS idx_users_preferred_currency ON users(preferred_currency);
`;

async function applyMigration() {
  console.log('Applying user preferences migration...');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Migration failed:', error);
      console.log('\nNote: The anon key might not have permission to run DDL statements.');
      console.log('You need to apply this migration manually in the Supabase SQL Editor:');
      console.log('\n' + sql);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('User preferences columns added to users table.');
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\nYou need to apply this migration manually in the Supabase SQL Editor:');
    console.log('\n' + sql);
  }
}

applyMigration();
