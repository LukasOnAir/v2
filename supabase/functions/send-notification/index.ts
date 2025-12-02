// supabase/functions/send-notification/index.ts
// Triggered notification handler for approval and assignment events
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
    function: 'send-notification',
    ...context,
  }
  console[level](JSON.stringify(entry))
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Request validation schema
const NotificationSchema = z.object({
  type: z.enum(['approval-request', 'approval-result', 'test-assigned'], {
    errorMap: () => ({ message: 'Invalid notification type' }),
  }),
  recipientId: z.string().uuid('Invalid recipient ID format'),
  data: z.object({
    // For approval-request
    entityType: z.string().optional(),
    entityName: z.string().optional(),
    changeType: z.string().optional(),
    submitterName: z.string().optional(),
    // For approval-result
    result: z.enum(['approved', 'rejected']).optional(),
    reviewerName: z.string().optional(),
    rejectionReason: z.string().optional(),
    // For test-assigned
    controlName: z.string().optional(),
    dueDate: z.string().optional(),
  }).optional(),
})

// Notification types supported by this function
type NotificationType = 'approval-request' | 'approval-result' | 'test-assigned'

// Email notification preferences
interface EmailPreferences {
  test_reminders: boolean
  approval_notifications: boolean
}

// Map notification types to preference keys
const preferenceMap: Record<NotificationType, keyof EmailPreferences> = {
  'approval-request': 'approval_notifications',
  'approval-result': 'approval_notifications',
  'test-assigned': 'test_reminders',
}

interface NotificationRequest {
  type: NotificationType
  recipientId: string // User ID to send to
  data: {
    // For approval-request:
    entityType?: string
    entityName?: string
    changeType?: string
    submitterName?: string
    // For approval-result:
    result?: 'approved' | 'rejected'
    reviewerName?: string
    rejectionReason?: string
    // For test-assigned:
    controlName?: string
    dueDate?: string // ISO date string
  }
}

// Email templates matching existing invitation email style
function approvalRequestTemplate(data: {
  recipientName: string
  entityType: string
  entityName: string
  changeType: string
  submitterName: string
  appUrl: string
}): string {
  const changeTypeText = data.changeType === 'create' ? 'New' :
                         data.changeType === 'update' ? 'Updated' :
                         data.changeType === 'delete' ? 'Deleted' : data.changeType

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Approval Required</h2>
      <p>Hello ${data.recipientName},</p>
      <p>A change request requires your review:</p>
      <div style="background: #f4f4f5; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${changeTypeText} ${data.entityType}</p>
        <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${data.entityName}</p>
        <p style="margin: 0;"><strong>Submitted by:</strong> ${data.submitterName}</p>
      </div>
      <p style="margin: 30px 0;">
        <a href="${data.appUrl}/approval-queue"
           style="background-color: #f97316; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Review Change
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This change is pending until you approve or reject it.
      </p>
    </body>
    </html>
  `
}

function approvalResultTemplate(data: {
  recipientName: string
  entityName: string
  result: 'approved' | 'rejected'
  reviewerName: string
  rejectionReason?: string
  appUrl: string
}): string {
  const isApproved = data.result === 'approved'
  const statusColor = isApproved ? '#16a34a' : '#dc2626'
  const statusText = isApproved ? 'Approved' : 'Rejected'

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Change Request ${statusText}</h2>
      <p>Hello ${data.recipientName},</p>
      <p>Your change request has been reviewed:</p>
      <div style="background: #f4f4f5; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Entity:</strong> ${data.entityName}</p>
        <p style="margin: 0 0 8px 0;">
          <strong>Status:</strong>
          <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
        </p>
        <p style="margin: 0;"><strong>Reviewed by:</strong> ${data.reviewerName}</p>
        ${data.rejectionReason ? `
        <p style="margin: 12px 0 0 0; padding-top: 12px; border-top: 1px solid #e5e5e5;">
          <strong>Reason:</strong> ${data.rejectionReason}
        </p>
        ` : ''}
      </div>
      ${isApproved ? `
      <p style="color: #666; font-size: 14px;">
        Your change has been applied to the system.
      </p>
      ` : `
      <p style="color: #666; font-size: 14px;">
        You may edit and resubmit your change for review.
      </p>
      `}
    </body>
    </html>
  `
}

