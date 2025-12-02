import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { ControlTest, StepResponse } from '@/types/rct'
import type { ControlTestRow } from '@/lib/supabase/types'
import { toast } from 'sonner'

function toControlTest(row: ControlTestRow): ControlTest {
  return {
    id: row.id,
    controlId: row.control_id,
    rowId: row.rct_row_id || '',
    testDate: row.test_date,
    result: row.result,
    effectiveness: row.effectiveness,
    testerName: row.tester_name ?? undefined,
    evidence: row.evidence ?? undefined,
    findings: row.findings ?? undefined,
    recommendations: row.recommendations ?? undefined,
    stepResponses: (row.step_responses as StepResponse[] | null) ?? undefined,
  }
}

export function useControlTests() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['controlTests', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('control_tests').select('*')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('test_date', { ascending: false })

      if (error) throw error
      return data.map(toControlTest)
    },
  })
}

export function useTestHistory(controlId: string) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['controlTests', 'history', controlId, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('control_tests').select('*').eq('control_id', controlId)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('test_date', { ascending: false })

      if (error) throw error
      return data.map(toControlTest)
    },
    enabled: !!controlId,
  })
}

export function useRecordTest() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (test: Omit<ControlTest, 'id'>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('control_tests')
        .insert({
          control_id: test.controlId,
          rct_row_id: test.rowId || null,
          test_date: test.testDate,
          result: test.result,
          effectiveness: test.effectiveness,
          tester_name: test.testerName || null,
          evidence: test.evidence || null,
          findings: test.findings || null,
          recommendations: test.recommendations || null,
          step_responses: test.stepResponses || null,
        })
        .select()
        .single()

      if (error) throw error
      return toControlTest(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['controlTests'] })
      queryClient.invalidateQueries({ queryKey: ['controlTests', 'history', data.controlId] })
      // Also invalidate controls to update lastTestDate
      queryClient.invalidateQueries({ queryKey: ['controls'] })
    },
  })
}
