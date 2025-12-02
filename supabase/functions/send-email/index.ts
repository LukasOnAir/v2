// supabase/functions/send-email/index.ts
// Send Email Hook handler for Supabase Auth emails
// Routes authentication emails through Resend for consistent branding
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

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
    function: 'send-email',
    ...context,
  }
  console[level](JSON.stringify(entry))
}

interface EmailData {
  email_action_type: 'signup' | 'recovery' | 'email_change' | 'magic_link'
  token: string
  token_hash: string
  redirect_to: string
}

interface WebhookPayload {
  user: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
    }
  }
  email_data: EmailData
}

// Email template styles (matching invitation email pattern)
const styles = {
  container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;',
  heading: 'color: #1a1a2e;',
  button: 'background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;',
  muted: 'color: #666; font-size: 14px;',
  footer: 'color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;',
}

function getSignupVerificationTemplate(data: {
  appUrl: string
  tokenHash: string
  userName?: string
}): { subject: string; html: string } {
  const confirmUrl = `${data.appUrl}/auth/confirm?token_hash=${data.tokenHash}&type=signup`

  return {
    subject: 'Verify your email for RiskGuard',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="${styles.container}">
        <h2 style="${styles.heading}">Verify Your Email</h2>
        <p>Hello${data.userName ? ` ${data.userName}` : ''},</p>
        <p>Please click the button below to verify your email address and activate your RiskGuard account.</p>
        <p style="margin: 30px 0;">
          <a href="${confirmUrl}" style="${styles.button}">
            Verify Email
          </a>
        </p>
        <p style="${styles.muted}">
          This link will expire in 24 hours. If you didn't create an account with RiskGuard, you can safely ignore this email.
        </p>
        <div style="${styles.footer}">
          <p>RiskGuard - Enterprise Risk Management</p>
        </div>
      </body>
      </html>
    `,
  }
}

function getWelcomeTemplate(data: {
  appUrl: string
  userName?: string
}): { subject: string; html: string } {
  return {
    subject: 'Welcome to RiskGuard',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="${styles.container}">
        <h2 style="${styles.heading}">Welcome to RiskGuard!</h2>
        <p>Hello${data.userName ? ` ${data.userName}` : ''},</p>
        <p>Thank you for joining RiskGuard - your enterprise risk management solution.</p>
        <p>RiskGuard helps organizations:</p>
        <ul>
          <li>Identify and assess risks across business processes</li>
          <li>Define and monitor controls to mitigate risks</li>
          <li>Track control testing and remediation activities</li>
          <li>Generate reports for management and auditors</li>
        </ul>
        <p><strong>Next steps:</strong></p>
        <p>Once you verify your email, you can access your dashboard and start managing your organization's risk landscape.</p>
        <p style="margin: 30px 0;">
          <a href="${data.appUrl}" style="${styles.button}">
            Go to RiskGuard
          </a>
        </p>
        <p style="${styles.muted}">
          If you have any questions, reach out to your organization's administrator.
        </p>
        <div style="${styles.footer}">
          <p>RiskGuard - Enterprise Risk Management</p>
        </div>
      </body>
      </html>
    `,
  }
}

function getRecoveryTemplate(data: {
  appUrl: string
  tokenHash: string
  userName?: string
}): { subject: string; html: string } {
  const resetUrl = `${data.appUrl}/auth/confirm?token_hash=${data.tokenHash}&type=recovery`

  return {
    subject: 'Reset your RiskGuard password',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="${styles.container}">
        <h2 style="${styles.heading}">Password Reset Request</h2>
        <p>Hello${data.userName ? ` ${data.userName}` : ''},</p>
        <p>We received a request to reset your password. Click the button below to create a new password.</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="${styles.button}">
            Reset Password
          </a>
        </p>
        <p style="${styles.muted}">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will remain unchanged.
        </p>
        <div style="${styles.footer}">
          <p>RiskGuard - Enterprise Risk Management</p>
        </div>
      </body>
      </html>
    `,
  }
}

function getEmailChangeTemplate(data: {
  appUrl: string
  tokenHash: string
  userName?: string
}): { subject: string; html: string } {
  const confirmUrl = `${data.appUrl}/auth/confirm?token_hash=${data.tokenHash}&type=email_change`

  return {
    subject: 'Confirm your new email for RiskGuard',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="${styles.container}">
        <h2 style="${styles.heading}">Email Change Confirmation</h2>
        <p>Hello${data.userName ? ` ${data.userName}` : ''},</p>
        <p>You requested to change your email address for your RiskGuard account. Click the button below to confirm this change.</p>
        <p style="margin: 30px 0;">
          <a href="${confirmUrl}" style="${styles.button}">
            Confirm Email Change
          </a>
        </p>
        <p style="${styles.muted}">
          This link will expire in 24 hours. If you didn't request this change, please contact your administrator immediately.
        </p>
        <div style="${styles.footer}">
          <p>RiskGuard - Enterprise Risk Management</p>
        </div>
      </body>
      </html>
    `,
  }
}