function testAssignedTemplate(data: {
  recipientName: string
  controlName: string
  dueDate: string
  appUrl: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Control Test Assigned</h2>
      <p>Hello ${data.recipientName},</p>
      <p>You have been assigned to test the following control:</p>
      <div style="background: #f4f4f5; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Control:</strong> ${data.controlName}</p>
        <p style="margin: 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
      </div>
      <p style="margin: 30px 0;">
        <a href="${data.appUrl}/tester"
           style="background-color: #f97316; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Tester Dashboard
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Please complete the test by the due date.
      </p>
    </body>
    </html>
  `
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  logStructured('info', 'Function invoked', { requestId, method: req.method })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const parseResult = NotificationSchema.safeParse(body)

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { type, recipientId, data } = parseResult.data

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

    // Create Supabase client with user's JWT (for authentication verification)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify caller is authenticated
    const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser(jwt)
    if (callerError || !caller) {
      logStructured('error', 'Authentication failed', { requestId, error: callerError?.message || 'Unknown' })
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: callerError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logStructured('info', 'Caller authenticated', { requestId, userId: caller.id })

    // Create admin client to look up recipient email
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Look up recipient email via admin API
    const { data: { user: recipient }, error: recipientError } = await supabaseAdmin.auth.admin.getUserById(recipientId)
    if (recipientError || !recipient?.email) {
      logStructured('warn', 'Recipient lookup failed', { requestId, recipientId, error: recipientError?.message || 'No email' })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Recipient not found or has no email',
          emailSent: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get recipient's profile for personalization and email preferences
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email_preferences')
      .eq('id', recipientId)
      .single()

    const recipientName = profile?.full_name || 'User'
    const recipientEmail = recipient.email
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'

    // Mask email for logging (first 3 chars + ***@domain)
    const maskedEmail = recipientEmail.substring(0, 3) + '***@' + recipientEmail.split('@')[1]
    logStructured('info', 'Preparing notification', { requestId, type, recipientMasked: maskedEmail })

    // Check if user has opted out of this notification type
    const preferenceKey = preferenceMap[type]
    const preferences: EmailPreferences = profile?.email_preferences ?? {
      test_reminders: true,
      approval_notifications: true,
    }

    if (preferences[preferenceKey] === false) {
      logStructured('info', 'User opted out of notification type', { requestId, type, preferenceKey })
      return new Response(
        JSON.stringify({
          success: true,
          emailSent: false,
          reason: `User has opted out of ${preferenceKey.replace('_', ' ')} notifications`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for RESEND_API_KEY - graceful degradation if not configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      logStructured('warn', 'RESEND_API_KEY not configured', { requestId })
      return new Response(
        JSON.stringify({
          success: true,
          emailSent: false,
          message: 'Notification logged but email service not configured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build email content based on notification type
    let subject: string
    let html: string

    switch (type) {
      case 'approval-request':
        subject = `Approval Required: ${data.entityName || 'Change Request'}`
        html = approvalRequestTemplate({
          recipientName,
          entityType: data.entityType || 'Item',
          entityName: data.entityName || 'Unknown',
          changeType: data.changeType || 'update',
          submitterName: data.submitterName || 'A user',
          appUrl,
        })
        break

      case 'approval-result':
        const resultText = data.result === 'approved' ? 'Approved' : 'Rejected'
        subject = `Change ${resultText}: ${data.entityName || 'Your Request'}`
        html = approvalResultTemplate({
          recipientName,
          entityName: data.entityName || 'Your request',
          result: data.result || 'rejected',
          reviewerName: data.reviewerName || 'A manager',
          rejectionReason: data.rejectionReason,
          appUrl,
        })
        break

      case 'test-assigned':
        subject = `Control Test Assigned: ${data.controlName || 'New Assignment'}`
        html = testAssignedTemplate({
          recipientName,
          controlName: data.controlName || 'Unknown Control',
          dueDate: data.dueDate || 'Not specified',
          appUrl,
        })
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown notification type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Send email via Resend
    const emailPayload = {
      from: Deno.env.get('EMAIL_FROM') || 'RiskLytix <onboarding@resend.dev>',
      to: [recipientEmail],
      subject,
      html,
    }

    logStructured('info', 'Sending email via Resend', { requestId, type })

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
        emailError = errorData.message || `Email service error (${emailResponse.status})`
      } catch {
        emailError = `Email service error (${emailResponse.status})`
      }
      logStructured('error', 'Email sending failed', { requestId, status: emailResponse.status, error: emailError })
    } else {
      logStructured('info', 'Email sent successfully', { requestId, type })
    }

    logStructured('info', 'Request completed', { requestId, status: 200, emailSent })
    return new Response(
      JSON.stringify({
        success: true,
        type,
        recipientId,
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
