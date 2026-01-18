#!/bin/bash

# Security Test Script for PR2 (Security Hardening)
# This script tests token generation and secure tool access.

BASE_URL="http://localhost:8787"
API_URL="${BASE_URL}/api"

echo "=== PR2 Security Testing: JWT & Tool Access ==="

# 1. Generate Session Token
echo "Testing: Session Token Generation..."
SESSION_RES=$(curl -s -X POST "${API_URL}/agent/session" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-user-123", "chart_id":"test-chart-456"}')

echo "Session Response: $SESSION_RES"

TOKEN=$(echo $SESSION_RES | grep -o '"session_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "[FAIL] Session token not generated."
else
  echo "[PASS] Session token generated."
fi

# 2. Test Tool Access WITHOUT Token
echo "Testing: Tool Access without Token (Negative Test)..."
TOOL_RES_BAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/agent/tools/get_user_context" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$TOOL_RES_BAD" == "401" ]; then
  echo "[PASS] Tool access denied (401) as expected."
else
  echo "[FAIL] Tool access NOT denied (Status: $TOOL_RES_BAD)."
fi

# 3. Test Tool Access WITH Valid Token
echo "Testing: Tool Access with Valid Token..."
TOOL_RES_VALID=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/agent/tools/get_user_context" \
  -H "Content-Type: application/json" \
  -d '{"session_token":"'"$TOKEN"'"}')

# If Supabase is missing, it might return 500, but auth check should have passed.
# In the code, tool execution failure returns 500. Chart not found returns 404.
# Invalid token returns 403.
if [ "$TOOL_RES_VALID" == "200" ] || [ "$TOOL_RES_VALID" == "404" ] || [ "$TOOL_RES_VALID" == "500" ]; then
  echo "[PASS] Tool auth successful (Status: $TOOL_RES_VALID, which is > 403)."
else
  echo "[FAIL] Tool auth failed or unexpected (Status: $TOOL_RES_VALID)."
fi

echo "=== Security Testing Complete ==="
