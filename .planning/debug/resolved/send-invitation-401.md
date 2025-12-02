---
status: verifying
trigger: "Send Invitation returns 401 Missing authorization header"
created: 2026-01-25T10:00:00Z
updated: 2026-01-25T15:15:00Z
---

## Current Focus

hypothesis: Vite dev server was NOT restarted after .env.local change - env vars are baked into JS at server startup
test: Kill Vite dev server (Ctrl+C), restart with npm run dev, then test
expecting: After server restart, requests should include correct apikey (404 errors should disappear)
next_action: Verify if user restarted Vite dev server (not just hard refresh browser)

## Symptoms

expected: Email sent to invitee with join link
actual: 401 error with {"code":401,"message":"Missing authorization header"}
errors: {"code":401,"message":"Missing authorization header"}
reproduction: Click Send Invitation button in User Management UI (Invite User dialog)
started: Never worked - first time testing the invitation flow

## Eliminated

- hypothesis: Frontend is not setting Authorization header at all
  evidence: Code at useUserManagement.ts:86-87 clearly sets both apikey and Authorization headers
  timestamp: 2026-01-25T10:05:00Z

- hypothesis: apikey header is missing from frontend request
  evidence: Verified useUserManagement.ts line 86 has apikey header with VITE_SUPABASE_ANON_KEY
  timestamp: 2026-01-25T11:00:00Z

- hypothesis: Edge Function not deployed to cloud
  evidence: `supabase functions list` shows send-invitation ACTIVE version 4, deployed 2026-01-25 07:31:37
  timestamp: 2026-01-25T11:10:00Z

- hypothesis: CORS preflight is failing
  evidence: curl OPTIONS test shows correct CORS headers returned (Access-Control-Allow-Headers includes authorization, apikey)
  timestamp: 2026-01-25T11:35:00Z

- hypothesis: Invalid anon key format
  evidence: curl test with anon key works - gets past gateway when Authorization also present
  timestamp: 2026-01-25T11:40:00Z

## Evidence

- timestamp: 2026-01-25T10:02:00Z
  checked: useUserManagement.ts inviteUser function (lines 74-106)
  found: Authorization header IS set correctly as `Bearer ${session.access_token}`
  implication: Code correctly sets header

- timestamp: 2026-01-25T10:03:00Z
  checked: Error response format comparison
  found: Error says {"code":401,"message":"..."} which is Supabase gateway format, not Edge Function format {"error":"..."}
  implication: Error is from Supabase gateway, Edge Function code never executes

- timestamp: 2026-01-25T11:35:00Z
  checked: CORS preflight via curl OPTIONS
  found: Returns 200 with correct Access-Control-Allow-Headers
  implication: CORS is not blocking headers

- timestamp: 2026-01-25T11:40:00Z
  checked: curl with apikey + fake JWT vs no headers
  found: With both headers -> "Invalid JWT" (gets to JWT validation). With no headers -> "Missing authorization header"
  implication: Supabase gateway requires Authorization header; user's browser is NOT sending it

- timestamp: 2026-01-25T11:45:00Z
  checked: git diff shows apikey fix is in working copy but not committed
  found: useUserManagement.ts has uncommitted change adding apikey header
  implication: Local code has fix, but might not be what browser is running

- timestamp: 2026-01-25T11:50:00Z
  checked: curl with "Bearer undefined" value
  found: Returns "Invalid JWT", not "Missing authorization header"
  implication: Even if session.access_token is undefined, header would still be present. User's browser is truly not sending the header.

- timestamp: 2026-01-25T12:30:00Z
  checked: User reports TWO 404 errors alongside the 401
  found: 404 errors say "No API key found in request" - different from Edge Function 401
  implication: Multiple requests failing - suggests fundamental issue with API key configuration

- timestamp: 2026-01-25T12:35:00Z
  checked: .env.local VITE_SUPABASE_ANON_KEY value
  found: Key is "sb_publishable_hCcV7dmVjTH3PyxQeg40Fw_X7RGKqrk" - NOT a valid Supabase JWT format
  implication: CRITICAL - Supabase anon keys start with "eyJ" (base64-encoded JWT). This key looks like a placeholder or wrong service's key.

