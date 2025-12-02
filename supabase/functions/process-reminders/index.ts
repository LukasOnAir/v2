// supabase/functions/process-reminders/index.ts
// Scheduled reminder batch processor for test due/overdue and remediation deadline notifications
// Called by pg_cron daily at 8 AM UTC (primary) or Vercel cron (backup)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Structured logging helper
function logStructured(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, unknown>
) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    function: 'process-reminders',
    ...context,
  }
  console[level](JSON.stringify(entry))
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Reminder types supported by this processor
type ReminderType = 'test-due-7days' | 'test-overdue' | 'remediation-due-7days'

// Batch processing configuration
const BATCH_SIZE = 50

// Template for test due reminder (7 days warning)
function testDueReminderTemplate(data: {
  recipientName: string
  controlName: string
  dueDate: string
  appUrl: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Control Test Due in 7 Days</h2>
      <p>Hello ${data.recipientName},</p>
      <p>This is a reminder that you have a control test due soon:</p>
      <div style="background: #fef3c7; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 8px 0;"><strong>Control:</strong> ${data.controlName}</p>
        <p style="margin: 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
      </div>
      <p style="margin: 30px 0;">
        <a href="${data.appUrl}/tester"
           style="background-color: #f97316; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Complete Test
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Please complete the control test by the due date.
      </p>
    </body>
    </html>
  `
}

// Template for overdue test alert
function testOverdueTemplate(data: {
  recipientName: string
  controlName: string
  dueDate: string
  daysOverdue: number
  appUrl: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626;">Control Test Overdue</h2>
      <p>Hello ${data.recipientName},</p>
      <p>A control test assigned to you is now overdue:</p>
      <div style="background: #fee2e2; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 0 0 8px 0;"><strong>Control:</strong> ${data.controlName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
        <p style="margin: 0; color: #dc2626; font-weight: bold;">
          Overdue by: ${data.daysOverdue} day${data.daysOverdue > 1 ? 's' : ''}
        </p>
      </div>
      <p style="margin: 30px 0;">
        <a href="${data.appUrl}/tester"
           style="background-color: #dc2626; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Complete Test Now
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Please complete this test as soon as possible.
      </p>
    </body>
    </html>
  `
}

// Template for remediation deadline reminder (7 days warning)
function remediationDueTemplate(data: {
  recipientName: string
  remediationTitle: string
  deadline: string
  appUrl: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Remediation Deadline in 7 Days</h2>
      <p>Hello ${data.recipientName},</p>
      <p>This is a reminder that a remediation plan you own is due soon:</p>
      <div style="background: #fef3c7; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 8px 0;"><strong>Remediation:</strong> ${data.remediationTitle}</p>
        <p style="margin: 0;"><strong>Deadline:</strong> ${data.deadline}</p>
      </div>
      <p style="margin: 30px 0;">
        <a href="${data.appUrl}/remediation"
           style="background-color: #f97316; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Remediation
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Please ensure the remediation is completed by the deadline.
      </p>
    </body>
    </html>
  `
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  const triggerTime = new Date().toISOString()
  logStructured('info', 'Function invoked', { requestId, method: req.method, triggerTime })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Dual authentication: Accept either service role key (pg_cron) OR cron secret (Vercel)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = req.headers.get('x-cron-secret')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const expectedCronSecret = Deno.env.get('CRON_SECRET')

    // Check authentication
    const isServiceRoleAuth = authHeader && serviceRoleKey && authHeader.includes(serviceRoleKey)
    const isCronSecretAuth = cronSecret && expectedCronSecret && cronSecret === expectedCronSecret

    if (!isServiceRoleAuth && !isCronSecretAuth) {
      logStructured('error', 'Unauthorized: No valid credentials', { requestId })
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authMethod = isServiceRoleAuth ? 'service-role' : 'cron-secret'
    logStructured('info', 'Authenticated', { requestId, authMethod })

    // Parse request body for trigger info (optional)
    let triggerSource = 'unknown'
    try {
      const body = await req.json()
      triggerSource = body.trigger || 'unknown'
      logStructured('info', 'Trigger source parsed', { requestId, triggerSource, triggerTimestamp: body.timestamp })
    } catch {
      // Body may be empty for some invocations
      logStructured('info', 'No request body or invalid JSON', { requestId })
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Track processing results
    const results: Record<ReminderType, { queried: number; sent: number; errors: string[] }> = {
      'test-due-7days': { queried: 0, sent: 0, errors: [] },
      'test-overdue': { queried: 0, sent: 0, errors: [] },
      'remediation-due-7days': { queried: 0, sent: 0, errors: [] },
    }

    // Check for RESEND_API_KEY
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'RiskGuard <onboarding@resend.dev>'

    // =========================================================================
    // SCHED-01: Test Due in 7 Days
    // =========================================================================
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0]

    type ProfileJoin = { id: string; full_name: string; is_active: boolean } | null

    const { data: dueSoonTests, error: dueSoonError } = await supabaseAdmin
      .from('controls')
      .select(`
        id,
        name,
        next_test_date,
        assigned_tester_id,
        profiles!controls_assigned_tester_id_fkey (
          id,
          full_name,
          is_active
        )
      `)
      .eq('next_test_date', sevenDaysStr)
      .not('assigned_tester_id', 'is', null)
      .limit(BATCH_SIZE)

    if (dueSoonError) {
      logStructured('error', 'Failed to fetch due-soon tests', { requestId, error: dueSoonError.message })
    } else if (dueSoonTests) {
      results['test-due-7days'].queried = dueSoonTests.length
      logStructured('info', 'Fetched due-soon tests', { requestId, count: dueSoonTests.length, targetDate: sevenDaysStr })

      for (const control of dueSoonTests) {
        const profile = control.profiles as unknown as ProfileJoin
        if (!profile) {
          logStructured('warn', 'Skipping control: no profile found', { requestId, controlId: control.id })
          continue
        }
        if (!profile.is_active) {
          logStructured('info', 'Skipping control: tester inactive', { requestId, controlId: control.id })
          continue
        }

        // Get email from auth.users
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        if (authError || !authUser?.user?.email) {
          logStructured('warn', 'Skipping control: could not get tester email', { requestId, controlId: control.id })
          continue
        }

        if (!resendApiKey) {
          logStructured('info', 'Would send due-soon reminder', { requestId, controlName: control.name, email: authUser.user.email })
          continue
        }

        try {
          const html = testDueReminderTemplate({
            recipientName: profile.full_name || 'Tester',
            controlName: control.name,
            dueDate: control.next_test_date || sevenDaysStr,
            appUrl,
          })

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [authUser.user.email],
              subject: `Control Test Due Soon: ${control.name}`,
              html,
            }),
          })

          if (emailResponse.ok) {
            results['test-due-7days'].sent++
            logStructured('info', 'Sent due-soon reminder', { requestId, controlId: control.id })
          } else {
            const errorText = await emailResponse.text()
            results['test-due-7days'].errors.push(`Failed: ${control.name} - ${errorText}`)
          }
        } catch (err) {
          results['test-due-7days'].errors.push(`Exception: ${control.name} - ${err}`)
        }
      }
    }

    // =========================================================================
    // SCHED-02: Test Overdue
    // =========================================================================
    const today = new Date().toISOString().split('T')[0]

    const { data: overdueTests, error: overdueError } = await supabaseAdmin
      .from('controls')
      .select(`
        id,
        name,
        next_test_date,
        assigned_tester_id,
        profiles!controls_assigned_tester_id_fkey (
          id,
          full_name,
          is_active
        )
      `)
      .lt('next_test_date', today)
      .not('assigned_tester_id', 'is', null)
      .limit(BATCH_SIZE)

    if (overdueError) {
      logStructured('error', 'Failed to fetch overdue tests', { requestId, error: overdueError.message })
    } else if (overdueTests) {
      results['test-overdue'].queried = overdueTests.length
      logStructured('info', 'Fetched overdue tests', { requestId, count: overdueTests.length, beforeDate: today })

      for (const control of overdueTests) {
        const profile = control.profiles as unknown as ProfileJoin
        if (!profile) {
          logStructured('warn', 'Skipping overdue control: no profile found', { requestId, controlId: control.id })
          continue
        }
        if (!profile.is_active) {
          logStructured('info', 'Skipping overdue control: tester inactive', { requestId, controlId: control.id })
          continue
        }

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        if (authError || !authUser?.user?.email) {
          logStructured('warn', 'Skipping overdue control: could not get tester email', { requestId, controlId: control.id })
          continue
        }

        // Calculate days overdue with safe date parsing
        if (!control.next_test_date) {
          logStructured('warn', 'Skipping overdue control: no next_test_date', { requestId, controlId: control.id })
          continue
        }
        const dueDate = new Date(control.next_test_date)
        if (isNaN(dueDate.getTime())) {
          logStructured('warn', 'Skipping overdue control: invalid date', { requestId, controlId: control.id, date: control.next_test_date })
          continue
        }
        const todayDate = new Date(today)
        const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

        if (!resendApiKey) {
          logStructured('info', 'Would send overdue alert', { requestId, controlName: control.name, daysOverdue })
          continue
        }

        try {
          const html = testOverdueTemplate({
            recipientName: profile.full_name || 'Tester',
            controlName: control.name,
            dueDate: control.next_test_date || today,
            daysOverdue,
            appUrl,
          })

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [authUser.user.email],
              subject: `OVERDUE: Control Test Required - ${control.name}`,
              html,
            }),
          })

          if (emailResponse.ok) {
            results['test-overdue'].sent++
            logStructured('info', 'Sent overdue alert', { requestId, controlId: control.id, daysOverdue })
          } else {
            const errorText = await emailResponse.text()
            results['test-overdue'].errors.push(`Failed: ${control.name} - ${errorText}`)
          }
        } catch (err) {
          results['test-overdue'].errors.push(`Exception: ${control.name} - ${err}`)
        }
      }
    }

    // =========================================================================
    // SCHED-03: Remediation Due in 7 Days (STUB - lower priority)
    // =========================================================================
    // TODO: Implement when remediation_plans owner_id field is verified
    // Query: remediation_plans with deadline = today + 7 days, status not resolved/closed
    logStructured('info', 'Remediation reminders skipped (not yet implemented)', { requestId })

    // Build summary response
    const summary = {
      success: true,
      timestamp: triggerTime,
      triggerSource,
      authMethod,
      emailServiceConfigured: !!resendApiKey,
      processed: {
        'test-due-7days': results['test-due-7days'].sent,
        'test-overdue': results['test-overdue'].sent,
        'remediation-due-7days': 0, // Still stubbed
      },
      queried: {
        'test-due-7days': results['test-due-7days'].queried,
        'test-overdue': results['test-overdue'].queried,
        'remediation-due-7days': 0,
      },
      errors: [
        ...results['test-due-7days'].errors,
        ...results['test-overdue'].errors,
      ],
    }

    logStructured('info', 'Request completed', {
      requestId,
      status: 200,
      triggerSource,
      authMethod,
      emailServiceConfigured: !!resendApiKey,
      totalQueried: results['test-due-7days'].queried + results['test-overdue'].queried,
      totalSent: results['test-due-7days'].sent + results['test-overdue'].sent,
      totalErrors: results['test-due-7days'].errors.length + results['test-overdue'].errors.length,
    })

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    logStructured('error', 'Internal server error', { requestId, error: error instanceof Error ? error.message : 'Unknown' })
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
