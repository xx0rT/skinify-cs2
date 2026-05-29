# Apply KYC Migration - Step by Step Guide

## Method 1: Supabase Dashboard (Recommended - 2 minutes)

1. **Open the migration file**:
   - Location: `supabase/migrations/20251201120000_create_kyc_system.sql`
   - Open it in your code editor
   - Select ALL content (Ctrl+A / Cmd+A)
   - Copy it (Ctrl+C / Cmd+C)

2. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard
   - Login if needed
   - Select your project: `jtxqvctllitlhijfcsxg`

3. **Open SQL Editor**:
   - In left sidebar, click **SQL Editor**
   - Click **New query**

4. **Paste and Run**:
   - Paste the migration SQL (Ctrl+V / Cmd+V)
   - Click **Run** button (or Ctrl+Enter)
   - Wait for success message (should take 5-10 seconds)

5. **Verify Tables Created**:
   - Go to **Table Editor** in sidebar
   - You should see new tables:
     - `kyc_verifications`
     - `kyc_documents`
     - `kyc_restrictions`
     - `gdpr_requests`
     - `kyc_audit_log`
   - Check `users` table has new columns:
     - `kyc_status`
     - `kyc_required`
     - `kyc_completed_at`
     - etc.

---

## Method 2: Command Line (If you have psql)

```bash
# Navigate to project directory
cd /tmp/cc-agent/48005361/project

# Get your database URL from Supabase Dashboard:
# Settings → Database → Connection String → URI

# Run migration
psql "your-connection-string-here" < supabase/migrations/20251201120000_create_kyc_system.sql
```

---

## Method 3: Using Node.js Script (Alternative)

Create a file `run-migration.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY // Use SERVICE_ROLE_KEY if you have it
);

const sql = fs.readFileSync('supabase/migrations/20251201120000_create_kyc_system.sql', 'utf8');

async function runMigration() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successful!');
  }
}

runMigration();
```

Then run:
```bash
node run-migration.js
```

---

## Verification Checklist

After running the migration, verify:

- [ ] Table `kyc_verifications` exists
- [ ] Table `kyc_documents` exists
- [ ] Table `kyc_restrictions` exists
- [ ] Table `gdpr_requests` exists
- [ ] Table `kyc_audit_log` exists
- [ ] `users` table has `kyc_status` column
- [ ] `users` table has `kyc_required` column
- [ ] `users` table has `total_deposits` column
- [ ] `system_settings` table has KYC configuration rows

---

## If Migration Fails

Common issues:

### Error: "Table already exists"
- **Cause**: Migration already ran
- **Solution**: No action needed, tables are already there

### Error: "Column already exists"
- **Cause**: Partial migration ran before
- **Solution**: Safe to ignore, columns exist

### Error: "admin_roles table doesn't exist"
- **Cause**: You need the admin_roles table first
- **Solution**: Run the admin panel migration first:
  ```sql
  -- Create admin_roles table if it doesn't exist
  CREATE TABLE IF NOT EXISTS admin_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  ```

### Error: "Permission denied"
- **Cause**: Not using service role key
- **Solution**: Use service role key or run from Supabase Dashboard

---

## Need Help?

If migration fails, provide me with:
1. The exact error message
2. Which method you used
3. Screenshot of the error (if using dashboard)

I'll help you fix it!
