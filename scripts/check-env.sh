#!/bin/bash
# Environment validation script
# Checks if all required environment variables are configured

set -e

echo "🔍 Stellar Onboarding MVP - Environment Validation"
echo "===================================================="
echo ""

# Load .env file
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "   Run './scripts/setup-env.sh' to create one."
    exit 1
fi

source .env

# Required variables
REQUIRED_VARS=(
    "SESSION_SECRET"
    "GEMINI_API_KEY"
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "REDIS_URL"
)

# Optional but recommended
OPTIONAL_VARS=(
    "ELEVENLABS_TOOL_SECRET"
    "ELEVENLABS_WEBHOOK_SECRET"
    "VITE_ELEVENLABS_AGENT_ID_LEVI"
    "VITE_ELEVENLABS_AGENT_ID_VICTORIA"
    "VITE_GOOGLE_MAPS_API_KEY"
)

MISSING=()
PLACEHOLDER=()

echo "Checking required variables..."
echo ""

for var in "${REQUIRED_VARS[@]}"; do
    value="${!var}"

    if [ -z "$value" ]; then
        MISSING+=("$var")
        echo "❌ $var - MISSING"
    elif [[ "$value" == *"replace-with"* ]] || [[ "$value" == *"your-"* ]] || [[ "$value" == *"placeholder"* ]]; then
        PLACEHOLDER+=("$var")
        echo "⚠️  $var - PLACEHOLDER VALUE"
    else
        echo "✅ $var - OK"
    fi
done

echo ""
echo "Checking optional variables..."
echo ""

for var in "${OPTIONAL_VARS[@]}"; do
    value="${!var}"

    if [ -z "$value" ] || [[ "$value" == *"replace-with"* ]]; then
        echo "⚠️  $var - NOT CONFIGURED (optional)"
    else
        echo "✅ $var - OK"
    fi
done

echo ""
echo "=============================================="
echo ""

# Summary
if [ ${#MISSING[@]} -eq 0 ] && [ ${#PLACEHOLDER[@]} -eq 0 ]; then
    echo "✅ All required environment variables are configured!"
    echo ""
    echo "Next steps:"
    echo "  1. Run database migrations in Supabase (see GO_LIVE_CHECKLIST.md)"
    echo "  2. Start Redis: docker run -d -p 6379:6379 redis:alpine"
    echo "  3. Install dependencies: npm install"
    echo "  4. Start development: npm run dev"
    exit 0
else
    echo "❌ Configuration incomplete!"
    echo ""

    if [ ${#MISSING[@]} -gt 0 ]; then
        echo "Missing variables (${#MISSING[@]}):"
        for var in "${MISSING[@]}"; do
            echo "  - $var"
        done
        echo ""
    fi

    if [ ${#PLACEHOLDER[@]} -gt 0 ]; then
        echo "Placeholder values detected (${#PLACEHOLDER[@]}):"
        for var in "${PLACEHOLDER[@]}"; do
            echo "  - $var"
        done
        echo ""
    fi

    echo "Please update your .env file with real values."
    echo "See GO_LIVE_CHECKLIST.md for detailed instructions."
    exit 1
fi
