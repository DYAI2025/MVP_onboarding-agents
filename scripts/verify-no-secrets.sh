#!/bin/bash
# Verify no dev-secret defaults or hardcoded secrets in repository

set -e

echo "🔍 Checking for dev-secret defaults and hardcoded secrets..."
echo ""

# Check for dev-secret defaults
echo "[1/4] Checking for 'dev-secret' patterns..."
if grep -r "dev-secret" server/ --exclude-dir=node_modules --exclude="*.test.ts" 2>/dev/null; then
    echo "❌ FAIL: Found 'dev-secret' defaults in code"
    exit 1
fi
echo "✅ PASS: No 'dev-secret' defaults found"
echo ""

# Check for hardcoded JWT secrets
echo "[2/4] Checking for hardcoded JWT_SECRET..."
if grep -r "JWT_SECRET.*=.*['\"]" server/ --exclude-dir=node_modules --exclude="*.test.ts" 2>/dev/null | grep -v "process.env"; then
    echo "❌ FAIL: Found hardcoded JWT_SECRET"
    exit 1
fi
echo "✅ PASS: No hardcoded JWT_SECRET found"
echo ""

# Check .env.example has no real secrets
echo "[3/4] Checking .env.example for real secrets..."
if grep -E "(SECRET|KEY)=.+" .env.example | grep -v "your-" | grep -v "=\s*$" | grep -v "#"; then
    echo "❌ FAIL: .env.example contains real secrets"
    exit 1
fi
echo "✅ PASS: .env.example has no real secrets"
echo ""

# Check for SUPABASE_SERVICE_ROLE_KEY in client code
echo "[4/4] Checking for SUPABASE_SERVICE_ROLE_KEY in client code..."
if grep -r "SUPABASE_SERVICE_ROLE_KEY" src/ components/ --exclude-dir=node_modules 2>/dev/null; then
    echo "❌ FAIL: SUPABASE_SERVICE_ROLE_KEY found in client code (SECURITY RISK!)"
    exit 1
fi
echo "✅ PASS: SUPABASE_SERVICE_ROLE_KEY not exposed in client"
echo ""

echo "✅ All security checks passed!"
