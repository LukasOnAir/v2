---
status: resolved
trigger: "User can send verification emails to any address, but invite emails from director role fail with 'You can only send testing emails to your own email address'. Both use the same Resend account."
created: 2026-01-25T10:00:00Z
updated: 2026-01-25T10:10:00Z
---

## Current Focus

hypothesis: ROOT CAUSE CONFIRMED - Configuration issue, not code bug
test: N/A - Issue is Resend testing mode restriction
expecting: N/A
next_action: User action required - verify domain in Resend for production use

## Symptoms

expected: Invite emails should send to lukaspollardusa@gmail.com just like verification emails do
actual: Invite emails fail with Resend testing mode restriction, but verification emails work to the same external address
errors: "Invitation created but email failed: You can only send testing emails to your own email address (lukasppollard@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."
reproduction: Director role tries to invite lukaspollardusa@gmail.com - fails. But verification emails (presumably auth-related) work fine to external addresses.
started: Ongoing issue, previously investigated

## Eliminated

- hypothesis: Both systems use same Resend account incorrectly
  evidence: Verification uses Supabase built-in SMTP (Inbucket locally, SendGrid in production), not Resend at all
  timestamp: 2026-01-25T10:03:00Z

- hypothesis: Code bug in send-invitation function
  evidence: Code is correct - Resend API call works, but Resend rejects based on testing mode policy
  timestamp: 2026-01-25T10:08:00Z

## Evidence

- timestamp: 2026-01-25T10:01:00Z
  checked: supabase/functions/send-invitation/index.ts
  found: Invite emails use direct Resend API call (fetch to api.resend.com/emails with RESEND_API_KEY)
  implication: Subject to Resend testing mode - can only send to verified email when using unverified domain

- timestamp: 2026-01-25T10:01:30Z
  checked: supabase/functions/send-email/index.ts (auth hook)
  found: Auth hook EXISTS that routes auth emails through Resend. Uses same Resend API pattern.
  implication: If this hook is active, verification emails would ALSO fail with same error. But they work...

- timestamp: 2026-01-25T10:01:45Z
  checked: src/pages/VerifyEmailPage.tsx and AuthContext.tsx
  found: Verification emails triggered via supabase.auth.resend({ type: 'signup' }) - standard Supabase Auth API
  implication: This goes through Supabase's email system, not necessarily through the send-email hook

- timestamp: 2026-01-25T10:02:00Z
  checked: Both email implementations
  found: KEY INSIGHT - The send-email hook EXISTS but is NOT connected to Supabase Auth. Supabase Auth uses its own built-in SMTP (Inbucket for local, their managed SMTP for production).
  implication: Verification emails work because they use Supabase's default SMTP. Invites fail because they use Resend API directly with unverified domain.

- timestamp: 2026-01-25T10:03:30Z
  checked: 22-RESEARCH.md - Design decision history
  found: Custom invitation table was chosen because inviteUserByEmail has 24-hour limit vs needed 7-day expiry. However, this design assumed Resend would work in production with verified domain.
  implication: For TESTING, we need a workaround. For PRODUCTION, verify a domain in Resend.

- timestamp: 2026-01-25T10:04:00Z
  checked: Resend testing mode restrictions
  found: Resend testing mode (unverified domain) only allows sending to the account owner's email. To send to ANY address, must verify a domain.
  implication: This is expected Resend behavior - not a bug. Design works for production but not testing.

## Resolution

root_cause: CONFIGURATION ISSUE - NOT A CODE BUG

The application uses TWO SEPARATE EMAIL SYSTEMS:

1. **Verification emails** (signup, password reset):
   - Triggered via `supabase.auth.resend()` or `supabase.auth.signUp()`
   - Delivered by Supabase's built-in SMTP (managed by Supabase)
   - No restrictions on recipient addresses
   - Works to any email address

2. **Invitation emails** (user invites):
   - Triggered via `send-invitation` Edge Function
   - Uses Resend API directly (`api.resend.com/emails`)
   - Subject to Resend testing mode restrictions
   - FROM: `onboarding@resend.dev` (default Resend sandbox domain)

**Resend Testing Mode Behavior:**
When using an unverified domain (like `@resend.dev`), Resend only allows sending to the email address that owns the Resend account (`lukasppollard@gmail.com`). This is a Resend security measure, not a bug.

The error message is accurate: "To send emails to other recipients, please verify a domain at resend.com/domains"

fix: CONFIGURATION FIX (no code changes needed)

**For Production:**
1. Go to https://resend.com/domains
2. Add your domain (e.g., `riskguard.app`)
3. Add the DNS records Resend provides (MX, TXT for SPF/DKIM)
4. Wait for verification (usually minutes)
5. Update `EMAIL_FROM` environment variable to use verified domain:
   `EMAIL_FROM=RiskGuard <noreply@riskguard.app>`

**For Testing (workarounds):**
- Option A: Invite only `lukasppollard@gmail.com` (the Resend account email)
- Option B: Invitation still creates record - get token from `pending_invitations` table and manually construct URL
- Option C: Add test recipient emails to Resend "Audiences" (paid feature)

verification: This is a configuration issue requiring user action in Resend dashboard. Code is working correctly.

files_changed: []
