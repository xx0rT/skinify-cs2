# Apply Currency & Language Preferences Migration

## Important: Database Migration Required

The currency and language preference system is implemented in the code, but the database columns need to be added manually.

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/jtxqvctllitlhijfcsxg
2. Click on **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the SQL below
5. Click **Run** or press `Ctrl+Enter`

### Option 2: Supabase CLI

If you have Supabase CLI installed:
```bash
supabase db push
```

## Migration SQL

```sql
/*
  # Add User Preferences for Currency and Language

  1. Changes
    - Add preferred_currency column to users table (defaults to USD)
    - Add preferred_language column to users table (defaults to en)
    - Add detected_country column to store user's country based on IP
    - Create index for faster queries on currency preferences

  2. Security
    - Users can only update their own preferences
    - RLS policies already exist for user updates
*/

-- Add new columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferred_currency'
  ) THEN
    ALTER TABLE users ADD COLUMN preferred_currency text DEFAULT 'USD';
    COMMENT ON COLUMN users.preferred_currency IS 'User preferred currency code (EUR, CZK, USD, etc)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE users ADD COLUMN preferred_language text DEFAULT 'en';
    COMMENT ON COLUMN users.preferred_language IS 'User preferred language code (en, cs, de, ru)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'detected_country'
  ) THEN
    ALTER TABLE users ADD COLUMN detected_country text;
    COMMENT ON COLUMN users.detected_country IS 'Auto-detected country code from IP (SK, CZ, DE, etc)';
  END IF;
END $$;

-- Create index for faster currency queries
CREATE INDEX IF NOT EXISTS idx_users_preferred_currency ON users(preferred_currency);

-- Verify columns were added
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('preferred_currency', 'preferred_language', 'detected_country')
ORDER BY column_name;
```

## What This Does

This migration adds three new columns to your `users` table:

1. **preferred_currency** (text, default: 'USD')
   - Stores the user's preferred currency (e.g., 'EUR', 'CZK', 'USD')
   - Auto-detected from their country on first visit
   - Can be manually changed by the user

2. **preferred_language** (text, default: 'en')
   - Stores the user's preferred language (e.g., 'en', 'cs', 'de', 'ru')
   - Currently detected from URL, will be saved on future login

3. **detected_country** (text, nullable)
   - Stores the country code detected from the user's IP (e.g., 'SK', 'CZ', 'DE')
   - Used to determine which currency to show by default

## After Applying

Once you've applied this migration:

1. **Existing users**: Will get default values (USD currency, English language)
2. **New users**: Will automatically get their currency based on their country
3. **All users**: Can manually change their currency, and it will be saved to their profile
4. **Slovakia users**: Will automatically get EUR currency
5. **Czech users**: Will automatically get CZK currency

## Verification

After applying, you can verify it worked by running:

```sql
SELECT
  id,
  username,
  preferred_currency,
  preferred_language,
  detected_country
FROM users
LIMIT 5;
```

You should see the new columns with default values for existing users.

## Need Help?

If you encounter any issues:
1. Check that you're logged in as the project owner/admin
2. Make sure you're in the correct project
3. The SQL uses `IF NOT EXISTS` so it's safe to run multiple times
