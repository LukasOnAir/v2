import { useState, useEffect, useMemo, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, Trash2, ExternalLink, Loader2, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router'
import { nanoid } from 'nanoid'
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  RecurrenceInterval,
  TicketLinkEntityType,
  TicketEntityLink,
} from '@/types/tickets'
import { useTicketsStore } from '@/stores/ticketsStore'
import { useCreateTicket, useUpdateTicket, useDeleteTicket, useLinkTicketToEntity, useUnlinkTicketFromEntity } from '@/hooks/useTickets'
import { useControlsStore } from '@/stores/controlsStore'
import { useControls } from '@/hooks/useControls'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { useTaxonomy } from '@/hooks/useTaxonomy'
import { useRCTStore } from '@/stores/rctStore'
import { useRCTRows } from '@/hooks/useRCTRows'

interface TicketFormProps {
  isOpen: boolean
  onClose: () => void
  ticket?: Ticket
  /** Pre-link an entity when creating from context (e.g., from ControlPanel) */
  preselectedLink?: {
    entityType: TicketLinkEntityType
    entityId: string
    entityName: string
  }
  isDemoMode: boolean
  ticketEntityLinks: TicketEntityLink[]
}

/** Entity type options for linking */
const ENTITY_TYPE_OPTIONS: { value: TicketLinkEntityType; label: string }[] = [
  { value: 'control', label: 'Control' },
  { value: 'risk', label: 'Risk (Taxonomy)' },
  { value: 'process', label: 'Process (Taxonomy)' },
  { value: 'rctRow', label: 'Risk-Process Row (RCT)' },
  { value: 'other', label: 'Other' },
]

/** Category options */
const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'periodic-review', label: 'Periodic Review' },
  { value: 'update-change', label: 'Update/Change' },
  { value: 'other', label: 'Other' },
]

/** Priority options */
const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/** Recurrence options */
const RECURRENCE_OPTIONS: { value: RecurrenceInterval | 'none'; label: string }[] = [
  { value: 'none', label: 'No recurrence' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'custom', label: 'Custom days' },
]

/**
 * TicketForm - Create/edit ticket modal with all fields
 */
