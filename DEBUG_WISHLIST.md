# 🔍 Debug Wishlist - Complete Console Logging

## ✅ What I Added

I added **extensive debug logging** throughout the entire wishlist system to track down the exact issue.

---

## 🚀 Deploy & Test

### Step 1: Deploy
```bash
cd /tmp/cc-agent/48005361/project
./deploy-netlify.sh
```

### Step 2: Test with Console Open

1. **Open your site**: https://skinify.gg
2. **Open Console**: Press F12 → Click "Console" tab
3. **Clear console**: Click the 🚫 icon to clear old logs
4. **Reload page**: Press Ctrl+R or F5

---

## 📋 What You Should See in Console

### On Page Load:

```javascript
🔧 [SUPABASE] Initializing client: {
  url: "https://jtxqvctllitlhijfcsxg.supabase.co",
  hasAnonKey: true,
  anonKeyLength: 213,
  anonKeyPreview: "eyJhbGciOiJIUzI1NiIs..."
}
✅ [SUPABASE] Client created successfully
```

**If you see this**, the Supabase client is configured correctly! ✅

**If you DON'T see this**, there's an environment variable issue! ❌

---

### When Marketplace Loads:

```javascript
📊 [MARKETPLACE] Fetching wishlist counts for 45 items
```

Then either:
- **Success**: `✅ [MARKETPLACE] Wishlist counts fetched: 0 items`
- **Error**: `❌ [MARKETPLACE] Wishlist counts error: { ... }`

---

### When You Click Heart Icon (Add to Wishlist):

```javascript
🔷 [WISHLIST] Starting addItem: { itemId: 180, userId: "..." }
🔐 [WISHLIST] Session check: { hasSession: true, userId: "..." }
👤 [WISHLIST] User check: { hasUser: true, userId: "...", ... }
📝 [WISHLIST] Attempting insert: { user_id: "...", listing_id: 180 }
```

Then either:
- **Success**: `✅ [WISHLIST] Successfully added to wishlist: [...]`
- **Error**: `❌ [WISHLIST] Insert error: { code: "...", message: "...", ... }`

---

## 🔍 Common Error Scenarios

### Scenario 1: No Supabase Client Message
**Console shows**: Nothing about `[SUPABASE]`

**Problem**: Environment variables not loaded

**Fix**:
```bash
# Check .env file exists and has correct values
cat /tmp/cc-agent/48005361/project/.env

# Rebuild
npm run build
./deploy-netlify.sh
```

---

### Scenario 2: "No API key found in request"
**Console shows**:
```
400 error: {"message":"No API key found in request","hint":"No `apikey` request header..."}
```

**Problem**: The Supabase client isn't passing the anon key

**Fix**: This is what we just fixed! Deploy the new build.

---

### Scenario 3: "No active session"
**Console shows**:
```
❌ [WISHLIST] No active session to add to wishlist
```

**Problem**: You're not logged in

**Fix**: Click "Login with Steam" button in the header

---

### Scenario 4: "Permission denied - RLS policy blocking"
**Console shows**:
```
❌ [WISHLIST] Insert error: {
  code: "42501",
  message: "new row violates row-level security policy",
  ...
}
🚫 [WISHLIST] Permission denied - RLS policy blocking insert
```

**Problem**: RLS policy issue in database

**Fix**: Run the SQL migration again - `APPLY_WISHLIST_MIGRATION.sql`

---

### Scenario 5: Wishlist Counts 400 Error
**Console shows**:
```
❌ [MARKETPLACE] Wishlist counts error: {
  code: "...",
  message: "No API key found in request",
  ...
}
```

**Problem**: Same as Scenario 2

**Fix**: Deploy the new build - the fix is included

---

## 📝 What to Do Next

1. **Deploy the new build** (includes all debug logging)
2. **Open console** and reload the page
3. **Look for the logs** above
4. **Copy ALL console output** that includes `[SUPABASE]`, `[MARKETPLACE]`, or `[WISHLIST]`
5. **Share with me** so I can see exactly what's happening

---

## 🎯 Expected Successful Flow

When everything works, you should see:

```javascript
// On page load
🔧 [SUPABASE] Initializing client: { url: "...", hasAnonKey: true, ... }
✅ [SUPABASE] Client created successfully

// When marketplace loads
📊 [MARKETPLACE] Fetching wishlist counts for 45 items
✅ [MARKETPLACE] Wishlist counts fetched: 0 items

// When you click heart icon (logged in)
🔷 [WISHLIST] Starting addItem: { itemId: 180, ... }
🔐 [WISHLIST] Session check: { hasSession: true, ... }
👤 [WISHLIST] User check: { hasUser: true, ... }
📝 [WISHLIST] Attempting insert: { user_id: "...", listing_id: 180 }
✅ [WISHLIST] Successfully added to wishlist: [...]
```

**Then the heart icon turns red and shows "Added to Wishlist"!** ❤️

---

## 🆘 If Still Not Working

Share these console logs with me:

1. All `[SUPABASE]` logs
2. All `[MARKETPLACE]` logs
3. All `[WISHLIST]` logs
4. Any red error messages
5. The exact error from Network tab (F12 → Network → click failed request → Preview tab)

I'll be able to pinpoint the exact issue! 🎯
