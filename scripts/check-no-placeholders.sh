#!/bin/bash
set -e

echo "Checking for forbidden placeholder patterns..."

FOUND=0

# Check for hardcoded DEMO_MODE = true (not in env check)
# Matches: DEMO_MODE = true, DEMO_MODE=true
# Ignores: VITE_DEMO_MODE=true (env), comments
if grep -rE "^\s*(export\s+)?(const|let|var)\s+DEMO_MODE\s*=\s*true" --include="*.ts" --include="*.tsx" src/ services/ components/ server/ 2>/dev/null; then
  echo "ERROR: Found hardcoded DEMO_MODE = true"
  FOUND=1
fi

# Check for hardcoded FORCE_HAPPY_PATH = true
if grep -rE "^\s*(export\s+)?(const|let|var)\s+FORCE_HAPPY_PATH\s*=\s*true" --include="*.ts" --include="*.tsx" src/ services/ components/ server/ 2>/dev/null; then
  echo "ERROR: Found hardcoded FORCE_HAPPY_PATH = true"
  FOUND=1
fi

# Check for actual placeholder values (not the constant definition)
# Matches: 'replace-with-xxx' or "replace-with-xxx" as values
# Ignores: PLACEHOLDER_PREFIX constant definition
if grep -rE "['\"]replace-with-[a-zA-Z]" --include="*.ts" --include="*.tsx" src/ services/ components/ server/ 2>/dev/null | grep -v "PLACEHOLDER_PREFIX"; then
  echo "ERROR: Found placeholder value starting with 'replace-with-'"
  FOUND=1
fi

# Check for TODO placeholders
if grep -rE "TODO:.*placeholder" --include="*.ts" --include="*.tsx" src/ services/ components/ server/ 2>/dev/null; then
  echo "ERROR: Found TODO placeholder"
  FOUND=1
fi

if [ $FOUND -eq 1 ]; then
  echo ""
  echo "Build blocked: Remove all placeholder patterns before committing."
  exit 1
fi

echo "No placeholder patterns found."
exit 0
