#!/bin/bash

# Deploy PayU Payment Functions
# Run this script to deploy both PayU edge functions

echo "🚀 Deploying PayU Payment Functions..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or deploy manually via Supabase Dashboard:"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Navigate to Edge Functions"
    echo "  4. Create new function: payu-payment"
    echo "  5. Copy code from: supabase/functions/payu-payment/index.ts"
    echo "  6. Create new function: payu-webhook"
    echo "  7. Copy code from: supabase/functions/payu-webhook/index.ts"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Deploy payu-payment function
echo "📦 Deploying payu-payment function..."
supabase functions deploy payu-payment

if [ $? -eq 0 ]; then
    echo "✅ payu-payment deployed successfully!"
else
    echo "❌ Failed to deploy payu-payment"
    exit 1
fi

echo ""

# Deploy payu-webhook function
echo "📦 Deploying payu-webhook function..."
supabase functions deploy payu-webhook

if [ $? -eq 0 ]; then
    echo "✅ payu-webhook deployed successfully!"
else
    echo "❌ Failed to deploy payu-webhook"
    exit 1
fi

echo ""
echo "🎉 All PayU functions deployed successfully!"
echo ""
echo "Next steps:"
echo "  1. Go to https://skinify.netlify.app"
echo "  2. Navigate to Profile → Balance"
echo "  3. Click Deposit"
echo "  4. Select PayU as payment method"
echo "  5. Test with PayU sandbox:"
echo "     - Card: 4444 3333 2222 1111"
echo "     - Expiry: Any future date"
echo "     - CVV: Any 3 digits"
echo ""
echo "📝 Check logs at: Supabase Dashboard → Edge Functions → Logs"
