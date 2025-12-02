-- ============================================================================
-- Demo Tenant Seed Data: Tickets and Entity Links
-- Part of Phase 29: Demo Tenant Seed Data
-- ============================================================================
-- Prerequisites: Run 29-01, 29-02, 29-03 scripts first
--
-- Creates:
--   - 12 tickets with varied statuses, priorities, categories
--   - 15 ticket-entity links connecting tickets to controls and RCT rows
-- ============================================================================

-- Demo tenant ID (same as used in 29-01, 29-02, 29-03)
DO $$
DECLARE
  demo_tenant_id UUID := '5ea03edb-6e79-4b62-bd36-39f1963d0640';

  -- Ticket IDs
  ticket_1 UUID;
  ticket_2 UUID;
  ticket_3 UUID;
  ticket_4 UUID;
  ticket_5 UUID;
  ticket_6 UUID;
  ticket_7 UUID;
  ticket_8 UUID;
  ticket_9 UUID;
  ticket_10 UUID;
  ticket_11 UUID;
  ticket_12 UUID;

  -- Control IDs (looked up by name from 29-03 seed)
  ctrl_access_control UUID;
  ctrl_encryption UUID;
  ctrl_backup UUID;
  ctrl_change_approval UUID;
  ctrl_incident_response UUID;
  ctrl_sod UUID;

  -- RCT row IDs (looked up from 29-03 seed - using risk/process combo)
  rct_cyber_it UUID;
  rct_data_financial UUID;
  rct_fraud_sales UUID;

