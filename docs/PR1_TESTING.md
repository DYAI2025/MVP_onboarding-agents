# PR1 Testing Plan — Evidence-Based Verification

## 🎯 Environment
- **Supabase:** EU region (Frankfurt/Ireland)
- **Server:** Staging deployment with SESSION_SECRET + ELEVENLABS_TOOL_SECRET

## 📋 SQL Schema Checks

```sql
-- Verify migration 004 applied
SELECT migration_name FROM supabase_migrations.schema_migrations WHERE migration_name LIKE '%004%';

-- Verify new columns exist
SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='ui_state';
SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='status';
SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='metadata';

-- Verify CHECK constraints
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='conversations_status_check';
-- Expected: CHECK (status IN ('started','active','completed','failed'))

-- Test constraint violation (must fail)
INSERT INTO conversations (id, user_id, chart_id, agent_id, status) 
VALUES (gen_random_uuid(), 'test', 'test', 'levi', 'invalid');
-- Expected: ERROR violates check constraint
```

## 🧪 curl Smoke Tests

```bash
SERVER="https://your-staging.fly.dev"
USER_ID="<test-user-uuid>"

# DoD #1: /api/analysis without user_id → 400
curl -X POST "$SERVER/api/analysis" -H "Content-Type: application/json" \
  -d '{"birth":{"date":"1990-05-15","time":"14:30","timezone":"Europe/Berlin","lat":52.52,"lon":13.405}}' \
  -w "\nStatus: %{http_code}\n"
# Expected: {"error":{"code":"INVALID_INPUT","message":"Missing user_id"},"request_id":"..."}
# Status: 400

# DoD #1: /api/analysis with user_id → 200 + chart_id
curl -X POST "$SERVER/api/analysis" -H "Content-Type: application/json" \
  -d '{"user_id":"'$USER_ID'","birth":{"date":"1990-05-15","time":"14:30","timezone":"Europe/Berlin","lat":52.52,"lon":13.405}}' \
  -w "\nStatus: %{http_code}\n"
# Expected: {"chart_id":"...","analysis":{...},"request_id":"..."}
# Status: 200

# DoD #3: Webhook without secret → 401
curl -X POST "$SERVER/api/webhooks/elevenlabs/post-call" -H "Content-Type: application/json" \
  -d '{"conversation_id":"test","custom_variables":{"conversation_id":"test"}}' \
  -w "\nStatus: %{http_code}\n"
# Expected: {"error":{"code":"UNAUTHORIZED","message":"Invalid or missing webhook secret"},"request_id":"..."}
# Status: 401

# DoD #5: Server without SESSION_SECRET → crash
unset SESSION_SECRET && npm run server
# Expected: Error: [FATAL] SESSION_SECRET not set. Server cannot start without session secret.
```

## 🔍 Security Verification

```bash
# DoD #5: No dev-secret defaults in code
scripts/verify-no-secrets.sh
# Expected: No matches found

# Verify .env.example has no real secrets
grep -E "(SECRET|KEY)=.+" .env.example | grep -v "your-" | grep -v "="
# Expected: empty (all secrets are placeholders or empty)
```

## 📊 Test Results Template

```markdown
### SQL Schema Checks
- [ ] Migration 004 applied: ✅/❌
- [ ] profiles.ui_state exists: ✅/❌
- [ ] conversations.status/metadata exists: ✅/❌
- [ ] CHECK constraints correct: ✅/❌
- [ ] Constraint violations fail: ✅/❌

### API Tests
- [ ] /api/analysis without user_id → 400: ✅/❌ (request_id: ...)
- [ ] /api/analysis with user_id → 200: ✅/❌ (request_id: ..., chart_id: ...)
- [ ] Webhook without secret → 401: ✅/❌ (request_id: ...)
- [ ] Server without SESSION_SECRET → crash: ✅/❌

### Security
- [ ] scripts/verify-no-secrets.sh → no matches: ✅/❌
- [ ] .env.example has no real secrets: ✅/❌
```
