#!/bin/bash
# Setup script for Stellar Onboarding MVP
# Automates environment configuration

set -e

echo "🌟 Stellar Onboarding MVP - Environment Setup"
echo "=============================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting. Please configure .env manually."
        exit 0
    fi
fi

# Copy template
echo "📄 Copying .env.example to .env..."
cp .env.example .env

# Generate SESSION_SECRET
echo "🔐 Generating secure SESSION_SECRET..."
SESSION_SECRET=$(openssl rand -base64 32)
sed -i.bak "s|SESSION_SECRET=replace-with-secure-random-string|SESSION_SECRET=$SESSION_SECRET|g" .env

echo ""
echo "✅ Basic setup complete!"
echo ""
echo "⚠️  NEXT STEPS: Edit .env file and configure:"
echo ""
echo "   1. Supabase credentials (from https://supabase.com dashboard)"
echo "      - SUPABASE_URL"
echo "      - SUPABASE_SERVICE_ROLE_KEY"
echo "      - VITE_SUPABASE_URL (same as SUPABASE_URL)"
echo "      - VITE_SUPABASE_ANON_KEY"
echo ""
echo "   2. Google Gemini API key (from https://aistudio.google.com/apikey)"
echo "      - GEMINI_API_KEY"
echo ""
echo "   3. ElevenLabs credentials (optional, from ElevenLabs dashboard)"
echo "      - ELEVENLABS_TOOL_SECRET"
echo "      - ELEVENLABS_WEBHOOK_SECRET"
echo "      - VITE_ELEVENLABS_AGENT_ID_LEVI"
echo "      - VITE_ELEVENLABS_AGENT_ID_VICTORIA"
echo ""
echo "   4. Redis URL (default: redis://localhost:6379)"
echo "      - REDIS_URL"
echo ""
echo "💡 TIP: Run './scripts/check-env.sh' to validate your configuration"
echo ""
