/**
 * Database type definitions for Supabase.
 *
 * These types are generated from the database schema.
 * To regenerate after schema changes:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
 *
 * Based on migrations:
 * - 00001_tenants.sql
 * - 00002_rls_helper_functions.sql
 * - 00003_profiles.sql
 * - 00004_audit_log.sql
 * - 00005_auth_events.sql
 * - 00006_app_user_role.sql
 * - 00013_taxonomy_nodes.sql
 * - 00014_taxonomy_weights.sql
 * - 00015_controls.sql
 * - 00016_control_links.sql
 * - 00017_rct_rows.sql
 * - 00018_control_tests.sql
 * - 00019_remediation_plans.sql
 * - 00021_tickets.sql
 * - 00022_comments.sql
 * - 00023_pending_changes.sql
 * - 00020_custom_columns.sql
 * - 00025_score_labels.sql
 * - 00030_feature_flags.sql
 * - 00031_super_admin_and_global_flags.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'director' | 'manager' | 'risk-manager' | 'control-owner' | 'control-tester'

export type ChangeType = 'create' | 'update' | 'delete'

export type AuthEventType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'signup'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'email_verified'

export type TaxonomyType = 'risk' | 'process'

export type ControlType =
  | 'Preventative'
  | 'Detective'
  | 'Corrective'
  | 'Directive'
  | 'Deterrent'
  | 'Compensating'
  | 'Acceptance'
  | 'Tolerance'
  | 'Manual'
  | 'Automated'

export type TestFrequency = 'monthly' | 'quarterly' | 'annually' | 'as-needed'

export type TestResult = 'pass' | 'fail' | 'partial' | 'not-tested'

export type RemediationStatus = 'open' | 'in-progress' | 'resolved' | 'closed'

export type TicketStatus = 'todo' | 'in-progress' | 'review' | 'done'

export type TicketCategory = 'maintenance' | 'periodic-review' | 'update-change' | 'other'

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'

export type TicketEntityType = 'control' | 'risk' | 'process' | 'rctRow' | 'remediationPlan'

export type CommentableEntityType = 'risk' | 'process' | 'control' | 'rctRow'

export type PendingChangeEntityType = 'control' | 'risk' | 'process'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type ScoreLabelType = 'probability' | 'impact'

export type CustomColumnType = 'text' | 'number' | 'dropdown' | 'date' | 'formula'

export type KnowledgeBaseCategory = 'testing-procedure' | 'best-practice' | 'policy' | 'template' | 'reference'

/**
 * Action item within a remediation plan
 */
export interface ActionItem {
  id: string
  description: string
  completed: boolean
  completedDate?: string
}

/**
 * Ticket recurrence configuration
 */
export interface TicketRecurrence {
  interval: 'monthly' | 'quarterly' | 'annually' | 'custom'
  customDays?: number
  nextDue: string
}

/**
 * Email notification preferences for users
 */
export interface EmailPreferences {
  test_reminders: boolean
  approval_notifications: boolean
}

/**
 * Per-user feature visibility overrides
 * Keys are feature_key strings, values are boolean (true=show, false=hide)
 * If not set, falls back to global feature_flags setting
 */
export interface FeatureOverrides {
  [key: string]: boolean
}

/**
 * Global feature flag row (tenant-agnostic, super-admin controlled)
 */
