# Phase 23: Email & Scheduling - Research

**Researched:** 2026-01-25
**Domain:** Transactional Email + Scheduled Jobs (Supabase + Resend + pg_cron)
**Confidence:** HIGH

## Summary

Phase 23 implements automated email notifications and scheduled reminders for the RiskGuard ERM application. The project already has foundational email infrastructure from Phase 22 (invitation emails via Resend), which can be extended for additional notification types.

The implementation requires two distinct subsystems:
1. **Triggered Emails** - Sent immediately when events occur (test assignment, approval requests, etc.)
2. **Scheduled Emails** - Sent on a schedule (deadline reminders, overdue alerts)

**Primary recommendation:** Extend the existing Resend integration with new Edge Functions for triggered emails. Use Supabase pg_cron with pg_net to invoke Edge Functions for scheduled email batches. Configure Send Email Hook to handle Supabase Auth emails (password reset, verification) through Resend for consistent branding.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Resend | API v1 | Email delivery API | Already integrated in project; developer-friendly API |
| pg_cron | 1.6+ | PostgreSQL job scheduler | Native to Supabase; zero network latency |
| pg_net | 0.7+ | HTTP requests from Postgres | Required for pg_cron to call Edge Functions |
| Supabase Vault | - | Secret storage | Secure API key storage for cron jobs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| standardwebhooks | 1.0.0 | Webhook signature verification | For Send Email Hook security |
| date-fns | 4.1.0 | Date calculations | Already in project; deadline calculations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron | Vercel Cron | Vercel only runs on production deploys; pg_cron is more reliable |
| Inline HTML | React Email | React Email requires additional setup; inline HTML is simpler for MVP |
| Resend | AWS SES | SES more complex; Resend already integrated |

**Installation:**
No new npm packages required. All functionality uses Supabase Edge Functions (Deno) with existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  functions/
    send-invitation/          # EXISTS - invitation emails
    accept-invitation/        # EXISTS - accept flow
    send-email/               # NEW - Auth hook handler
    send-notification/        # NEW - triggered notifications
    process-reminders/        # NEW - scheduled batch processor
  migrations/
    00011_email_queue.sql     # NEW - email queue table
    00012_scheduled_jobs.sql  # NEW - pg_cron setup
```

### Pattern 1: Edge Function Per Email Type (SIMPLE)
**What:** Single Edge Function handles all triggered notifications with type parameter
**When to use:** For immediate notifications (test assignment, approval request, etc.)
**Example:**
```typescript
// supabase/functions/send-notification/index.ts
const notificationTypes = {
  'test-assigned': { subject: 'Control Test Assigned', template: testAssignedTemplate },
  'approval-request': { subject: 'Approval Required', template: approvalRequestTemplate },
  'approval-result': { subject: 'Change Request Update', template: approvalResultTemplate },
}

serve(async (req) => {
  const { type, recipientId, data } = await req.json()

  // Look up recipient email from profiles + auth.users
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .eq('id', recipientId)
    .single()

  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(recipientId)

  const config = notificationTypes[type]
  const html = config.template({ ...data, recipientName: profile.full_name })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'RiskGuard <noreply@yourdomain.com>',
      to: [user.email],
      subject: config.subject,
      html,
    }),
  })
})
```

### Pattern 2: pg_cron + Edge Function for Scheduled Emails
**What:** PostgreSQL cron job triggers Edge Function to process due reminders
**When to use:** For scheduled notifications (7-day reminders, overdue alerts)
**Example:**
```sql
-- Store secrets in Vault
SELECT vault.create_secret('https://project-ref.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');

-- Schedule daily reminder check at 8 AM UTC
SELECT cron.schedule(
  'process-test-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/process-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'daily-reminder')
  );
  $$
);
```

### Pattern 3: Send Email Hook for Supabase Auth Emails
**What:** Intercept Supabase Auth emails and send via Resend
**When to use:** Password reset (EMAIL-03), email verification (EMAIL-04)
**Example:**
```typescript
// supabase/functions/send-email/index.ts
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