async function sendEmail(
  resendApiKey: string,
  fromEmail: string,
  to: string,
  subject: string,
  html: string,
  requestId: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logStructured('error', 'Resend API error', { requestId, status: response.status, error: errorBody.substring(0, 200) })
      return false
    }

    return true
  } catch (error) {
    logStructured('error', 'Error sending email', { requestId, error: error instanceof Error ? error.message : 'Unknown' })
    return false
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  logStructured('info', 'Function invoked', { requestId, method: req.method })

  // CRITICAL: Always return 200 to not block auth flow
  // Log errors but don't fail the request

  try {
    // Get hook secret from environment
    const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
    if (!hookSecret) {
      logStructured('error', 'SEND_EMAIL_HOOK_SECRET not configured', { requestId })
      // Return 200 anyway - don't block auth flow
      return new Response(JSON.stringify({ error: 'Hook secret not configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify webhook signature using standardwebhooks
    const payload = await req.text()
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    let webhookData: WebhookPayload
    try {
      const wh = new Webhook(hookSecret)
      webhookData = wh.verify(payload, headers) as WebhookPayload
    } catch (error) {
      logStructured('error', 'Webhook verification failed', { requestId, error: error instanceof Error ? error.message : 'Unknown' })
      // Return 200 anyway - don't block auth flow
      return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { user, email_data } = webhookData
    const { email_action_type, token_hash } = email_data

    // Get environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      logStructured('warn', 'RESEND_API_KEY not configured', { requestId })
      // Return 200 anyway - don't block auth flow
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const fromEmail = Deno.env.get('EMAIL_FROM') || 'RiskLytix <onboarding@resend.dev>'
    const userName = user.user_metadata?.full_name

    // Mask email for logging
    const maskedEmail = user.email.substring(0, 3) + '***@' + user.email.split('@')[1]
    logStructured('info', 'Processing auth email', { requestId, emailActionType: email_action_type, recipientMasked: maskedEmail })

    // Select and send appropriate template
    switch (email_action_type) {
      case 'signup': {
        // Send verification email
        const verificationTemplate = getSignupVerificationTemplate({
          appUrl,
          tokenHash: token_hash,
          userName,
        })
        const verificationSent = await sendEmail(
          resendApiKey,
          fromEmail,
          user.email,
          verificationTemplate.subject,
          verificationTemplate.html,
          requestId
        )
        logStructured('info', 'Verification email result', { requestId, sent: verificationSent })

        // EMAIL-02: Also send welcome email
        const welcomeTemplate = getWelcomeTemplate({
          appUrl,
          userName,
        })
        const welcomeSent = await sendEmail(
          resendApiKey,
          fromEmail,
          user.email,
          welcomeTemplate.subject,
          welcomeTemplate.html,
          requestId
        )
        logStructured('info', 'Welcome email result', { requestId, sent: welcomeSent })
        break
      }

      case 'recovery': {
        const template = getRecoveryTemplate({
          appUrl,
          tokenHash: token_hash,
          userName,
        })
        const sent = await sendEmail(
          resendApiKey,
          fromEmail,
          user.email,
          template.subject,
          template.html,
          requestId
        )
        logStructured('info', 'Recovery email result', { requestId, sent })
        break
      }

      case 'email_change': {
        const template = getEmailChangeTemplate({
          appUrl,
          tokenHash: token_hash,
          userName,
        })
        const sent = await sendEmail(
          resendApiKey,
          fromEmail,
          user.email,
          template.subject,
          template.html,
          requestId
        )
        logStructured('info', 'Email change confirmation result', { requestId, sent })
        break
      }

      case 'magic_link': {
        // Magic link uses same pattern as signup verification
        const template = getSignupVerificationTemplate({
          appUrl,
          tokenHash: token_hash,
          userName,
        })
        const sent = await sendEmail(
          resendApiKey,
          fromEmail,
          user.email,
          'Sign in to RiskLytix',
          template.html.replace('Verify Your Email', 'Sign In to RiskLytix').replace('Verify Email', 'Sign In'),
          requestId
        )
        logStructured('info', 'Magic link email result', { requestId, sent })
        break
      }

      default:
        logStructured('warn', 'Unhandled email action type', { requestId, emailActionType: email_action_type })
    }

    // Always return 200 to not block auth flow
    logStructured('info', 'Request completed', { requestId, status: 200 })
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logStructured('error', 'Internal error in send-email hook', { requestId, error: error instanceof Error ? error.message : 'Unknown' })
    // CRITICAL: Return 200 even on errors to not block auth flow
    return new Response(JSON.stringify({ error: 'Internal error', details: String(error) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