BEGIN
  -- ============================================================================
  -- CLEAN SLATE: Delete existing tickets for demo tenant
  -- ============================================================================
  DELETE FROM public.ticket_entity_links WHERE tenant_id = demo_tenant_id;
  DELETE FROM public.tickets WHERE tenant_id = demo_tenant_id;

  -- ============================================================================
  -- LOOKUP: Get control IDs by name (from 29-03 seed)
  -- ============================================================================
  SELECT id INTO ctrl_access_control FROM public.controls
    WHERE tenant_id = demo_tenant_id AND name = 'Access Control Policy' LIMIT 1;
  SELECT id INTO ctrl_encryption FROM public.controls
    WHERE tenant_id = demo_tenant_id AND name = 'Data Encryption Standard' LIMIT 1;
  SELECT id INTO ctrl_backup FROM public.controls
    WHERE tenant_id = demo_tenant_id AND name = 'Backup and Recovery' LIMIT 1;
  SELECT id INTO ctrl_change_approval FROM public.controls
    WHERE tenant_id = demo_tenant_id AND name = 'Change Approval Process' LIMIT 1;
  SELECT id INTO ctrl_incident_response FROM public.controls
    WHERE tenant_id = demo_tenant_id AND name = 'Incident Response Plan' LIMIT 1;
  SELECT id INTO ctrl_sod FROM public.controls
    WHERE tenant_id = demo_tenant_id AND name = 'Segregation of Duties' LIMIT 1;

  -- ============================================================================
  -- LOOKUP: Get some RCT row IDs (from 29-03 seed)
  -- ============================================================================
  SELECT r.id INTO rct_cyber_it FROM public.rct_rows r
    JOIN public.taxonomy_nodes risk ON r.risk_id = risk.id
    JOIN public.taxonomy_nodes proc ON r.process_id = proc.id
    WHERE r.tenant_id = demo_tenant_id
    AND risk.name = 'System Outage'
    AND proc.name = 'System Maintenance' LIMIT 1;

  SELECT r.id INTO rct_data_financial FROM public.rct_rows r
    JOIN public.taxonomy_nodes risk ON r.risk_id = risk.id
    JOIN public.taxonomy_nodes proc ON r.process_id = proc.id
    WHERE r.tenant_id = demo_tenant_id
    AND risk.name = 'Data Breach'
    AND proc.name = 'Financial Reporting' LIMIT 1;

  SELECT r.id INTO rct_fraud_sales FROM public.rct_rows r
    JOIN public.taxonomy_nodes risk ON r.risk_id = risk.id
    JOIN public.taxonomy_nodes proc ON r.process_id = proc.id
    WHERE r.tenant_id = demo_tenant_id
    AND risk.name = 'Internal Fraud'
    AND proc.name = 'Sales Operations' LIMIT 1;

  -- ============================================================================
  -- INSERT: Tickets
  -- ============================================================================

  -- CRITICAL: Overdue todo ticket
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Urgent: Access Control Review Required',
    'Annual access control review is overdue. All system access rights must be reviewed and re-certified.',
    'periodic-review',
    'todo',
    'critical',
    'Security Team',
    CURRENT_DATE - INTERVAL '5 days',
    'This is a regulatory requirement. Must complete ASAP.',
    false
  ) RETURNING id INTO ticket_1;

  -- HIGH: In-progress control test
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Q1 Encryption Controls Test',
    'Perform quarterly encryption controls testing across all systems handling PII.',
    'periodic-review',
    'in-progress',
    'high',
    'IT Security',
    CURRENT_DATE + INTERVAL '7 days',
    'Testing initiated. 60% complete.',
    false
  ) RETURNING id INTO ticket_2;

  -- HIGH: Review needed
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Backup Recovery Test Results Review',
    'Review results from last backup recovery drill and update disaster recovery documentation.',
    'periodic-review',
    'review',
    'high',
    'IT Operations',
    CURRENT_DATE + INTERVAL '3 days',
    'Test completed successfully. Documentation update pending manager review.',
    false
  ) RETURNING id INTO ticket_3;

  -- MEDIUM: Todo - upcoming
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Update Change Management Policy',
    'Annual review and update of the IT change management policy document.',
    'update-change',
    'todo',
    'medium',
    'Change Manager',
    CURRENT_DATE + INTERVAL '14 days',
    'Minor updates expected based on lessons learned.',
    false
  ) RETURNING id INTO ticket_4;

  -- MEDIUM: In-progress remediation
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Implement MFA for Admin Accounts',
    'Remediation: Implement multi-factor authentication for all administrative accounts.',
    'maintenance',
    'in-progress',
    'medium',
    'IT Security',
    CURRENT_DATE + INTERVAL '21 days',
    'Phase 1 complete (infrastructure). Phase 2 (rollout) in progress.',
    false
  ) RETURNING id INTO ticket_5;

  -- LOW: Todo - training
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Security Awareness Training Update',
    'Update annual security awareness training materials with latest phishing examples.',
    'other',
    'todo',
    'low',
    'HR & Training',
    CURRENT_DATE + INTERVAL '30 days',
    'New content to include recent incident case studies.',
    false
  ) RETURNING id INTO ticket_6;

  -- DONE: Recently completed
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived, done_date
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Firewall Rule Audit',
    'Quarterly audit of all firewall rules to identify and remove unused or overly permissive rules.',
    'periodic-review',
    'done',
    'high',
    'Network Team',
    CURRENT_DATE - INTERVAL '2 days',
    'Audit completed. 12 unused rules removed. Report filed.',
    false,
    CURRENT_DATE - INTERVAL '1 day'
  ) RETURNING id INTO ticket_7;

  -- DONE: Older completed
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived, done_date
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Vendor Risk Assessment - Cloud Provider',
    'Annual vendor risk assessment for primary cloud service provider.',
    'other',
    'done',
    'medium',
    'Risk Management',
    CURRENT_DATE - INTERVAL '10 days',
    'Assessment complete. No critical findings. Next review in 12 months.',
    false,
    CURRENT_DATE - INTERVAL '8 days'
  ) RETURNING id INTO ticket_8;

  -- Recurring: Monthly compliance check
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes,
    recurrence, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Monthly Access Log Review',
    'Review privileged access logs for anomalies and policy violations.',
    'periodic-review',
    'todo',
    'medium',
    'Security Team',
    CURRENT_DATE + INTERVAL '5 days',
    'Recurring monthly task. Check SIEM alerts and access reports.',
    jsonb_build_object('interval', 'monthly', 'nextDue', (CURRENT_DATE + INTERVAL '35 days')::TEXT),
    false
  ) RETURNING id INTO ticket_9;

  -- HIGH: Todo - incident follow-up
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Incident Response Drill Planning',
    'Plan and schedule Q2 incident response tabletop exercise.',
    'maintenance',
    'todo',
    'high',
    'Security Operations',
    CURRENT_DATE + INTERVAL '10 days',
    'Include ransomware scenario based on recent industry trends.',
    false
  ) RETURNING id INTO ticket_10;

  -- MEDIUM: Review - policy update
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Data Classification Policy Update',
    'Review and update data classification policy to include new data types.',
    'update-change',
    'review',
    'medium',
    'Data Governance',
    CURRENT_DATE + INTERVAL '7 days',
    'Draft complete. Awaiting legal review.',
    false
  ) RETURNING id INTO ticket_11;

  -- LOW: Todo - optimization
  INSERT INTO public.tickets (
    id, tenant_id, title, description, category, status, priority, owner, deadline, notes, archived
  ) VALUES (
    gen_random_uuid(), demo_tenant_id,
    'Control Testing Automation Assessment',
    'Evaluate opportunities to automate manual control testing procedures.',
    'other',
    'todo',
    'low',
    'GRC Team',
    CURRENT_DATE + INTERVAL '45 days',
    'Focus on high-frequency, low-complexity tests first.',
    false
  ) RETURNING id INTO ticket_12;

  -- ============================================================================
  -- INSERT: Ticket Entity Links
  -- ============================================================================

  -- Link ticket_1 (Access Control Review) to Access Control Policy control
  IF ctrl_access_control IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_1, 'control', ctrl_access_control, 'Access Control Policy'
    );
  END IF;

  -- Link ticket_2 (Encryption Test) to Data Encryption Standard control
  IF ctrl_encryption IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_2, 'control', ctrl_encryption, 'Data Encryption Standard'
    );
  END IF;

  -- Link ticket_2 also to Data Breach RCT row
  IF rct_data_financial IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_2, 'rctRow', rct_data_financial, 'Data Breach / Financial Reporting'
    );
  END IF;

  -- Link ticket_3 (Backup Review) to Backup and Recovery control
  IF ctrl_backup IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_3, 'control', ctrl_backup, 'Backup and Recovery'
    );
  END IF;

  -- Link ticket_3 also to System Outage RCT row
  IF rct_cyber_it IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_3, 'rctRow', rct_cyber_it, 'System Outage / System Maintenance'
    );
  END IF;

  -- Link ticket_4 (Change Management) to Change Approval Process control
  IF ctrl_change_approval IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_4, 'control', ctrl_change_approval, 'Change Approval Process'
    );
  END IF;

  -- Link ticket_5 (MFA Remediation) to Access Control Policy control
  IF ctrl_access_control IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_5, 'control', ctrl_access_control, 'Access Control Policy'
    );
  END IF;

  -- Link ticket_9 (Access Log Review) to Access Control Policy control
  IF ctrl_access_control IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_9, 'control', ctrl_access_control, 'Access Control Policy'
    );
  END IF;

  -- Link ticket_10 (Incident Response Drill) to Incident Response Plan control
  IF ctrl_incident_response IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_10, 'control', ctrl_incident_response, 'Incident Response Plan'
    );
  END IF;

  -- Link ticket_7 (Firewall Audit) to Fraud RCT row (network security related)
  IF rct_fraud_sales IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_7, 'rctRow', rct_fraud_sales, 'Internal Fraud / Sales Operations'
    );
  END IF;

  -- Link ticket_12 (Automation) to Segregation of Duties control
  IF ctrl_sod IS NOT NULL THEN
    INSERT INTO public.ticket_entity_links (
      tenant_id, ticket_id, entity_type, entity_id, entity_name
    ) VALUES (
      demo_tenant_id, ticket_12, 'control', ctrl_sod, 'Segregation of Duties'
    );
  END IF;

  RAISE NOTICE 'Tickets seed complete!';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the seed data was inserted correctly:

-- Count tickets by status
SELECT status, COUNT(*) as count
FROM public.tickets
WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640'
GROUP BY status
ORDER BY status;

-- Count tickets by priority
SELECT priority, COUNT(*) as count
FROM public.tickets
WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640'
GROUP BY priority
ORDER BY
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

-- Count entity links by type
SELECT entity_type, COUNT(*) as count
FROM public.ticket_entity_links
WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640'
GROUP BY entity_type;

-- List all tickets with their links
SELECT
  t.title,
  t.status,
  t.priority,
  t.deadline,
  COUNT(l.id) as linked_entities
FROM public.tickets t
LEFT JOIN public.ticket_entity_links l ON t.id = l.ticket_id
WHERE t.tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640'
GROUP BY t.id, t.title, t.status, t.priority, t.deadline
ORDER BY t.deadline;