serve(async (req) => {
  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  // Verify webhook signature
  const wh = new Webhook(hookSecret)
  const { user, email_data } = wh.verify(payload, headers)

  const templates = {
    signup: signupTemplate,
    recovery: passwordResetTemplate,
    email_change: emailChangeTemplate,
  }

  const html = templates[email_data.email_action_type]({
    token: email_data.token,
    tokenHash: email_data.token_hash,
    redirectTo: email_data.redirect_to,
  })

  await resend.emails.send({
    from: 'RiskGuard <noreply@yourdomain.com>',
    to: user.email,
    subject: getSubject(email_data.email_action_type),
    html,
  })

  return new Response(JSON.stringify({}), { status: 200 })
})
```

### Anti-Patterns to Avoid
- **Sending emails synchronously in API routes:** Block UI; use Edge Functions
- **No email queue for batch sends:** Risk of timeouts; queue and process in batches
- **Hardcoding secrets in pg_cron:** Security risk; use Supabase Vault
- **Processing all reminders in one query:** Scale issues; paginate with LIMIT

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email templating | String concatenation | HTML template functions | Maintainability, consistency |
| Cron expressions | Custom parser | pg_cron | Battle-tested, standard syntax |
| Webhook verification | Manual HMAC | standardwebhooks | Timing-safe comparison built-in |
| Retry logic | Custom retry | Resend handles retries | Resend has built-in retry with exponential backoff |
| Email deliverability | Custom SMTP | Resend with verified domain | SPF/DKIM/DMARC handled by provider |

**Key insight:** Resend handles delivery complexity (bounces, retries, deliverability). Focus on triggering the right emails at the right time.

## Common Pitfalls

### Pitfall 1: Missing Email Permission Lookup
**What goes wrong:** Trying to send to user ID without looking up email address
**Why it happens:** Profiles table has user ID but not email; email is in auth.users
**How to avoid:** Always join profiles with auth.admin.getUserById or store email in a joined view
**Warning signs:** "No email address found" errors

### Pitfall 2: pg_cron Job Stacking
**What goes wrong:** Long-running job overlaps with next scheduled run
**Why it happens:** Cron fires regardless of previous job completion
**How to avoid:** Keep jobs under 10 minutes; use locking flags; limit batch sizes
**Warning signs:** Duplicate emails sent, cron.job_run_details showing overlapping runs

### Pitfall 3: Send Email Hook Breaks Auth Flow
**What goes wrong:** Users can't sign up or reset password
**Why it happens:** Hook fails or returns non-200; Supabase Auth stops email flow entirely
**How to avoid:** Return 200 even on email failures; log errors; implement fallback
**Warning signs:** Auth operations succeed but no emails received

### Pitfall 4: Timezone Confusion in Reminders
**What goes wrong:** Reminders sent at wrong time for users
**Why it happens:** pg_cron uses UTC; user expects local time
**How to avoid:** Store deadlines as dates (not timestamps); run cron at consistent UTC time
**Warning signs:** Users complaining reminders come at odd hours

### Pitfall 5: Missing Unsubscribe Mechanism
**What goes wrong:** Users can't stop receiving emails; potential spam complaints
**Why it happens:** Notification emails aren't marketing, but users still want control
**How to avoid:** Add email preferences to profiles; check before sending
**Warning signs:** High unsubscribe/spam complaint rate

## Code Examples

Verified patterns from official sources and project codebase:

### Getting User Email from Profile ID
```typescript
// Source: Pattern from existing send-invitation function
async function getUserEmail(supabaseAdmin: SupabaseClient, userId: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (error || !user?.email) {
    throw new Error(`User ${userId} not found or has no email`)
  }
  return { email: user.email, metadata: user.user_metadata }
}
```

### Querying Controls Due for Reminder
```sql
-- Controls with tests due in exactly 7 days
SELECT
  c.id as control_id,
  c.name as control_name,
  c.next_test_date,
  c.assigned_tester_id,
  p.full_name as tester_name,
  au.email as tester_email
FROM controls c
JOIN profiles p ON c.assigned_tester_id = p.id
JOIN auth.users au ON p.id = au.id
WHERE c.next_test_date = CURRENT_DATE + INTERVAL '7 days'
  AND c.assigned_tester_id IS NOT NULL
  AND p.is_active = true;
