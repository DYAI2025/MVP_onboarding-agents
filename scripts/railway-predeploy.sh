#!/bin/bash
# Railway Pre-Deploy Validation Script
# Runs before deployment to catch configuration issues early

set -e

echo "🔍 Railway Pre-Deploy Checks"
echo "=============================="

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check Node.js version
echo -e "\n📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js version must be 18 or higher (current: $(node -v))${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✅ Node.js version OK: $(node -v)${NC}"
fi

# Check if package.json exists
echo -e "\n📄 Checking package.json..."
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ package.json not found${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✅ package.json found${NC}"
fi

# Check required scripts in package.json
echo -e "\n🔧 Checking package.json scripts..."
REQUIRED_SCRIPTS=("build" "start")
for script in "${REQUIRED_SCRIPTS[@]}"; do
  if ! grep -q "\"$script\":" package.json; then
    echo -e "${RED}❌ Missing script: $script${NC}"
    ERRORS=$((ERRORS+1))
  else
    echo -e "${GREEN}✅ Script found: $script${NC}"
  fi
done

# Check if tsconfig.server.json exists
echo -e "\n📝 Checking TypeScript configuration..."
if [ ! -f "tsconfig.server.json" ]; then
  echo -e "${RED}❌ tsconfig.server.json not found${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✅ tsconfig.server.json found${NC}"
fi

# Check if Dockerfile exists
echo -e "\n🐳 Checking Dockerfile..."
if [ ! -f "Dockerfile" ]; then
  echo -e "${RED}❌ Dockerfile not found${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✅ Dockerfile found${NC}"
fi

# Check if railway.toml exists
echo -e "\n🚂 Checking railway.toml..."
if [ ! -f "railway.toml" ]; then
  echo -e "${YELLOW}⚠️  railway.toml not found (optional but recommended)${NC}"
  WARNINGS=$((WARNINGS+1))
else
  echo -e "${GREEN}✅ railway.toml found${NC}"
fi

# Check required environment variables (in production)
if [ "$NODE_ENV" = "production" ]; then
  echo -e "\n🔐 Checking required environment variables..."

  REQUIRED_ENVS=(
    "SESSION_SECRET"
    "GEMINI_API_KEY"
    "REDIS_URL"
    "ELEVENLABS_TOOL_SECRET"
    "ELEVENLABS_WEBHOOK_SECRET"
  )

  for env in "${REQUIRED_ENVS[@]}"; do
    if [ -z "${!env}" ]; then
      echo -e "${RED}❌ Missing environment variable: $env${NC}"
      ERRORS=$((ERRORS+1))
    else
      echo -e "${GREEN}✅ Environment variable set: $env${NC}"
    fi
  done

  # Check for placeholder values
  if [[ "$SESSION_SECRET" == *"replace-with"* ]] || [[ "$SESSION_SECRET" == *"placeholder"* ]]; then
    echo -e "${RED}❌ SESSION_SECRET contains placeholder value${NC}"
    ERRORS=$((ERRORS+1))
  fi
fi

# Test build (if not in CI skip this to save time)
if [ "$SKIP_BUILD_TEST" != "true" ]; then
  echo -e "\n🔨 Testing build process..."
  if npm run build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
  else
    echo -e "${RED}❌ Build failed. Check /tmp/build.log for details${NC}"
    ERRORS=$((ERRORS+1))
  fi
else
  echo -e "\n⏭️  Skipping build test (SKIP_BUILD_TEST=true)"
fi

# Summary
echo -e "\n=============================="
echo -e "📊 Pre-Deploy Check Summary"
echo -e "=============================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s)${NC}"
  fi
  exit 0
else
  echo -e "${RED}❌ $ERRORS error(s) found${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s)${NC}"
  fi
  exit 1
fi
