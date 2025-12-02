// api/cron/reminders.ts
// Vercel Cron handler for scheduled reminder processing (backup scheduler)
// Primary scheduler: pg_cron in Supabase
// This runs daily at 8 AM UTC as a redundancy measure

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = new Date().toISOString()
  console.log('=== Vercel Cron: reminders invoked ===')
  console.log('Start time:', startTime)

  // Verify cron secret to prevent unauthorized access
  // Vercel sets this header automatically for cron requests
  const cronSecret = req.headers['x-cron-secret'] || req.headers['authorization']

  // For Vercel cron jobs, we also check for the CRON_SECRET env var match
  // Vercel automatically authenticates cron requests, but we add extra security
  const expectedCronSecret = process.env.CRON_SECRET

  if (!expectedCronSecret) {
    console.error('CRON_SECRET environment variable not configured')
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'CRON_SECRET not configured',
    })
  }

  // Vercel cron requests come with proper authentication
  // We validate against our secret for extra security
  if (cronSecret !== expectedCronSecret && cronSecret !== `Bearer ${expectedCronSecret}`) {
    console.error('Unauthorized cron request - invalid secret')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  console.log('Cron request authenticated')

  // Get Supabase URL from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL

  if (!supabaseUrl) {
    console.error('Supabase URL not configured')
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Supabase URL not configured',
    })
  }

  try {
    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/process-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': expectedCronSecret,
      },
      body: JSON.stringify({
        trigger: 'vercel-cron',
        timestamp: startTime,
        source: 'vercel',
      }),
    })

    const result = await response.json()
    const endTime = new Date().toISOString()

    console.log('=== Vercel Cron: reminders complete ===')
    console.log('End time:', endTime)
    console.log('Edge Function response status:', response.status)
    console.log('Result:', JSON.stringify(result, null, 2))

    return res.status(200).json({
      source: 'vercel-cron',
      startTime,
      endTime,
      edgeFunctionStatus: response.status,
      result,
    })
  } catch (error) {
    console.error('Error calling process-reminders Edge Function:', error)
    return res.status(500).json({
      error: 'Failed to call Edge Function',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