- timestamp: 2026-01-25T14:00:00Z
  checked: .env.local after user update
  found: Key is now correct JWT format "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." with ref "sjjwkdyliejfgmvuzpjp"
  implication: ENV file is correct, but errors persist. Need to verify Vite is actually serving updated values.

- timestamp: 2026-01-25T14:55:00Z
  checked: Curl test of Edge Function with correct anon key
  found: |
    - With apikey + Authorization: Returns "Invalid JWT" (gateway validates JWT)
    - With apikey only: Returns {"code":401,"message":"Missing authorization header"}
    - CRITICAL: This 401 format (code/message) is from GATEWAY, not Edge Function code
    - Edge Function code returns {"error":"..."} format, gateway returns {"code":...,"message":...}
  implication: The 401 user sees is from Supabase gateway blocking requests without Authorization header

- timestamp: 2026-01-25T14:56:00Z
  checked: CORS preflight test via curl OPTIONS
  found: Returns 200 with access-control-allow-headers including "authorization"
  implication: CORS is not stripping headers - browser should be able to send them

- timestamp: 2026-01-25T15:10:00Z
  checked: New evidence - WHEN do the 404 errors occur?
  found: |
    CRITICAL DISCOVERY: The 2x 404 "No API key found" errors fire when NAVIGATING to User Management page (on page load).
    The 401 "Missing authorization header" only fires when clicking Send Invitation.
    - 404s come from useUserManagement.ts refreshUsers() on mount (lines 41-58) - queries profiles and pending_invitations tables
    - These use the Supabase client, which should auto-include apikey header
    - The Supabase client is created with import.meta.env.VITE_SUPABASE_ANON_KEY
    - If apikey missing, it means supabaseAnonKey was undefined at client creation time
  implication: |
    The Supabase client was created with an undefined/wrong anon key.
    Vite bakes env vars into JS at SERVER STARTUP time.
    Hard refresh only reloads browser cache, does NOT re-read .env.local.
    User likely updated .env.local but did NOT restart Vite dev server.

- timestamp: 2026-01-25T15:12:00Z
  checked: client.ts validation logic
  found: |
    Lines 8-22 throw Error if VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing.
    BUT: If the old invalid key "sb_publishable_hCcV7dm..." was in .env.local, these checks PASS (key is truthy).
    The Supabase gateway then rejects the invalid key format with 404.
  implication: |
    The .env.local was updated AFTER user started dev server.
    Current browser is running code with OLD (invalid) anon key baked in.
    Solution: Restart Vite dev server to pick up new .env.local values.

## Resolution

root_cause: |
  Vite dev server was NOT restarted after updating .env.local.

  The sequence of events:
  1. User had invalid anon key "sb_publishable_hCcV7..." in .env.local
  2. User started Vite dev server - key baked into JS bundle at startup
  3. User updated .env.local with correct JWT key "eyJhbG..."
  4. User did hard refresh in browser - but Vite was still serving OLD bundle
  5. CRITICAL: Vite does NOT hot-reload .env.local changes - requires server RESTART

  The 404 "No API key found" errors occur because:
  - The old key "sb_publishable_..." is NOT a valid Supabase API key format
  - Valid Supabase anon keys are JWTs (start with "eyJ")
  - Supabase gateway returns 404 when it cannot parse/find a valid API key

  The 401 "Missing authorization header" error is a SEPARATE issue:
  - Edge Function requires Authorization header
  - This is set correctly in code IF session.access_token exists
  - May work once 404s are resolved (user auth flow works)

fix: |
  User action required:
  1. Stop Vite dev server (Ctrl+C in terminal running npm run dev)
  2. Restart Vite dev server: npm run dev
  3. Refresh browser (can be normal refresh, hard refresh not needed)
  4. Test User Management page - 404 errors should be gone

verification:
files_changed: []
