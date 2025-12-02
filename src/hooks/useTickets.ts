import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { Ticket, TicketStatus, TicketEntityLink, TicketLinkEntityType } from '@/types/tickets'
import type { TicketRow, TicketEntityLinkRow, TicketRecurrence } from '@/lib/supabase/types'
import { toast } from 'sonner'

function toTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    deadline: row.deadline,
    notes: row.notes ?? undefined,
    recurrence: row.recurrence as Ticket['recurrence'] | undefined,
    doneDate: row.done_date ?? undefined,
    archived: row.archived ?? false,
    createdDate: row.created_at,
  }
}

function toEntityLink(row: TicketEntityLinkRow): TicketEntityLink {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    entityType: row.entity_type as TicketLinkEntityType,
    entityId: row.entity_id,
    entityName: row.entity_name || '',
    createdAt: row.created_at,
  }
}

export function useTickets() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['tickets', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('tickets').select('*').eq('archived', false)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('deadline')

      if (error) throw error
      return data.map(toTicket)
    },
  })
}

export function useArchivedTickets() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['tickets', 'archived', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('tickets').select('*').eq('archived', true)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('done_date', { ascending: false })

      if (error) throw error
      return data.map(toTicket)
    },
  })
}

export function useTicketEntityLinks() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['ticketEntityLinks', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('ticket_entity_links').select('*')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query

      if (error) throw error
      return data.map(toEntityLink)
    },
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (ticket: Omit<Ticket, 'id' | 'createdDate' | 'archived'>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: ticket.title,
          description: ticket.description || null,
          category: ticket.category,
          status: ticket.status,
          priority: ticket.priority,
          owner: ticket.owner,
          deadline: ticket.deadline,
          notes: ticket.notes || null,
          recurrence: ticket.recurrence as TicketRecurrence || null,
        })
        .select()
        .single()

      if (error) throw error
      return toTicket(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Ticket>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const dbUpdates: Record<string, unknown> = {}

      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.category !== undefined) dbUpdates.category = updates.category
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority
      if (updates.owner !== undefined) dbUpdates.owner = updates.owner
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes
      if (updates.recurrence !== undefined) dbUpdates.recurrence = updates.recurrence
      if (updates.doneDate !== undefined) dbUpdates.done_date = updates.doneDate
      if (updates.archived !== undefined) dbUpdates.archived = updates.archived

      const { data, error } = await supabase
        .from('tickets')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toTicket(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useDeleteTicket() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketEntityLinks'] })
    },
  })
}

export function useLinkTicketToEntity() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ ticketId, entityType, entityId, entityName }: {
      ticketId: string
      entityType: TicketLinkEntityType
      entityId: string
      entityName: string
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('ticket_entity_links')
        .insert({
          ticket_id: ticketId,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
        })
        .select()
        .single()

      if (error) throw error
      return toEntityLink(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketEntityLinks'] })
    },
  })
}

export function useUnlinkTicketFromEntity() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ ticketId, entityType, entityId }: {
      ticketId: string
      entityType: TicketLinkEntityType
      entityId: string
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('ticket_entity_links')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketEntityLinks'] })
    },
  })
}
