// supabase/functions/send-invitation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

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
    function: 'send-invitation',
    ...context,
  }
  console[level](JSON.stringify(entry))
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Request validation schema
// Note: Director role excluded per 22-01 decision (Directors cannot invite other Directors)
const SendInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['manager', 'risk-manager', 'control-owner', 'control-tester'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
})

serve(async (req) => {
  const requestId = crypto.randomUUID()
  logStructured('info', 'Function invoked', { requestId, method: req.method })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const parseResult = SendInvitationSchema.safeParse(body)

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, role } = parseResult.data

    // Get the JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the JWT token from "Bearer <token>"
    const jwt = authHeader.replace('Bearer ', '')

    // Create Supabase client with user's JWT (for RLS)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get current user info from JWT - pass token directly
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(jwt)
    if (userError || !user) {
      logStructured('error', 'Authentication failed', { requestId, error: userError?.message || 'Unknown' })
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logStructured('info', 'Caller authenticated', { requestId, userId: user.id })

    const tenantId = user.app_metadata?.tenant_id
    const userRole = user.app_metadata?.role

    // Verify caller is Director
    if (userRole !== 'director') {
      return new Response(
        JSON.stringify({ error: 'Only Directors can invite users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'User has no tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert invitation record (RLS will verify Director role)
    const { data: invitation, error: insertError } = await supabaseUser
      .from('pending_invitations')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      // Handle duplicate invitation
      if (insertError.code === '23505') {
        logStructured('warn', 'Duplicate invitation attempt', { requestId, role })
        return new Response(
          JSON.stringify({ error: 'User already has a pending invitation' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw insertError
    }

    logStructured('info', 'Invitation created', { requestId, invitationId: invitation.id, role })

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      logStructured('warn', 'RESEND_API_KEY not configured', { requestId })
      // Still return success - invitation created, email will be sent when configured
      return new Response(
        JSON.stringify({
          success: true,
          invitationId: invitation.id,
          emailSent: false,
          message: 'Invitation created but email service not configured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const inviteUrl = `${appUrl}/accept-invite?token=${invitation.token}`
    const roleName = role.replace('-', ' ')

    const emailPayload = {
      from: Deno.env.get('EMAIL_FROM') || 'RiskLytix <onboarding@resend.dev>',
      to: [email],
      subject: 'You have been invited to RiskLytix',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">You're invited to join RiskLytix</h2>
          <p>You have been invited to join as a <strong>${roleName}</strong>.</p>
          <p>This invitation expires in 7 days.</p>
          <p style="margin: 30px 0;">
            <a href="${inviteUrl}"
               style="background-color: #f97316; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </body>
        </html>
      `,
    }

    // Mask email for logging
    const maskedEmail = email.substring(0, 3) + '***@' + email.split('@')[1]
    logStructured('info', 'Sending invitation email', { requestId, recipientMasked: maskedEmail, role })

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const emailResponseBody = await emailResponse.text()
    const emailSent = emailResponse.ok

    // Parse the Resend error if email failed
    let emailError: string | undefined
    if (!emailSent) {
      try {
        const errorData = JSON.parse(emailResponseBody)
        // Resend error format: { statusCode: 403, message: "...", name: "validation_error" }
        emailError = errorData.message || `Email service error (${emailResponse.status})`
      } catch {
        emailError = `Email service error (${emailResponse.status})`
      }
      logStructured('error', 'Email sending failed', { requestId, status: emailResponse.status, error: emailError })
    } else {
      logStructured('info', 'Email sent successfully', { requestId, invitationId: invitation.id })
    }

    logStructured('info', 'Request completed', { requestId, status: 200, emailSent })
    return new Response(
      JSON.stringify({
        success: true,
        invitationId: invitation.id,
        emailSent,
        emailError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    logStructured('error', 'Internal server error', { requestId, error: error instanceof Error ? error.message : 'Unknown' })
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