export interface GlobalFeatureFlagRow {
  id: string
  feature_key: string
  enabled: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string | null  // null for super-admins
          full_name: string | null
          role: UserRole
          is_active: boolean
          is_super_admin: boolean
          email_preferences: EmailPreferences | null
          feature_overrides: FeatureOverrides | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null  // null for super-admins
          full_name?: string | null
          role?: UserRole
          is_active?: boolean
          is_super_admin?: boolean
          email_preferences?: EmailPreferences | null
          feature_overrides?: FeatureOverrides | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          full_name?: string | null
          role?: UserRole
          is_active?: boolean
          is_super_admin?: boolean
          email_preferences?: EmailPreferences | null
          feature_overrides?: FeatureOverrides | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          tenant_id: string
          entity_type: string
          entity_id: string | null
          entity_name: string | null
          change_type: ChangeType
          old_data: Json | null
          new_data: Json | null
          user_id: string | null
          user_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          entity_type: string
          entity_id?: string | null
          entity_name?: string | null
          change_type: ChangeType
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          user_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          entity_type?: string
          entity_id?: string | null
          entity_name?: string | null
          change_type?: ChangeType
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          user_email?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      auth_events: {
        Row: {
          id: string
          tenant_id: string | null
          user_id: string | null
          event_type: AuthEventType
          email: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          user_id?: string | null
          event_type: AuthEventType
          email?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          user_id?: string | null
          event_type?: AuthEventType
          email?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'auth_events_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      taxonomy_nodes: {
        Row: {
          id: string
          tenant_id: string
          type: TaxonomyType
          parent_id: string | null
          name: string
          description: string
          hierarchical_id: string
          path: string[]
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: TaxonomyType
          parent_id?: string | null
          name: string
          description?: string
          hierarchical_id?: string
          path?: string[]
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: TaxonomyType
          parent_id?: string | null
          name?: string
          description?: string
          hierarchical_id?: string
          path?: string[]
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'taxonomy_nodes_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'taxonomy_nodes_parent_id_fkey'
            columns: ['parent_id']
            referencedRelation: 'taxonomy_nodes'
            referencedColumns: ['id']
          }
        ]
      }
      taxonomy_weights: {
        Row: {
          id: string
          tenant_id: string
          type: TaxonomyType
          node_id: string | null
          level: number | null
          weight: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: TaxonomyType
          node_id?: string | null
          level?: number | null
          weight?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: TaxonomyType
          node_id?: string | null
          level?: number | null
          weight?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'taxonomy_weights_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'taxonomy_weights_node_id_fkey'
            columns: ['node_id']
            referencedRelation: 'taxonomy_nodes'
            referencedColumns: ['id']
          }
        ]
      }
      controls: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          control_type: ControlType | null
          net_probability: number | null
          net_impact: number | null
          net_score: number | null
          test_frequency: TestFrequency | null
          next_test_date: string | null
          last_test_date: string | null
          test_procedure: string | null
          test_steps: Json | null
          assigned_tester_id: string | null
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          control_type?: ControlType | null
          net_probability?: number | null
          net_impact?: number | null
          test_frequency?: TestFrequency | null
          next_test_date?: string | null
          last_test_date?: string | null
          test_procedure?: string | null
          test_steps?: Json | null
          assigned_tester_id?: string | null
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          control_type?: ControlType | null
          net_probability?: number | null
          net_impact?: number | null
          test_frequency?: TestFrequency | null
          next_test_date?: string | null
          last_test_date?: string | null
          test_procedure?: string | null
          test_steps?: Json | null
          assigned_tester_id?: string | null
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'controls_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'controls_assigned_tester_id_fkey'
            columns: ['assigned_tester_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      control_links: {
        Row: {
          id: string
          tenant_id: string
          control_id: string
          rct_row_id: string
          net_probability: number | null
          net_impact: number | null
          net_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          control_id: string
          rct_row_id: string
          net_probability?: number | null
          net_impact?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          control_id?: string
          rct_row_id?: string
          net_probability?: number | null
          net_impact?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'control_links_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'control_links_control_id_fkey'
            columns: ['control_id']
            referencedRelation: 'controls'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_control_links_rct_row'
            columns: ['rct_row_id']
            referencedRelation: 'rct_rows'
            referencedColumns: ['id']
          }
        ]
      }
      rct_rows: {
        Row: {
          id: string
          tenant_id: string
          row_id: string
          risk_id: string
          process_id: string
          gross_probability: number | null
          gross_impact: number | null
          gross_score: number | null
          gross_probability_comment: string | null
          gross_impact_comment: string | null
          risk_appetite: number
          within_appetite: number | null
          custom_values: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          row_id: string
          risk_id: string
          process_id: string
          gross_probability?: number | null
          gross_impact?: number | null
          gross_probability_comment?: string | null
          gross_impact_comment?: string | null
          risk_appetite?: number
          custom_values?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          row_id?: string
          risk_id?: string
          process_id?: string
          gross_probability?: number | null
          gross_impact?: number | null
          gross_probability_comment?: string | null
          gross_impact_comment?: string | null
          risk_appetite?: number
          custom_values?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rct_rows_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rct_rows_risk_id_fkey'
            columns: ['risk_id']
            referencedRelation: 'taxonomy_nodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rct_rows_process_id_fkey'
            columns: ['process_id']
            referencedRelation: 'taxonomy_nodes'
            referencedColumns: ['id']
          }
        ]
      }
      control_tests: {
        Row: {
          id: string
          tenant_id: string
          control_id: string
          rct_row_id: string | null
          tester_id: string | null
          tester_name: string | null
          test_date: string
          result: TestResult
          effectiveness: number | null
          evidence: string | null
          findings: string | null
          recommendations: string | null
          step_responses: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          control_id: string
          rct_row_id?: string | null
          tester_id?: string | null
          tester_name?: string | null
          test_date: string
          result: TestResult
          effectiveness?: number | null
          evidence?: string | null
          findings?: string | null
          recommendations?: string | null
          step_responses?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          control_id?: string
          rct_row_id?: string | null
          tester_id?: string | null
          tester_name?: string | null
          test_date?: string
          result?: TestResult
          effectiveness?: number | null
          evidence?: string | null
          findings?: string | null
          recommendations?: string | null
          step_responses?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'control_tests_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'control_tests_control_id_fkey'
            columns: ['control_id']
            referencedRelation: 'controls'
            referencedColumns: ['id']
          }
        ]
      }
      remediation_plans: {
        Row: {
          id: string
          tenant_id: string
          control_test_id: string
          control_id: string
          rct_row_id: string | null
          title: string
          description: string | null
          owner: string
          deadline: string
          status: RemediationStatus
          priority: TicketPriority
          action_items: ActionItem[]
          notes: string | null
          created_date: string
          resolved_date: string | null
          closed_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          control_test_id: string
          control_id: string
          rct_row_id?: string | null
          title: string
          description?: string | null
          owner: string
          deadline: string
          status?: RemediationStatus
          priority: TicketPriority
          action_items?: ActionItem[]
          notes?: string | null
          created_date?: string
          resolved_date?: string | null
          closed_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          control_test_id?: string
          control_id?: string
          rct_row_id?: string | null
          title?: string
          description?: string | null
          owner?: string
          deadline?: string
          status?: RemediationStatus
          priority?: TicketPriority
          action_items?: ActionItem[]
          notes?: string | null
          created_date?: string
          resolved_date?: string | null
          closed_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'remediation_plans_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'remediation_plans_control_test_id_fkey'
            columns: ['control_test_id']
            referencedRelation: 'control_tests'
            referencedColumns: ['id']
          }
        ]
      }
      tickets: {
        Row: {
          id: string
          tenant_id: string
          title: string
          description: string | null
          category: TicketCategory
          status: TicketStatus
          priority: TicketPriority
          owner: string
          deadline: string
          notes: string | null
          recurrence: TicketRecurrence | null
          done_date: string | null
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          title: string
          description?: string | null
          category: TicketCategory
          status?: TicketStatus
          priority: TicketPriority
          owner: string
          deadline: string
          notes?: string | null
          recurrence?: TicketRecurrence | null
          done_date?: string | null
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          description?: string | null
          category?: TicketCategory
          status?: TicketStatus
          priority?: TicketPriority
          owner?: string
          deadline?: string
          notes?: string | null
          recurrence?: TicketRecurrence | null
          done_date?: string | null
          archived?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tickets_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      ticket_entity_links: {
        Row: {
          id: string
          tenant_id: string
          ticket_id: string
          entity_type: TicketEntityType
          entity_id: string
          entity_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          ticket_id: string
          entity_type: TicketEntityType
          entity_id: string
          entity_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          ticket_id?: string
          entity_type?: TicketEntityType
          entity_id?: string
          entity_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_entity_links_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_entity_links_ticket_id_fkey'
            columns: ['ticket_id']
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          }
        ]
      }
      comments: {
        Row: {
          id: string
          tenant_id: string
          entity_type: CommentableEntityType
          entity_id: string
          parent_id: string | null
          content: string
          author_id: string | null
          author_role: string
          is_edited: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string
          entity_type: CommentableEntityType
          entity_id: string
          parent_id?: string | null
          content: string
          author_id?: string | null
          author_role: string
          is_edited?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          entity_type?: CommentableEntityType
          entity_id?: string
          parent_id?: string | null
          content?: string
          author_id?: string | null
          author_role?: string
          is_edited?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'comments_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_parent_id_fkey'
            columns: ['parent_id']
            referencedRelation: 'comments'
            referencedColumns: ['id']
          }
        ]
      }
      pending_changes: {
        Row: {
          id: string
          tenant_id: string
          entity_type: PendingChangeEntityType
          entity_id: string
          entity_name: string
          change_type: ChangeType
          current_values: Json
          proposed_values: Json
          status: ApprovalStatus
          submitted_by: string
          submitted_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          version: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          entity_type: PendingChangeEntityType
          entity_id: string
          entity_name: string
          change_type: ChangeType
          current_values?: Json
          proposed_values: Json
          status?: ApprovalStatus
          submitted_by: string
          submitted_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          version?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          entity_type?: PendingChangeEntityType
          entity_id?: string
          entity_name?: string
          change_type?: ChangeType
          current_values?: Json
          proposed_values?: Json
          status?: ApprovalStatus
          submitted_by?: string
          submitted_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          version?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pending_changes_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      score_labels: {
        Row: {
          id: string
          tenant_id: string
          type: ScoreLabelType
          score: number
          label: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          type: ScoreLabelType
          score: number
          label: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: ScoreLabelType
          score?: number
          label?: string
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'score_labels_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      custom_columns: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: CustomColumnType
          options: string[] | null
          formula: string | null
          width: number | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          name: string
          type: CustomColumnType
          options?: string[] | null
          formula?: string | null
          width?: number | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: CustomColumnType
          options?: string[] | null
          formula?: string | null
          width?: number | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'custom_columns_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      feature_flags: {
        Row: {
          id: string
          tenant_id: string
          feature_key: string
          enabled: boolean
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          feature_key: string
          enabled?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          feature_key?: string
          enabled?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feature_flags_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      global_feature_flags: {
        Row: {
          id: string
          feature_key: string
          enabled: boolean
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          feature_key: string
          enabled?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          feature_key?: string
          enabled?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          id: string
          tenant_id: string
          title: string
          content: string
          category: KnowledgeBaseCategory
          tags: string[]
          author: string
          related_control_types: string[]
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string
          title: string
          content: string
          category: KnowledgeBaseCategory
          tags?: string[]
          author: string
          related_control_types?: string[]
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          content?: string
          category?: KnowledgeBaseCategory
          tags?: string[]
          author?: string
          related_control_types?: string[]
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'knowledge_base_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      tenant_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      user_role: {
        Args: Record<string, never>
        Returns: string | null
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      change_type: ChangeType
      auth_event_type: AuthEventType
      taxonomy_type: TaxonomyType
      control_type: ControlType
      test_frequency: TestFrequency
    }
  }
}

/**
 * Pending invitation for user to join tenant
 */
export interface PendingInvitation {
  id: string
  tenant_id: string
  email: string
  role: 'manager' | 'risk-manager' | 'control-owner' | 'control-tester'
  token: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

/**
 * Request payload for sending invitation
 */
export interface SendInvitationRequest {
  email: string
  role: 'manager' | 'risk-manager' | 'control-owner' | 'control-tester'
}

/**
 * Response from send-invitation Edge Function
 */
export interface SendInvitationResponse {
  success: boolean
  invitationId?: string
  emailSent?: boolean
  emailError?: string
  error?: string
  message?: string
}

/**
 * Request payload for accepting invitation
 */
export interface AcceptInvitationRequest {
  token: string
  password: string
  fullName?: string
}

/**
 * Response from accept-invitation Edge Function
 */
export interface AcceptInvitationResponse {
  success: boolean
  message?: string
  error?: string
}

// Convenience type aliases for common use cases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Table row types
export type Tenant = Tables<'tenants'>
export type Profile = Tables<'profiles'>
export type AuditLog = Tables<'audit_log'>
export type AuthEvent = Tables<'auth_events'>
export type TaxonomyNode = Tables<'taxonomy_nodes'>
export type TaxonomyWeight = Tables<'taxonomy_weights'>
export type Control = Tables<'controls'>
export type ControlLink = Tables<'control_links'>
export type RctRow = Tables<'rct_rows'>

// Insert types
export type TenantInsert = Insertable<'tenants'>
export type ProfileInsert = Insertable<'profiles'>
export type AuditLogInsert = Insertable<'audit_log'>
export type AuthEventInsert = Insertable<'auth_events'>
export type TaxonomyNodeInsert = Insertable<'taxonomy_nodes'>
export type TaxonomyWeightInsert = Insertable<'taxonomy_weights'>
export type ControlInsert = Insertable<'controls'>
export type ControlLinkInsert = Insertable<'control_links'>
export type RctRowInsert = Insertable<'rct_rows'>

// Update types
export type TenantUpdate = Updatable<'tenants'>
export type ProfileUpdate = Updatable<'profiles'>
export type AuditLogUpdate = Updatable<'audit_log'>
export type AuthEventUpdate = Updatable<'auth_events'>
export type TaxonomyNodeUpdate = Updatable<'taxonomy_nodes'>
export type TaxonomyWeightUpdate = Updatable<'taxonomy_weights'>
export type ControlUpdate = Updatable<'controls'>
export type ControlLinkUpdate = Updatable<'control_links'>
export type RctRowUpdate = Updatable<'rct_rows'>
export type ControlTestUpdate = Updatable<'control_tests'>
export type RemediationPlanUpdate = Updatable<'remediation_plans'>
export type TicketUpdate = Updatable<'tickets'>
export type TicketEntityLinkUpdate = Updatable<'ticket_entity_links'>
export type CommentUpdate = Updatable<'comments'>
export type PendingChangeUpdate = Updatable<'pending_changes'>
export type ScoreLabelUpdate = Updatable<'score_labels'>

// Additional table row types
export type ControlTestRow = Tables<'control_tests'>
export type RemediationPlanRow = Tables<'remediation_plans'>
export type TicketRow = Tables<'tickets'>
export type TicketEntityLinkRow = Tables<'ticket_entity_links'>
export type CommentRow = Tables<'comments'>
export type PendingChangeRow = Tables<'pending_changes'>
export type ScoreLabelRow = Tables<'score_labels'>
export type CustomColumnRow = Tables<'custom_columns'>

// Additional insert types
export type ControlTestInsert = Insertable<'control_tests'>
export type RemediationPlanInsert = Insertable<'remediation_plans'>
export type TicketInsert = Insertable<'tickets'>
export type TicketEntityLinkInsert = Insertable<'ticket_entity_links'>
export type CommentInsert = Insertable<'comments'>
export type PendingChangeInsert = Insertable<'pending_changes'>
export type ScoreLabelInsert = Insertable<'score_labels'>
export type CustomColumnInsert = Insertable<'custom_columns'>
export type CustomColumnUpdate = Updatable<'custom_columns'>

export type KnowledgeBaseRow = Tables<'knowledge_base'>
export type KnowledgeBaseInsert = Insertable<'knowledge_base'>
export type KnowledgeBaseUpdate = Updatable<'knowledge_base'>

export type FeatureFlagRow = Tables<'feature_flags'>
export type FeatureFlagInsert = Insertable<'feature_flags'>
export type FeatureFlagUpdate = Updatable<'feature_flags'>
