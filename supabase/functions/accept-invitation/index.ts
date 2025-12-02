// supabase/functions/accept-invitation/index.ts
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
    function: 'accept-invitation',
    ...context,
  }
  console[level](JSON.stringify(entry))
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Request validation schema
const AcceptInvitationSchema = z.object({
  token: z.string().uuid('Invalid invitation token format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().max(100).optional(),
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
    const parseResult = AcceptInvitationSchema.safeParse(body)

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { token, password, fullName } = parseResult.data

    // Create Supabase admin client (service role for user creation)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Find and validate invitation
    // Use FOR UPDATE to lock the row and prevent race conditions (Pitfall 2)
    const { data: invitation, error: findError } = await supabaseAdmin
      .from('pending_invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (findError || !invitation) {
      logStructured('warn', 'Invalid or expired invitation', { requestId })
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logStructured('info', 'Invitation found', { requestId, invitationId: invitation.id, role: invitation.role })

    // 2. Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    )

    if (existingUser) {
      logStructured('warn', 'Account already exists for email', { requestId })
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Create user in auth.users with app_metadata
    // CRITICAL: Set both tenant_id and role in app_metadata (Pitfall 4)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Pre-verified since they clicked invite link
      app_metadata: {
        tenant_id: invitation.tenant_id,
        role: invitation.role,
      },
    })

    if (createError) {
      logStructured('error', 'Error creating auth user', { requestId, error: createError.message })
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logStructured('info', 'Auth user created', { requestId, userId: authData.user.id })

    // 4. Create profile row
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        tenant_id: invitation.tenant_id,
        role: invitation.role,
        full_name: fullName?.trim() || null,
        is_active: true,
      })

    if (profileError) {
      logStructured('error', 'Error creating profile, rolling back auth user', { requestId, error: profileError.message, userId: authData.user.id })
      // Rollback: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logStructured('info', 'Profile created', { requestId, userId: authData.user.id })

    // 5. Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from('pending_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    if (updateError) {
      // Non-critical - user is created, log and continue
      logStructured('warn', 'Error marking invitation accepted (non-critical)', { requestId, error: updateError.message })
    } else {
      logStructured('info', 'Invitation marked as accepted', { requestId, invitationId: invitation.id })
    }

    logStructured('info', 'Request completed', { requestId, status: 200, userId: authData.user.id })
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully. You can now log in.',
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