export function TicketForm({ isOpen, onClose, ticket, preselectedLink, isDemoMode, ticketEntityLinks }: TicketFormProps) {
  const navigate = useNavigate()

  // Store functions for demo mode
  const storeCreateTicket = useTicketsStore((state) => state.createTicket)
  const storeUpdateTicket = useTicketsStore((state) => state.updateTicket)
  const storeDeleteTicket = useTicketsStore((state) => state.deleteTicket)
  const storeLinkTicketToEntity = useTicketsStore((state) => state.linkTicketToEntity)
  const storeUnlinkTicketFromEntity = useTicketsStore((state) => state.unlinkTicketFromEntity)

  // Database mutations for authenticated mode
  const createMutation = useCreateTicket()
  const updateMutation = useUpdateTicket()
  const deleteMutation = useDeleteTicket()
  const linkMutation = useLinkTicketToEntity()
  const unlinkMutation = useUnlinkTicketFromEntity()

  // Data sources for entity linking
  const storeControls = useControlsStore((state) => state.controls)
  const { data: dbControls } = useControls()
  const controls = isDemoMode ? storeControls : (dbControls || [])

  const storeRiskTaxonomy = useTaxonomyStore((state) => state.risks)
  const storeProcessTaxonomy = useTaxonomyStore((state) => state.processes)
  const { data: dbRisks } = useTaxonomy('risk')
  const { data: dbProcesses } = useTaxonomy('process')
  const riskTaxonomy = isDemoMode ? storeRiskTaxonomy : (dbRisks || [])
  const processTaxonomy = isDemoMode ? storeProcessTaxonomy : (dbProcesses || [])

  const storeRctRows = useRCTStore((state) => state.rows)
  const { data: dbRctRows } = useRCTRows()
  const rctRows = isDemoMode ? storeRctRows : (dbRctRows || [])

  const isEditMode = !!ticket
  // Store ticket ID to avoid stale closure issues in handleSubmit
  const [ticketId] = useState<string | undefined>(ticket?.id)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('maintenance')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [owner, setOwner] = useState('')
  const [deadline, setDeadline] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceInterval | 'none'>('none')
  const [customDays, setCustomDays] = useState(30)
  const [notes, setNotes] = useState('')
  const [linkedEntities, setLinkedEntities] = useState<Array<{
    entityType: TicketLinkEntityType
    entityId: string
    entityName: string
  }>>([])
  const [selectedEntityType, setSelectedEntityType] = useState<TicketLinkEntityType>('control')
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false)
  const [entitySearchTerm, setEntitySearchTerm] = useState('')
  const [otherDescription, setOtherDescription] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    title?: string
    owner?: string
    deadline?: string
  }>({})

  // Initialize form on mount (parent forces remount via key when opening)
  useEffect(() => {
    if (ticket) {
      // Edit mode - populate from ticket and store
      setTitle(ticket.title)
      setDescription(ticket.description || '')
      setCategory(ticket.category)
      setPriority(ticket.priority)
      setOwner(ticket.owner)
      setDeadline(ticket.deadline)
      setRecurrence(ticket.recurrence?.interval || 'none')
      setCustomDays(ticket.recurrence?.customDays || 30)
      setNotes(ticket.notes || '')
      // Read links from passed prop
      const existingLinks = ticketEntityLinks.filter(l => l.ticketId === ticket.id)
      setLinkedEntities(existingLinks.map(l => ({
        entityType: l.entityType,
        entityId: l.entityId,
        entityName: l.entityName,
      })))
    } else {
      // Create mode - use defaults
      setTitle('')
      setDescription('')
      setCategory('maintenance')
      setPriority('medium')
      setOwner('')
      setDeadline(format(new Date(), 'yyyy-MM-dd'))
      setRecurrence('none')
      setCustomDays(30)
      setNotes('')
      setLinkedEntities(preselectedLink ? [preselectedLink] : [])
    }
    setDeleteConfirm(false)
    setSelectedEntityType('control')
    setIsEntityDropdownOpen(false)
    setEntitySearchTerm('')
    setValidationErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run on mount since parent handles remount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields and show error messages
    const errors: { title?: string; owner?: string; deadline?: string } = {}
    if (!title.trim()) {
      errors.title = 'Title is required'
    }
    if (!owner.trim()) {
      errors.owner = 'Owner is required'
    }
    if (!deadline) {
      errors.deadline = 'Deadline is required'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    // Clear any previous validation errors
    setValidationErrors({})

    setIsSaving(true)

    try {
      const ticketData = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        owner: owner.trim(),
        deadline,
        recurrence:
          recurrence !== 'none'
            ? {
                interval: recurrence,
                customDays: recurrence === 'custom' ? customDays : undefined,
                nextDue: deadline,
              }
            : undefined,
        notes: notes.trim() || undefined,
        status: ticket?.status || ('todo' as const),
      }

      if (isEditMode && ticketId) {
        // Update existing ticket
        if (isDemoMode) {
          storeUpdateTicket(ticketId, ticketData)
        } else {
          await updateMutation.mutateAsync({ id: ticketId, ...ticketData })
        }

        // Sync entity links
        const currentLinks = ticketEntityLinks.filter(l => l.ticketId === ticketId)

        // Find links to add (in linkedEntities but not in currentLinks)
        const toAdd = linkedEntities.filter(
          (le) => !currentLinks.some(
            (cl) => cl.entityType === le.entityType && cl.entityId === le.entityId
          )
        )

        // Find links to remove (in currentLinks but not in linkedEntities)
        const toRemove = currentLinks.filter(
          (cl) => !linkedEntities.some(
            (le) => le.entityType === cl.entityType && le.entityId === cl.entityId
          )
        )

        for (const link of toAdd) {
          if (isDemoMode) {
            storeLinkTicketToEntity(ticketId, link.entityType, link.entityId, link.entityName)
          } else {
            await linkMutation.mutateAsync({
              ticketId,
              entityType: link.entityType,
              entityId: link.entityId,
              entityName: link.entityName,
            })
          }
        }
        for (const link of toRemove) {
          if (isDemoMode) {
            storeUnlinkTicketFromEntity(ticketId, link.entityType, link.entityId)
          } else {
            await unlinkMutation.mutateAsync({
              ticketId,
              entityType: link.entityType,
              entityId: link.entityId,
            })
          }
        }
      } else {
        // Create new ticket
        let newId: string

        if (isDemoMode) {
          newId = storeCreateTicket(ticketData)
        } else {
          const result = await createMutation.mutateAsync(ticketData)
          newId = result.id
        }

        // Link to entities
        for (const link of linkedEntities) {
          if (isDemoMode) {
            storeLinkTicketToEntity(newId, link.entityType, link.entityId, link.entityName)
          } else {
            await linkMutation.mutateAsync({
              ticketId: newId,
              entityType: link.entityType,
              entityId: link.entityId,
              entityName: link.entityName,
            })
          }
        }
      }

      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!ticket) return

    if (deleteConfirm) {
      setIsSaving(true)
      try {
        if (isDemoMode) {
          storeDeleteTicket(ticket.id)
        } else {
          await deleteMutation.mutateAsync(ticket.id)
        }
        onClose()
      } finally {
        setIsSaving(false)
      }
    } else {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 3000)
    }
  }

  const handleAddEntity = (entityType: TicketLinkEntityType, entityId: string, entityName: string) => {
    const alreadyLinked = linkedEntities.some(
      (le) => le.entityType === entityType && le.entityId === entityId
    )
    if (!alreadyLinked) {
      setLinkedEntities([...linkedEntities, { entityType, entityId, entityName }])
    }
  }

  const handleRemoveEntity = (entityType: TicketLinkEntityType, entityId: string) => {
    setLinkedEntities(
      linkedEntities.filter(
        (le) => !(le.entityType === entityType && le.entityId === entityId)
      )
    )
  }

  // Flatten taxonomy items recursively
  const flattenTaxonomy = (items: typeof riskTaxonomy): Array<{ id: string; name: string; hierarchicalId: string }> => {
    const result: Array<{ id: string; name: string; hierarchicalId: string }> = []
    const traverse = (nodes: typeof riskTaxonomy) => {
      for (const node of nodes) {
        result.push({ id: node.id, name: node.name, hierarchicalId: node.hierarchicalId })
        if (node.children) traverse(node.children)
      }
    }
    traverse(items)
    return result
  }

  const flatRisks = useMemo(() => flattenTaxonomy(riskTaxonomy), [riskTaxonomy])
  const flatProcesses = useMemo(() => flattenTaxonomy(processTaxonomy), [processTaxonomy])

  // Build lookup maps for taxonomy names (needed when DB rows don't have denormalized names)
  const riskNameMap = useMemo(() => {
    const map = new Map<string, { hierarchicalId: string; name: string }>()
    for (const r of flatRisks) {
      map.set(r.id, { hierarchicalId: r.hierarchicalId, name: r.name })
    }
    return map
  }, [flatRisks])

  const processNameMap = useMemo(() => {
    const map = new Map<string, { hierarchicalId: string; name: string }>()
    for (const p of flatProcesses) {
      map.set(p.id, { hierarchicalId: p.hierarchicalId, name: p.name })
    }
    return map
  }, [flatProcesses])

  // Get available entities for selected type (not yet linked)
  const availableEntities = useMemo(() => {
    const linkedIds = linkedEntities
      .filter((le) => le.entityType === selectedEntityType)
      .map((le) => le.entityId)

    switch (selectedEntityType) {
      case 'control':
        return controls
          .filter((c) => !linkedIds.includes(c.id))
          .map((c) => ({ id: c.id, name: c.name }))
      case 'risk':
        return flatRisks
          .filter((r) => !linkedIds.includes(r.id))
          .map((r) => ({ id: r.id, name: `${r.hierarchicalId} - ${r.name}` }))
      case 'process':
        return flatProcesses
          .filter((p) => !linkedIds.includes(p.id))
          .map((p) => ({ id: p.id, name: `${p.hierarchicalId} - ${p.name}` }))
      case 'rctRow':
        return rctRows
          .filter((row) => !linkedIds.includes(row.id))
          .map((row) => {
            // In demo mode, rows have riskName/processName directly
            // In authenticated mode, we need to look them up from taxonomy
            const riskInfo = riskNameMap.get(row.riskId)
            const processInfo = processNameMap.get(row.processId)
            const riskLabel = riskInfo ? `${riskInfo.hierarchicalId} ${riskInfo.name}` : row.riskId
            const processLabel = processInfo ? `${processInfo.hierarchicalId} ${processInfo.name}` : row.processId
            return { id: row.id, name: `${riskLabel} × ${processLabel}` }
          })
      default:
        return []
    }
  }, [selectedEntityType, linkedEntities, controls, flatRisks, flatProcesses, rctRows, riskNameMap, processNameMap])

  // Filter available entities by search term
  const filteredEntities = useMemo(() => {
    if (!entitySearchTerm.trim()) return availableEntities
    const term = entitySearchTerm.toLowerCase()
    return availableEntities.filter((entity) => entity.name.toLowerCase().includes(term))
  }, [availableEntities, entitySearchTerm])

  // Handle "Jump to item" navigation
  const handleJumpToEntity = (entityType: TicketLinkEntityType, entityId: string) => {
    onClose()
    switch (entityType) {
      case 'control':
        navigate(`/controls?controlId=${entityId}`)
        break
      case 'risk':
        navigate(`/taxonomy?type=risk&id=${entityId}`)
        break
      case 'process':
        navigate(`/taxonomy?type=process&id=${entityId}`)
        break
      case 'rctRow':
        navigate(`/rct?rowId=${entityId}`)
        break
    }
  }

  // Get entity type label
  const getEntityTypeLabel = (type: TicketLinkEntityType): string => {
    return ENTITY_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] max-h-[85vh] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-surface-border shrink-0">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {isEditMode ? 'Edit Ticket' : 'Create Ticket'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                <X size={20} className="text-text-secondary" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    if (validationErrors.title) {
                      setValidationErrors((prev) => ({ ...prev, title: undefined }))
                    }
                  }}
                  placeholder="Enter ticket title"
                  required
                  className={`w-full px-3 py-2 bg-surface-base border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                    validationErrors.title ? 'border-red-500' : 'border-surface-border'
                  }`}
                />
                {validationErrors.title && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of the work"
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                />
              </div>

              {/* Category and Priority row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Owner and Deadline row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Owner <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => {
                      setOwner(e.target.value)
                      if (validationErrors.owner) {
                        setValidationErrors((prev) => ({ ...prev, owner: undefined }))
                      }
                    }}
                    placeholder="Person responsible"
                    required
                    className={`w-full px-3 py-2 bg-surface-base border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                      validationErrors.owner ? 'border-red-500' : 'border-surface-border'
                    }`}
                  />
                  {validationErrors.owner && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.owner}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Deadline <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => {
                      setDeadline(e.target.value)
                      if (validationErrors.deadline) {
                        setValidationErrors((prev) => ({ ...prev, deadline: undefined }))
                      }
                    }}
                    required
                    className={`w-full px-3 py-2 bg-surface-base border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                      validationErrors.deadline ? 'border-red-500' : 'border-surface-border'
                    }`}
                  />
                  {validationErrors.deadline && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.deadline}</p>
                  )}
                </div>
              </div>

              {/* Recurrence */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Recurrence
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) =>
                      setRecurrence(e.target.value as RecurrenceInterval | 'none')
                    }
                    className="w-full px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {recurrence === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Custom Days
                    </label>
                    <input
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value))}
                      min={1}
                      max={365}
                      className="w-full px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes"
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                />
              </div>

              {/* Linked Items */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Linked Items <span className="text-text-muted text-xs">(optional)</span>
                </label>

                {/* Current links */}
                {linkedEntities.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {linkedEntities.map((link) => (
                      <div
                        key={`${link.entityType}-${link.entityId}`}
                        className="flex items-center justify-between px-3 py-2 bg-surface-base border border-surface-border rounded-lg group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400 shrink-0">
                            {getEntityTypeLabel(link.entityType)}
                          </span>
                          <span className="text-sm text-text-primary truncate">
                            {link.entityName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {link.entityType !== 'other' && (
                            <button
                              type="button"
                              onClick={() => handleJumpToEntity(link.entityType, link.entityId)}
                              title="Jump to item"
                              className="p-1 text-text-muted hover:text-accent-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <ExternalLink size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveEntity(link.entityType, link.entityId)}
                            className="p-1 text-text-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add entity selector */}
                <div className="space-y-2">
                  {/* Entity type selector */}
                  <div className="flex gap-2">
                    {ENTITY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedEntityType(opt.value)
                          setIsEntityDropdownOpen(false)
                          setEntitySearchTerm('')
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          selectedEntityType === opt.value
                            ? 'bg-accent-600 text-white'
                            : 'bg-surface-base text-text-secondary hover:bg-surface-overlay'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Entity selector - text input for 'other', dropdown for rest */}
                  {selectedEntityType === 'other' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={otherDescription}
                        onChange={(e) => setOtherDescription(e.target.value)}
                        placeholder="Describe the linked item..."
                        className="w-full px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const description = otherDescription.trim()
                          if (description) {
                            handleAddEntity('other', nanoid(), description)
                            setOtherDescription('')
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Add Linked Item
                      </button>
                    </div>
                  ) : availableEntities.length > 0 ? (
                    <div
                      className="relative"
                      ref={dropdownRef}
                      onMouseLeave={() => {
                        setIsEntityDropdownOpen(false)
                        setEntitySearchTerm('')
                      }}
                    >
                      {/* Dropdown trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          const opening = !isEntityDropdownOpen
                          setIsEntityDropdownOpen(opening)
                          if (opening) {
                            setTimeout(() => searchInputRef.current?.focus(), 0)
                          } else {
                            setEntitySearchTerm('')
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-text-muted hover:border-accent-500 transition-colors"
                      >
                        <span>Select items to link...</span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${isEntityDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Dropdown menu - opens upward */}
                      {isEntityDropdownOpen && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-elevated border border-surface-border rounded-lg shadow-lg z-10 flex flex-col">
                          {/* Search input */}
                          <div className="p-2 border-b border-surface-border">
                            <input
                              ref={searchInputRef}
                              type="text"
                              value={entitySearchTerm}
                              onChange={(e) => setEntitySearchTerm(e.target.value)}
                              placeholder="Search..."
                              className="w-full px-2 py-1.5 text-sm bg-surface-base border border-surface-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {/* Results list */}
                          <div className="max-h-40 overflow-y-auto">
                            {filteredEntities.length > 0 ? (
                              filteredEntities.map((entity) => (
                                <button
                                  key={entity.id}
                                  type="button"
                                  onClick={() => {
                                    handleAddEntity(selectedEntityType, entity.id, entity.name)
                                    setEntitySearchTerm('')
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-surface-overlay group transition-colors"
                                >
                                  <span className="text-sm text-text-primary truncate pr-2">
                                    {entity.name}
                                  </span>
                                  <Plus
                                    size={16}
                                    className="shrink-0 text-accent-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  />
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-sm text-text-muted">No matches found</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted py-2">
                      No {getEntityTypeLabel(selectedEntityType).toLowerCase()} items available to link.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-surface-border shrink-0">
            <div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    deleteConfirm
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'text-red-400 hover:bg-red-500/20'
                  }`}
                >
                  {deleteMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  {deleteConfirm ? 'Confirm Delete' : 'Delete'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