```

### Simple HTML Email Template
```typescript
// Source: Pattern from existing send-invitation function
function testAssignedTemplate(data: {
  testerName: string
  controlName: string
  dueDate: string
  appUrl: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Control Test Assigned</h2>
      <p>Hello ${data.testerName},</p>
      <p>You have been assigned to test the following control:</p>
      <p style="background: #f4f4f5; padding: 12px; border-radius: 6px;">
        <strong>${data.controlName}</strong><br>
        Due: ${data.dueDate}
      </p>
      <p style="margin: 30px 0;">
        <a href="${data.appUrl}/tester"
           style="background-color: #f97316; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Control
        </a>
      </p>
    </body>
    </html>
  `
}
```

### Edge Function Config in supabase/config.toml
```toml
# Source: Existing project pattern
[functions.send-notification]
verify_jwt = false  # JWT verified manually in function

[functions.send-email]
verify_jwt = false  # Webhook auth hook uses signature

[functions.process-reminders]
verify_jwt = false  # Called by pg_cron with service role
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase built-in SMTP | Send Email Hook + Resend | 2024 | Full control over auth emails |
| External cron (GitHub Actions) | pg_cron + pg_net | 2024 | Zero network latency, native |
| Manual SPF/DKIM setup | Resend domain verification | Always | Provider handles DNS complexity |

**Deprecated/outdated:**
- Supabase default SMTP: Limited to 2 emails/hour, team members only - not for production
- `@supabase/gotrue-js` v1 patterns: Replaced by `@supabase/supabase-js` v2 auth hooks

## Email Requirements Mapping

| Requirement | Type | Trigger | Implementation |
|-------------|------|---------|----------------|
| EMAIL-01 | Triggered | User invited | EXISTS: send-invitation function |
| EMAIL-02 | Triggered | Signup complete | send-notification after accept-invitation |
| EMAIL-03 | Auth | Password reset | send-email hook (recovery type) |
| EMAIL-04 | Auth | Email verification | send-email hook (signup type) |
| EMAIL-05 | Triggered | Change submitted | send-notification when pending_changes created |
| EMAIL-06 | Triggered | Change reviewed | send-notification when pending_changes approved/rejected |
| EMAIL-07 | Triggered | Test assigned | send-notification when control.assigned_tester_id changes |
| SCHED-01 | Scheduled | 7 days before | pg_cron daily -> process-reminders |
| SCHED-02 | Scheduled | Past deadline | pg_cron daily -> process-reminders |
| SCHED-03 | Scheduled | 7 days before | pg_cron daily -> process-reminders (remediation) |
| SCHED-04 | Infrastructure | - | pg_cron setup + optional Vercel cron backup |
| SEC-06 | DNS Config | - | Resend domain verification (SPF/DKIM/DMARC) |

## SPF/DKIM/DMARC Configuration (SEC-06)

Domain email authentication requires DNS records with the email provider.

### Resend Domain Setup Process
1. Add domain in Resend dashboard (use subdomain like `mail.yourdomain.com`)
2. Resend provides DNS records to add:
   - **SPF** (TXT record): Authorizes Resend IPs to send on your behalf
   - **DKIM** (TXT record): Public key for email signature verification
   - **MX** (optional): For bounce handling
3. Add records to DNS provider (Cloudflare, Route 53, etc.)
4. Click "Verify" in Resend dashboard
5. Optionally add DMARC record for policy enforcement

### Recommended DMARC Policy
```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```
Start with `p=none` (monitor), then move to `p=quarantine` after verifying deliverability.

**Key insight:** Resend handles most complexity. Focus on adding the DNS records they provide and verifying the domain before going to production.

## Open Questions

Things that couldn't be fully resolved:

1. **Vercel Cron Backup (SCHED-04)**
   - What we know: Vercel cron works but only on production deploys
   - What's unclear: Is backup really needed if pg_cron is reliable?
   - Recommendation: Implement pg_cron as primary; document Vercel cron as backup option

2. **Email Preferences UI**
   - What we know: Users may want to opt out of some notifications
   - What's unclear: Which notifications should be optional vs mandatory?
   - Recommendation: Mark auth emails (password reset) as mandatory; test reminders as optional

3. **Controls Table Location**
   - What we know: Controls are in localStorage (v1.0 pattern); need database for scheduling
   - What's unclear: Will Phase 23 include database migration for controls?
   - Recommendation: Research existing controls table or defer scheduled emails until controls in DB

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/functions/send-invitation/index.ts` - verified Resend pattern
- Existing codebase: `src/types/rct.ts` - Control interface with test dates and tester assignment
- [Supabase Send Email Hook Docs](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)
- [Supabase Cron Docs](https://supabase.com/docs/guides/cron)
- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase Custom SMTP Docs](https://supabase.com/docs/guides/auth/auth-smtp)

### Secondary (MEDIUM confidence)
- [Resend Domain Introduction](https://resend.com/docs/dashboard/domains/introduction)
- [React Email + Resend Example](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend)
- WebSearch: "SPF DKIM DMARC best practices 2025" - multiple sources agree on rollout sequence

### Tertiary (LOW confidence)
- WebSearch: "Vercel cron jobs 2025" - confirms cron only runs on production

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Resend already integrated; Supabase docs comprehensive
- Architecture: HIGH - Based on existing project patterns and official docs
- Pitfalls: MEDIUM - Based on documentation warnings and common patterns
- SPF/DKIM/DMARC: MEDIUM - Provider-specific; Resend handles most complexity

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable technology stack)
