#!/bin/bash
# Railway Setup Automation Script
# Helps set up Railway deployment step-by-step

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════╗
║   Railway Deployment Setup Script    ║
╚═══════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if Railway CLI is installed
echo -e "\n${BLUE}1. Checking Railway CLI...${NC}"
if ! command -v railway &> /dev/null; then
  echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
  echo -e "${YELLOW}Install with: npm install -g @railway/cli${NC}"
  read -p "Install now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install -g @railway/cli
    echo -e "${GREEN}✅ Railway CLI installed${NC}"
  else
    echo -e "${RED}❌ Railway CLI required. Exiting.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ Railway CLI found${NC}"
fi

# Login to Railway
echo -e "\n${BLUE}2. Railway Login${NC}"
if railway whoami &> /dev/null; then
  CURRENT_USER=$(railway whoami)
  echo -e "${GREEN}✅ Already logged in as: $CURRENT_USER${NC}"
else
  echo -e "${YELLOW}Please login to Railway...${NC}"
  railway login
fi

# Create or link project
echo -e "\n${BLUE}3. Project Setup${NC}"
if [ -f ".railway" ]; then
  echo -e "${GREEN}✅ Railway project already linked${NC}"
else
  echo -e "${YELLOW}No Railway project linked${NC}"
  read -p "Create new project or link existing? (new/existing/skip) " choice
  case $choice in
    new)
      read -p "Enter project name: " project_name
      railway init --name "$project_name"
      echo -e "${GREEN}✅ Project created and linked${NC}"
      ;;
    existing)
      railway link
      echo -e "${GREEN}✅ Project linked${NC}"
      ;;
    skip)
      echo -e "${YELLOW}⏭️  Skipping project setup${NC}"
      ;;
  esac
fi

# Add Redis service
echo -e "\n${BLUE}4. Redis Service${NC}"
echo -e "${YELLOW}Please add Redis service via Railway Dashboard:${NC}"
echo -e "   1. Go to Railway Dashboard"
echo -e "   2. Click '+ New' → 'Database' → 'Add Redis'"
echo -e "   3. Redis will auto-generate REDIS_URL variable"
read -p "Press Enter when Redis service is running..."
echo -e "${GREEN}✅ Redis service should now be running${NC}"

# Environment variables setup
echo -e "\n${BLUE}5. Environment Variables${NC}"
echo -e "${YELLOW}Setting up required environment variables...${NC}"
echo ""

# Check if .env.production.template exists
if [ ! -f ".env.production.template" ]; then
  echo -e "${RED}❌ .env.production.template not found${NC}"
  echo -e "${YELLOW}Please create it first${NC}"
  exit 1
fi

echo -e "Required environment variables:"
echo -e "  • SESSION_SECRET"
echo -e "  • GEMINI_API_KEY"
echo -e "  • ELEVENLABS_API_KEY"
echo -e "  • ELEVENLABS_TOOL_SECRET"
echo -e "  • ELEVENLABS_WEBHOOK_SECRET"
echo -e "  • VITE_SUPABASE_URL"
echo -e "  • VITE_SUPABASE_ANON_KEY"
echo -e "  • SUPABASE_SERVICE_ROLE_KEY"
echo ""

read -p "Set environment variables interactively? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Generate SESSION_SECRET
  echo -e "\n${BLUE}Generating SESSION_SECRET...${NC}"
  SESSION_SECRET=$(openssl rand -hex 32)
  railway variables set SESSION_SECRET="$SESSION_SECRET"
  echo -e "${GREEN}✅ SESSION_SECRET set${NC}"

  # Generate ElevenLabs secrets
  echo -e "\n${BLUE}Generating ElevenLabs secrets...${NC}"
  ELEVENLABS_TOOL_SECRET=$(openssl rand -hex 24)
  ELEVENLABS_WEBHOOK_SECRET=$(openssl rand -hex 24)
  railway variables set ELEVENLABS_TOOL_SECRET="$ELEVENLABS_TOOL_SECRET"
  railway variables set ELEVENLABS_WEBHOOK_SECRET="$ELEVENLABS_WEBHOOK_SECRET"
  echo -e "${GREEN}✅ ElevenLabs secrets generated and set${NC}"

  # Set NODE_ENV
  railway variables set NODE_ENV="production"
  echo -e "${GREEN}✅ NODE_ENV set to production${NC}"

  # Prompt for API keys
  echo -e "\n${YELLOW}Please enter the following manually:${NC}"
  read -p "GEMINI_API_KEY: " gemini_key
  railway variables set GEMINI_API_KEY="$gemini_key"

  read -p "ELEVENLABS_API_KEY: " elevenlabs_key
  railway variables set ELEVENLABS_API_KEY="$elevenlabs_key"

  read -p "VITE_SUPABASE_URL: " supabase_url
  railway variables set VITE_SUPABASE_URL="$supabase_url"

  read -p "VITE_SUPABASE_ANON_KEY: " supabase_anon
  railway variables set VITE_SUPABASE_ANON_KEY="$supabase_anon"

  read -p "SUPABASE_SERVICE_ROLE_KEY: " supabase_service
  railway variables set SUPABASE_SERVICE_ROLE_KEY="$supabase_service"

  echo -e "${GREEN}✅ All environment variables set${NC}"
else
  echo -e "${YELLOW}⏭️  Skipping interactive setup${NC}"
  echo -e "${YELLOW}Please set environment variables manually in Railway Dashboard${NC}"
fi

# Deploy
echo -e "\n${BLUE}6. Deployment${NC}"
read -p "Deploy to Railway now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Deploying...${NC}"
  railway up
  echo -e "${GREEN}✅ Deployment started${NC}"
  echo -e "${YELLOW}Check deployment status in Railway Dashboard${NC}"
else
  echo -e "${YELLOW}⏭️  Skipping deployment${NC}"
  echo -e "Deploy later with: ${BLUE}railway up${NC}"
fi

# Summary
echo -e "\n${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Setup Complete! 🎉                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Monitor deployment in Railway Dashboard"
echo -e "  2. Check logs: ${BLUE}railway logs${NC}"
echo -e "  3. Test health endpoint: ${BLUE}curl https://your-app.railway.app/health${NC}"
echo -e "\n${YELLOW}Documentation: docs/RAILWAY_DEPLOYMENT.md${NC}"
