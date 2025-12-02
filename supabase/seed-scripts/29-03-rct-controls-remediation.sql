-- Seed Script: 29-03-rct-controls-remediation.sql
-- Purpose: Create RCT rows, controls, control links, control tests, and remediation plans
-- Dependencies: 29-01-risk-taxonomy.sql, 29-02-process-taxonomy.sql (MUST run first!)
-- Tenant: 5ea03edb-6e79-4b62-bd36-39f1963d0640
-- Phase: 29-demo-tenant-seed-data
--
-- Creates:
--   28 RCT rows (risk-process pairings with gross scores, including 3 L5 depth test rows)
--   ~15 controls (various types: Preventative, Detective, Corrective)
--   ~30 control links (controls linked to RCT rows with net scores)
--   ~20 control tests (pass/partial/fail results)
--   ~5 remediation plans (for failed tests)
--
-- Execute in Supabase SQL Editor after running 29-01 and 29-02 scripts

DO $$
DECLARE
  v_tenant_id UUID := '5ea03edb-6e79-4b62-bd36-39f1963d0640';

  -- Risk taxonomy node IDs (lookup by name)
  risk_competition UUID;
  risk_market_disruption UUID;
  risk_process_failure UUID;
  risk_quality_control UUID;
  risk_key_person UUID;
  risk_skills_gap UUID;
  risk_supplier_failure UUID;
  risk_logistics_disruption UUID;
  risk_cash_flow UUID;
  risk_customer_default UUID;
  risk_currency UUID;
  risk_regulatory_change UUID;
  risk_reporting_compliance UUID;
  risk_contract_disputes UUID;
  risk_gdpr UUID;
  risk_data_breach UUID;
  risk_ransomware UUID;
  risk_phishing UUID;
  risk_system_outage UUID;
  risk_data_loss UUID;
  risk_data_corruption UUID;
  risk_equipment_failure UUID;
  risk_scaling UUID;
  risk_partnership UUID;
  risk_ip UUID;

  -- Process taxonomy node IDs (lookup by name)
  proc_business_dev UUID;
  proc_account_mgmt UUID;
  proc_quality_control UUID;
  proc_logistics UUID;
  proc_hr UUID;
  proc_training UUID;
  proc_it UUID;
  proc_cybersecurity UUID;
  proc_vendor_mgmt UUID;
  proc_finance UUID;
  proc_accounts_receivable UUID;
  proc_sourcing UUID;
  proc_regulatory_compliance UUID;
  proc_pricing UUID;
  proc_customer_service UUID;
  proc_strategic_planning UUID;
  proc_project_mgmt UUID;
  proc_financial_reporting UUID;
  proc_infrastructure_mgmt UUID;
  proc_manufacturing UUID;
  proc_risk_mgmt UUID;
  proc_application_mgmt UUID;
  proc_performance_mgmt UUID;
  proc_continuous_improvement UUID;
  proc_recruitment UUID;

  -- RCT row IDs
  rct_1 UUID;  -- Competition -> Business Development
  rct_2 UUID;  -- Quality Control -> Quality Control
  rct_3 UUID;  -- Supplier Failure -> Vendor Management
  rct_4 UUID;  -- Logistics Disruption -> Logistics & Distribution
  rct_5 UUID;  -- Key Person -> HR
  rct_6 UUID;  -- Skills Gap -> Training
  rct_7 UUID;  -- System Outage -> IT
  rct_8 UUID;  -- Data Breach -> Cybersecurity
  rct_9 UUID;  -- Ransomware -> Cybersecurity
  rct_10 UUID; -- Cash Flow -> Finance
  rct_11 UUID; -- Customer Default -> Accounts Receivable
  rct_12 UUID; -- Currency -> Finance
  rct_13 UUID; -- Regulatory Change -> Regulatory Compliance
  rct_14 UUID; -- Contract Disputes -> Pricing & Contracts
  rct_15 UUID; -- GDPR -> Cybersecurity
  rct_16 UUID; -- Process Failure -> Manufacturing
  rct_17 UUID; -- Phishing -> IT
  rct_18 UUID; -- Market Disruption -> Strategic Planning
  rct_19 UUID; -- Scaling -> Project Management
  rct_20 UUID; -- Data Loss -> Infrastructure Management
  rct_21 UUID; -- Data Corruption -> Financial Reporting
  rct_22 UUID; -- Reporting Compliance -> Regulatory Compliance
  rct_23 UUID; -- Equipment Failure -> Manufacturing
  rct_24 UUID; -- Partnership Dependency -> Account Management
  rct_25 UUID; -- IP Risk -> Risk Management
  rct_26 UUID; -- Annual Renewal (L5 risk) -> Regulatory Compliance (L3 process)
  rct_27 UUID; -- APT (L5 risk) -> Cybersecurity (L3 process)
  rct_28 UUID; -- Process Failure (L3 risk) -> Final Assembly (L5 process)

  -- L5 taxonomy nodes for testing deep hierarchy display
  risk_annual_renewal UUID;  -- L5: Compliance Risk -> Regulatory Risk -> Industry Specific -> License Requirements -> Annual Renewal
  risk_apt UUID;             -- L5: Technology Risk -> Cybersecurity Risk -> Data Breach -> External Attack -> APT
  proc_final_assembly UUID;  -- L5: Core Operations -> Production/Service Delivery -> Manufacturing -> Assembly -> Final Assembly
  proc_annual_report UUID;   -- L5: Support Functions -> Finance & Accounting -> Financial Reporting -> Regulatory Filings -> Annual Report

  -- Control IDs
  ctrl_access_review UUID;
  ctrl_backup_recovery UUID;
  ctrl_vendor_scorecard UUID;
  ctrl_quality_inspection UUID;
  ctrl_succession_planning UUID;
  ctrl_background_check UUID;
  ctrl_cash_flow_forecast UUID;
  ctrl_credit_limit UUID;
  ctrl_regulatory_calendar UUID;
  ctrl_contract_checklist UUID;
  ctrl_privacy_assessment UUID;
  ctrl_incident_response UUID;
  ctrl_competitive_intel UUID;
  ctrl_sop UUID;
  ctrl_security_training UUID;

  -- Control test IDs (for failed tests that need remediation)
  test_fail_1 UUID;
  test_fail_2 UUID;
  test_fail_3 UUID;
  test_fail_4 UUID;
  test_fail_5 UUID;

BEGIN
  -- ============================================================
  -- Clean slate: Delete existing data in reverse dependency order
  -- ============================================================
  DELETE FROM public.remediation_plans WHERE tenant_id = v_tenant_id;
  DELETE FROM public.control_tests WHERE tenant_id = v_tenant_id;
  DELETE FROM public.control_links WHERE tenant_id = v_tenant_id;
  DELETE FROM public.controls WHERE tenant_id = v_tenant_id;
  DELETE FROM public.rct_rows WHERE tenant_id = v_tenant_id;

  -- ============================================================
  -- Lookup Risk Taxonomy Node IDs by name
  -- ============================================================
  SELECT id INTO risk_competition FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Competition';
  SELECT id INTO risk_market_disruption FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Market Disruption';
  SELECT id INTO risk_process_failure FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Process Failure';
  SELECT id INTO risk_quality_control FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Quality Control';
  SELECT id INTO risk_key_person FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Key Person Dependency';
  SELECT id INTO risk_skills_gap FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Skills Gap';
  SELECT id INTO risk_supplier_failure FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Supplier Failure';
  SELECT id INTO risk_logistics_disruption FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Logistics Disruption';
  SELECT id INTO risk_cash_flow FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Cash Flow Shortage';
  SELECT id INTO risk_customer_default FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Customer Default';
  SELECT id INTO risk_currency FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Currency Fluctuation';
  SELECT id INTO risk_regulatory_change FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Regulatory Change';
  SELECT id INTO risk_reporting_compliance FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Reporting Compliance';
  SELECT id INTO risk_contract_disputes FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Contract Disputes';
  SELECT id INTO risk_gdpr FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'GDPR Compliance';
  SELECT id INTO risk_data_breach FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Data Breach';
  SELECT id INTO risk_ransomware FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Ransomware';
  SELECT id INTO risk_phishing FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Phishing';
  SELECT id INTO risk_system_outage FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'System Outage';
  SELECT id INTO risk_data_loss FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Data Loss';
  SELECT id INTO risk_data_corruption FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Data Corruption';
  SELECT id INTO risk_equipment_failure FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Equipment Failure';
  SELECT id INTO risk_scaling FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Scaling Challenges';
  SELECT id INTO risk_partnership FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Partnership Dependency';
  SELECT id INTO risk_ip FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Intellectual Property';

  -- ============================================================
  -- Lookup Process Taxonomy Node IDs by name
  -- ============================================================
  SELECT id INTO proc_business_dev FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Business Development';
  SELECT id INTO proc_account_mgmt FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Account Management';
  SELECT id INTO proc_quality_control FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Quality Control';
  SELECT id INTO proc_logistics FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Logistics & Distribution';
  SELECT id INTO proc_hr FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Human Resources';
  SELECT id INTO proc_training FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Training & Development';
  SELECT id INTO proc_it FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Information Technology';
  SELECT id INTO proc_cybersecurity FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Cybersecurity';
  SELECT id INTO proc_vendor_mgmt FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Vendor Management';
  SELECT id INTO proc_finance FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Finance & Accounting';
  SELECT id INTO proc_accounts_receivable FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Accounts Receivable';
  SELECT id INTO proc_sourcing FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Sourcing';
  SELECT id INTO proc_regulatory_compliance FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Regulatory Compliance';
  SELECT id INTO proc_pricing FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Pricing & Contracts';
  SELECT id INTO proc_customer_service FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Customer Service';
  SELECT id INTO proc_strategic_planning FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Strategic Planning';
  SELECT id INTO proc_project_mgmt FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Project Management';
  SELECT id INTO proc_financial_reporting FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Financial Reporting';
  SELECT id INTO proc_infrastructure_mgmt FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Infrastructure Management';
  SELECT id INTO proc_manufacturing FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Manufacturing';
  SELECT id INTO proc_risk_mgmt FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Risk Management';
  SELECT id INTO proc_application_mgmt FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Application Management';
  SELECT id INTO proc_performance_mgmt FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Performance Management';
  SELECT id INTO proc_continuous_improvement FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Continuous Improvement';
  SELECT id INTO proc_recruitment FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Recruitment';

  -- ============================================================
  -- Lookup L5 Taxonomy Node IDs (for testing deep hierarchy display)
  -- ============================================================

  -- L5 Risk nodes
  SELECT id INTO risk_annual_renewal FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'Annual Renewal';
  SELECT id INTO risk_apt FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'risk' AND name = 'APT';

  -- L5 Process nodes
  SELECT id INTO proc_final_assembly FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Final Assembly';
  SELECT id INTO proc_annual_report FROM taxonomy_nodes
    WHERE tenant_id = v_tenant_id AND type = 'process' AND name = 'Annual Report';

  -- ============================================================
  -- RCT ROWS (28 rows - including 3 L5 test rows)
  -- Varied gross scores: probability 1-5, impact 1-5, appetite 6-15
  -- ============================================================

  -- 1. Competition -> Business Development (gross: 3x4=12, moderate-high)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_competition || ':' || proc_business_dev, risk_competition, proc_business_dev,
    3, 4, 9,
    'Competitive pressure is constant in our market segment',
    'Loss of market share could significantly impact revenue')
  RETURNING id INTO rct_1;

  -- 2. Quality Control Risk -> Quality Control Process (gross: 3x4=12, moderate-high)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_quality_control || ':' || proc_quality_control, risk_quality_control, proc_quality_control,
    3, 4, 12,
    'Quality issues arise occasionally despite controls',
    'Quality failures can result in recalls and reputation damage')
  RETURNING id INTO rct_2;

  -- 3. Supplier Failure -> Vendor Management (gross: 3x4=12)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_supplier_failure || ':' || proc_vendor_mgmt, risk_supplier_failure, proc_vendor_mgmt,
    3, 4, 10,
    'Single-source suppliers increase dependency risk',
    'Supply disruption could halt production for weeks')
  RETURNING id INTO rct_3;

  -- 4. Logistics Disruption -> Logistics & Distribution (gross: 2x4=8, moderate)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_logistics_disruption || ':' || proc_logistics, risk_logistics_disruption, proc_logistics,
    2, 4, 8,
    'Transportation delays occur seasonally',
    'Delivery failures affect customer satisfaction')
  RETURNING id INTO rct_4;

  -- 5. Key Person Dependency -> Human Resources (gross: 3x3=9)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_key_person || ':' || proc_hr, risk_key_person, proc_hr,
    3, 3, 9,
    'Several critical roles have single point of failure',
    'Loss of key personnel would disrupt operations')
  RETURNING id INTO rct_5;

  -- 6. Skills Gap -> Training & Development (gross: 3x3=9)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_skills_gap || ':' || proc_training, risk_skills_gap, proc_training,
    3, 3, 10,
    'Technology changes outpace training capacity',
    'Skills gaps reduce operational efficiency')
  RETURNING id INTO rct_6;

  -- 7. System Outage -> Information Technology (gross: 4x5=20, high)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_system_outage || ':' || proc_it, risk_system_outage, proc_it,
    4, 5, 12,
    'Legacy systems have multiple failure points',
    'Extended outage would halt all operations')
  RETURNING id INTO rct_7;

  -- 8. Data Breach -> Cybersecurity (gross: 4x5=20, high)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_data_breach || ':' || proc_cybersecurity, risk_data_breach, proc_cybersecurity,
    4, 5, 10,
    'Threat landscape continues to evolve',
    'Data breach would result in regulatory fines and reputation loss')
  RETURNING id INTO rct_8;

  -- 9. Ransomware -> Cybersecurity (gross: 3x5=15)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_ransomware || ':' || proc_cybersecurity, risk_ransomware, proc_cybersecurity,
    3, 5, 10,
    'Ransomware attacks increasing across industry',
    'Ransomware could encrypt critical business data')
  RETURNING id INTO rct_9;

  -- 10. Cash Flow Shortage -> Finance & Accounting (gross: 2x4=8, moderate)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_cash_flow || ':' || proc_finance, risk_cash_flow, proc_finance,
    2, 4, 8,
    'Seasonal revenue fluctuations create pressure',
    'Cash shortage would delay vendor payments')
  RETURNING id INTO rct_10;

  -- 11. Customer Default -> Accounts Receivable (gross: 3x3=9)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_customer_default || ':' || proc_accounts_receivable, risk_customer_default, proc_accounts_receivable,
    3, 3, 9,
    'Some customers have extended payment terms',
    'Defaults affect working capital position')
  RETURNING id INTO rct_11;

  -- 12. Currency Fluctuation -> Finance & Accounting (gross: 2x2=4, low)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_currency || ':' || proc_finance, risk_currency, proc_finance,
    2, 2, 6,
    'Limited international exposure',
    'Currency movements have minor P&L impact')
  RETURNING id INTO rct_12;

  -- 13. Regulatory Change -> Regulatory Compliance (gross: 3x4=12)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_regulatory_change || ':' || proc_regulatory_compliance, risk_regulatory_change, proc_regulatory_compliance,
    3, 4, 10,
    'Regulatory environment continues to evolve',
    'Non-compliance could result in fines and operational restrictions')
  RETURNING id INTO rct_13;

  -- 14. Contract Disputes -> Pricing & Contracts (gross: 2x3=6, low-moderate)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_contract_disputes || ':' || proc_pricing, risk_contract_disputes, proc_pricing,
    2, 3, 8,
    'Contract terms are generally well-defined',
    'Disputes could result in legal costs and relationship damage')
  RETURNING id INTO rct_14;

  -- 15. GDPR Compliance -> Cybersecurity (gross: 4x4=16, high)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_gdpr || ':' || proc_cybersecurity, risk_gdpr, proc_cybersecurity,
    4, 4, 12,
    'Data processing activities are extensive',
    'GDPR violations carry significant financial penalties')
  RETURNING id INTO rct_15;

  -- 16. Process Failure -> Manufacturing (gross: 3x4=12)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_process_failure || ':' || proc_manufacturing, risk_process_failure, proc_manufacturing,
    3, 4, 10,
    'Manufacturing processes have multiple handoff points',
    'Process failures cause production delays and waste')
  RETURNING id INTO rct_16;

  -- 17. Phishing -> Information Technology (gross: 3x3=9)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_phishing || ':' || proc_it, risk_phishing, proc_it,
    3, 3, 9,
    'Employees receive frequent phishing attempts',
    'Successful phishing could compromise credentials')
  RETURNING id INTO rct_17;

  -- 18. Market Disruption -> Strategic Planning (gross: 3x5=15, high)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_market_disruption || ':' || proc_strategic_planning, risk_market_disruption, proc_strategic_planning,
    3, 5, 12,
    'Technology disruption is accelerating in our industry',
    'Major disruption could obsolete our business model')
  RETURNING id INTO rct_18;

  -- 19. Scaling Challenges -> Project Management (gross: 3x4=12)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_scaling || ':' || proc_project_mgmt, risk_scaling, proc_project_mgmt,
    3, 4, 10,
    'Growth initiatives strain existing capabilities',
    'Scaling failures could delay market expansion')
  RETURNING id INTO rct_19;

  -- 20. Data Loss -> Infrastructure Management (gross: 3x5=15, high)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_data_loss || ':' || proc_infrastructure_mgmt, risk_data_loss, proc_infrastructure_mgmt,
    3, 5, 10,
    'Large data volumes increase backup complexity',
    'Permanent data loss would be catastrophic')
  RETURNING id INTO rct_20;

  -- 21. Data Corruption -> Financial Reporting (gross: 3x3=9)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_data_corruption || ':' || proc_financial_reporting, risk_data_corruption, proc_financial_reporting,
    3, 3, 9,
    'Multiple data integration points increase risk',
    'Corrupted financial data would require restatement')
  RETURNING id INTO rct_21;

  -- 22. Reporting Compliance -> Regulatory Compliance (gross: 4x4=16)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_reporting_compliance || ':' || proc_regulatory_compliance, risk_reporting_compliance, proc_regulatory_compliance,
    4, 4, 12,
    'Multiple reporting requirements with tight deadlines',
    'Late or inaccurate reports result in penalties')
  RETURNING id INTO rct_22;

  -- 23. Equipment Failure -> Manufacturing (gross: 3x4=12)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_equipment_failure || ':' || proc_manufacturing, risk_equipment_failure, proc_manufacturing,
    3, 4, 10,
    'Some equipment is beyond expected lifespan',
    'Major equipment failure could halt production')
  RETURNING id INTO rct_23;

  -- 24. Partnership Dependency -> Account Management (gross: 2x4=8)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_partnership || ':' || proc_account_mgmt, risk_partnership, proc_account_mgmt,
    2, 4, 8,
    'Key partnerships have stable track record',
    'Partner loss would significantly impact revenue')
  RETURNING id INTO rct_24;

  -- 25. Intellectual Property -> Risk Management (gross: 2x4=8)
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_ip || ':' || proc_risk_mgmt, risk_ip, proc_risk_mgmt,
    2, 4, 8,
    'IP portfolio is actively managed',
    'IP theft could benefit competitors')
  RETURNING id INTO rct_25;

  -- ============================================================
  -- L5 DEPTH TEST ROWS (3 rows for testing L4/L5 column display)
  -- These rows use L5 taxonomy nodes to verify deep hierarchy display
  -- ============================================================

  -- 26. Annual Renewal (L5 risk) -> Regulatory Compliance (L3 process)
  -- Expected display: Risk L1-L5 populated, Process L1-L3 populated
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_annual_renewal || ':' || proc_regulatory_compliance, risk_annual_renewal, proc_regulatory_compliance,
    3, 3, 9,
    'License renewal process has multiple dependencies',
    'Missed renewal could halt regulated business activities')
  RETURNING id INTO rct_26;

  -- 27. APT (L5 risk) -> Cybersecurity (L3 process)
  -- Expected display: Risk L1-L5 populated, Process L1-L3 populated
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_apt || ':' || proc_cybersecurity, risk_apt, proc_cybersecurity,
    4, 5, 12,
    'State-sponsored threat actors actively targeting our industry',
    'APT breach could result in long-term espionage and IP theft')
  RETURNING id INTO rct_27;

  -- 28. Process Failure (L3 risk) -> Final Assembly (L5 process)
  -- Expected display: Risk L1-L3 populated, Process L1-L5 populated
  INSERT INTO rct_rows (tenant_id, row_id, risk_id, process_id, gross_probability, gross_impact, risk_appetite,
    gross_probability_comment, gross_impact_comment)
  VALUES (v_tenant_id, risk_process_failure || ':' || proc_final_assembly, risk_process_failure, proc_final_assembly,
    3, 4, 10,
    'Final assembly has complex multi-step procedures',
    'Assembly errors could result in product recalls')
  RETURNING id INTO rct_28;

  -- ============================================================
  -- CONTROLS (15 controls with various types)
  -- ============================================================

  -- 1. Access Control Review (Detective, quarterly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Access Control Review',
    'Quarterly review of user access rights to critical systems and applications',
    'Detective', 'quarterly',
    '1. Generate access reports from all critical systems. 2. Compare against HR active employee list. 3. Verify terminated users removed within 24 hours. 4. Review privileged access assignments. 5. Document and remediate discrepancies.',
    2, 3,
    'Effective at detecting unauthorized access but requires manual review')
  RETURNING id INTO ctrl_access_review;

  -- 2. System Backup and Recovery (Corrective, quarterly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'System Backup and Recovery',
    'Automated daily backups with quarterly recovery testing to ensure data restoration capability',
    'Corrective', 'quarterly',
    '1. Verify backup job completion logs for past quarter. 2. Select sample of critical systems for recovery test. 3. Restore to isolated environment. 4. Verify data integrity and application functionality. 5. Document recovery time and any issues.',
    2, 2,
    'Recovery tests consistently meet 4-hour RTO target')
  RETURNING id INTO ctrl_backup_recovery;

  -- 3. Vendor Performance Scorecard (Detective, monthly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Vendor Performance Scorecard',
    'Monthly review of vendor performance metrics against SLA requirements',
    'Detective', 'monthly',
    '1. Collect delivery metrics from receiving. 2. Calculate on-time delivery rate. 3. Review quality rejection rates. 4. Score vendors against SLA thresholds. 5. Escalate underperforming vendors.',
    2, 3,
    'Early warning system for supplier issues')
  RETURNING id INTO ctrl_vendor_scorecard;

  -- 4. Quality Control Inspection (Detective, monthly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Quality Control Inspection',
    'Statistical sampling inspection of production output against quality specifications',
    'Detective', 'monthly',
    '1. Define sampling criteria based on production volume. 2. Inspect samples against specification sheet. 3. Calculate defect rate. 4. Trigger root cause analysis if threshold exceeded. 5. Report results to production management.',
    2, 3,
    'Catches defects before customer delivery')
  RETURNING id INTO ctrl_quality_inspection;

  -- 5. Succession Planning (Preventative, annually)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Succession Planning',
    'Annual review and update of succession plans for critical roles',
    'Preventative', 'annually',
    '1. Identify critical roles based on impact assessment. 2. Review current succession candidates. 3. Assess readiness levels. 4. Identify development gaps. 5. Create individual development plans.',
    2, 2,
    'Reduces key person dependency over time')
  RETURNING id INTO ctrl_succession_planning;

  -- 6. Employee Background Check (Preventative, quarterly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Employee Background Check',
    'Background verification for new hires and periodic re-screening for sensitive roles',
    'Preventative', 'quarterly',
    '1. Verify all new hires completed background check. 2. Review pending re-screens for sensitive positions. 3. Follow up on incomplete checks. 4. Document any adverse findings and actions taken.',
    1, 2,
    'Standard pre-employment control')
  RETURNING id INTO ctrl_background_check;

  -- 7. Cash Flow Forecasting (Detective, monthly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Cash Flow Forecasting',
    'Rolling 13-week cash flow forecast with weekly updates',
    'Detective', 'monthly',
    '1. Review actual vs forecast variance for prior period. 2. Update AR collections assumptions. 3. Review committed AP payments. 4. Identify potential shortfall periods. 5. Brief CFO on cash position.',
    1, 3,
    'Provides advance warning of liquidity issues')
  RETURNING id INTO ctrl_cash_flow_forecast;

  -- 8. Credit Limit Authorization (Preventative, quarterly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Credit Limit Authorization',
    'Credit assessment and limit approval for customers before extending credit terms',
    'Preventative', 'quarterly',
    '1. Review new credit applications. 2. Assess credit scores and financial statements. 3. Set appropriate credit limits. 4. Review existing customers exceeding limits. 5. Update credit policy as needed.',
    2, 2,
    'Prevents exposure to uncreditworthy customers')
  RETURNING id INTO ctrl_credit_limit;

  -- 9. Regulatory Filing Calendar (Preventative, monthly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Regulatory Filing Calendar',
    'Centralized calendar tracking all regulatory filing deadlines with automated reminders',
    'Preventative', 'monthly',
    '1. Review upcoming deadlines for next 60 days. 2. Verify responsible party assigned. 3. Check preparation status. 4. Send reminder notifications. 5. Escalate at-risk filings.',
    2, 3,
    'Prevents missed filing deadlines')
  RETURNING id INTO ctrl_regulatory_calendar;

  -- 10. Contract Review Checklist (Preventative, quarterly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Contract Review Checklist',
    'Standardized legal review checklist for all contracts above materiality threshold',
    'Preventative', 'quarterly',
    '1. Identify contracts requiring review. 2. Apply standard checklist to each. 3. Escalate non-standard terms to legal. 4. Document approved deviations. 5. Maintain contract register.',
    1, 2,
    'Ensures consistent contract terms')
  RETURNING id INTO ctrl_contract_checklist;

  -- 11. Privacy Impact Assessment (Preventative, quarterly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Privacy Impact Assessment',
    'Assessment of data privacy implications for new projects and system changes',
    'Preventative', 'quarterly',
    '1. Review project pipeline for data processing changes. 2. Conduct PIA for applicable projects. 3. Identify required consent updates. 4. Document lawful basis for processing. 5. Update data register.',
    3, 3,
    'GDPR compliance checkpoint for new initiatives')
  RETURNING id INTO ctrl_privacy_assessment;

  -- 12. Incident Response Plan (Corrective, annually)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Incident Response Plan',
    'Documented incident response procedures with annual tabletop exercises',
    'Corrective', 'annually',
    '1. Review incident response plan. 2. Conduct tabletop exercise with key stakeholders. 3. Document lessons learned. 4. Update contact lists and escalation paths. 5. Distribute updated plan.',
    2, 3,
    'Ensures coordinated response to security incidents')
  RETURNING id INTO ctrl_incident_response;

  -- 13. Competitive Intelligence Monitoring (Detective, monthly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Competitive Intelligence Monitoring',
    'Systematic tracking of competitor activities, pricing, and market movements',
    'Detective', 'monthly',
    '1. Review competitor news and announcements. 2. Update competitor pricing database. 3. Analyze market share trends. 4. Brief sales on competitive positioning. 5. Report strategic implications to leadership.',
    2, 3,
    'Early warning for competitive threats')
  RETURNING id INTO ctrl_competitive_intel;

  -- 14. Standard Operating Procedures (Preventative, annually)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Standard Operating Procedures',
    'Documented SOPs for critical processes with annual review cycle',
    'Preventative', 'annually',
    '1. Inventory all documented SOPs. 2. Identify SOPs due for review. 3. Validate procedures with process owners. 4. Update and re-publish. 5. Communicate changes to affected staff.',
    2, 3,
    'Ensures process consistency and knowledge transfer')
  RETURNING id INTO ctrl_sop;

  -- 15. Security Awareness Training (Preventative, quarterly)
  INSERT INTO controls (tenant_id, name, description, control_type, test_frequency, test_procedure, net_probability, net_impact, comment)
  VALUES (v_tenant_id, 'Security Awareness Training',
    'Mandatory security awareness training with phishing simulation exercises',
    'Preventative', 'quarterly',
    '1. Review training completion rates. 2. Deploy phishing simulation. 3. Analyze click rates and trends. 4. Provide remedial training for repeat offenders. 5. Report metrics to security committee.',
    2, 2,
    'Reduces human factor in security incidents')
  RETURNING id INTO ctrl_security_training;

  -- ============================================================
  -- CONTROL LINKS (30 links connecting controls to RCT rows)
  -- Net scores lower than gross to show control effectiveness
  -- ============================================================

  -- Access Control Review links (3)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_access_review, rct_7, 2, 3);  -- System Outage
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_access_review, rct_8, 2, 3);  -- Data Breach
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_access_review, rct_9, 2, 3);  -- Ransomware

  -- System Backup and Recovery links (3)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_backup_recovery, rct_7, 2, 2);  -- System Outage
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_backup_recovery, rct_9, 2, 2);  -- Ransomware
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_backup_recovery, rct_20, 2, 2); -- Data Loss

  -- Vendor Performance Scorecard links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_vendor_scorecard, rct_3, 2, 3);  -- Supplier Failure
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_vendor_scorecard, rct_4, 1, 3);  -- Logistics Disruption

  -- Quality Control Inspection links (3)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_quality_inspection, rct_2, 2, 3);  -- Quality Control Risk
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_quality_inspection, rct_16, 2, 3); -- Process Failure
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_quality_inspection, rct_23, 2, 3); -- Equipment Failure

  -- Succession Planning links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_succession_planning, rct_5, 2, 2);  -- Key Person
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_succession_planning, rct_6, 2, 2);  -- Skills Gap

  -- Background Check links (1)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_background_check, rct_5, 2, 2);  -- Key Person

  -- Cash Flow Forecasting links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_cash_flow_forecast, rct_10, 1, 3);  -- Cash Flow
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_cash_flow_forecast, rct_12, 1, 2);  -- Currency

  -- Credit Limit Authorization links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_credit_limit, rct_11, 2, 2);  -- Customer Default
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_credit_limit, rct_24, 1, 3);  -- Partnership Dependency

  -- Regulatory Filing Calendar links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_regulatory_calendar, rct_13, 2, 3);  -- Regulatory Change
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_regulatory_calendar, rct_22, 2, 3);  -- Reporting Compliance

  -- Contract Review Checklist links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_contract_checklist, rct_14, 1, 2);  -- Contract Disputes
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_contract_checklist, rct_25, 1, 3);  -- IP Risk

  -- Privacy Impact Assessment links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_privacy_assessment, rct_15, 3, 3);  -- GDPR
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_privacy_assessment, rct_8, 3, 3);   -- Data Breach

  -- Incident Response Plan links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_incident_response, rct_8, 2, 3);  -- Data Breach
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_incident_response, rct_9, 2, 3);  -- Ransomware

  -- Competitive Intelligence Monitoring links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_competitive_intel, rct_1, 2, 3);   -- Competition
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_competitive_intel, rct_18, 2, 4);  -- Market Disruption

  -- Standard Operating Procedures links (2)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_sop, rct_16, 2, 3);  -- Process Failure
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_sop, rct_19, 2, 3);  -- Scaling Challenges

  -- Security Awareness Training links (3)
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_security_training, rct_17, 2, 2);  -- Phishing
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_security_training, rct_8, 2, 3);   -- Data Breach
  INSERT INTO control_links (tenant_id, control_id, rct_row_id, net_probability, net_impact)
  VALUES (v_tenant_id, ctrl_security_training, rct_9, 2, 3);   -- Ransomware

  -- ============================================================
  -- CONTROL TESTS (20 tests)
  -- Distribution: ~12 pass, ~4 partial, ~4 fail
  -- ============================================================

  -- Test 1: Access Control Review - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_access_review, rct_7, 'John Smith', '2025-11-15', 'pass', 4,
    'Access reports generated from AD, ServiceNow, and ERP. Cross-referenced with HR termination list.',
    'All 8 terminated users removed within SLA. 3 dormant accounts identified and disabled.',
    'Continue quarterly reviews. Consider automated dormant account detection.');

  -- Test 2: Access Control Review - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_access_review, rct_8, 'John Smith', '2025-08-12', 'pass', 4,
    'Privileged access review completed for all admin accounts.',
    'No unauthorized privileged access identified. 2 shared admin accounts converted to individual.',
    'Maintain current review frequency.');

  -- Test 3: System Backup and Recovery - FAIL (needs remediation)
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_backup_recovery, rct_7, 'Maria Garcia', '2025-10-20', 'fail', 2,
    'Recovery test attempted for ERP database. Recovery took 6.5 hours vs 4-hour RTO target.',
    'Database size has grown 40% since last capacity planning. Recovery infrastructure undersized.',
    'Upgrade backup infrastructure to meet RTO. Re-test within 30 days.')
  RETURNING id INTO test_fail_1;

  -- Test 4: System Backup and Recovery - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_backup_recovery, rct_20, 'Maria Garcia', '2025-07-15', 'pass', 5,
    'File server recovery test completed in 2.1 hours.',
    'Recovery successful with data integrity verified. Well within RTO target.',
    'No changes needed.');

  -- Test 5: Vendor Performance Scorecard - PARTIAL
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_vendor_scorecard, rct_3, 'Robert Chen', '2025-09-30', 'partial', 3,
    'Scorecard completed for 18 of 22 critical vendors. 4 vendors missing complete delivery data.',
    '15 vendors met SLA. 3 vendors on watch list. Data collection gaps in receiving system.',
    'Implement receiving system integration for complete data capture.');

  -- Test 6: Quality Control Inspection - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_quality_inspection, rct_2, 'Lisa Wong', '2025-12-05', 'pass', 4,
    'Statistical sample of 500 units inspected. Defect rate 0.8% vs 1.5% threshold.',
    'Quality metrics within acceptable range. One minor process adjustment identified.',
    'Continue current inspection frequency.');

  -- Test 7: Quality Control Inspection - FAIL (needs remediation)
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_quality_inspection, rct_16, 'Lisa Wong', '2025-11-10', 'fail', 2,
    'Inspection of Line 3 output showed 3.2% defect rate vs 1.5% threshold.',
    'Root cause traced to calibration drift in automated inspection equipment.',
    'Immediate recalibration required. Implement daily calibration checks.')
  RETURNING id INTO test_fail_2;

  -- Test 8: Succession Planning - PARTIAL
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_succession_planning, rct_5, 'HR Director', '2025-06-30', 'partial', 3,
    'Annual succession planning review completed. 8 of 12 critical roles have ready-now successors.',
    '4 roles have development gaps. CFO and CTO succession require external candidates.',
    'Accelerate development for internal candidates. Begin external search for 2 roles.');

  -- Test 9: Cash Flow Forecasting - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_cash_flow_forecast, rct_10, 'CFO', '2025-12-15', 'pass', 5,
    'Forecast accuracy review: 92% accuracy over past quarter vs 85% target.',
    'Improved AR collection assumptions contributed to better accuracy.',
    'Maintain current forecasting methodology.');

  -- Test 10: Credit Limit Authorization - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_credit_limit, rct_11, 'Credit Manager', '2025-10-01', 'pass', 4,
    'Review of credit decisions for Q3. Bad debt write-off 0.3% vs 0.5% budget.',
    'Credit policy effective at preventing losses.',
    'No changes to current credit limits needed.');

  -- Test 11: Regulatory Filing Calendar - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_regulatory_calendar, rct_13, 'Compliance Officer', '2025-11-30', 'pass', 5,
    'All 15 regulatory filings submitted on time for Q3.',
    'Zero late filings for 8 consecutive quarters.',
    'Continue current process.');

  -- Test 12: Contract Review Checklist - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_contract_checklist, rct_14, 'General Counsel', '2025-09-15', 'pass', 4,
    'Audit of 25 contracts signed in Q3. All used standard checklist.',
    'No unauthorized deviations. 3 approved deviations properly documented.',
    'Consider adding AI-powered contract review for efficiency.');

  -- Test 13: Privacy Impact Assessment - FAIL (needs remediation)
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_privacy_assessment, rct_15, 'DPO', '2025-10-25', 'fail', 2,
    'Review found 2 projects launched without required PIA completion.',
    'Marketing analytics project and HR system upgrade bypassed privacy review.',
    'Implement mandatory PIA gate in project approval process.')
  RETURNING id INTO test_fail_3;

  -- Test 14: Incident Response Plan - PARTIAL
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_incident_response, rct_8, 'CISO', '2025-08-20', 'partial', 3,
    'Tabletop exercise completed. Response time met targets but communication gaps identified.',
    'External communication to customers took 4 hours vs 2-hour target.',
    'Update communication templates. Add dedicated PR liaison to incident team.');

  -- Test 15: Competitive Intelligence - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_competitive_intel, rct_1, 'VP Marketing', '2025-12-01', 'pass', 4,
    'Monthly competitive report delivered on schedule. 3 competitive threats identified.',
    'Early warning on competitor price reduction enabled proactive response.',
    'Continue current monitoring frequency.');

  -- Test 16: SOP Review - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_sop, rct_16, 'Operations Manager', '2025-07-01', 'pass', 4,
    'Annual SOP review completed. 42 of 45 SOPs current.',
    '3 SOPs updated for process changes. All critical SOPs reviewed.',
    'Schedule quarterly spot checks for high-change areas.');

  -- Test 17: Security Training - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_security_training, rct_17, 'Security Manager', '2025-11-01', 'pass', 4,
    'Q3 training completion 98%. Phishing simulation click rate 4.2% vs 5% target.',
    'Significant improvement from 8% click rate in Q1.',
    'Continue quarterly simulations. Add targeted training for repeat clickers.');

  -- Test 18: Security Training - FAIL (needs remediation)
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_security_training, rct_8, 'Security Manager', '2025-05-15', 'fail', 2,
    'Phishing simulation showed 12% click rate in Finance department.',
    'Finance team significantly underperformed company average. Targeted attack risk elevated.',
    'Mandatory remedial training for Finance. Weekly simulations for 3 months.')
  RETURNING id INTO test_fail_4;

  -- Test 19: Vendor Scorecard - PASS
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_vendor_scorecard, rct_4, 'Supply Chain Manager', '2025-12-10', 'pass', 4,
    'Logistics vendor review completed. All 5 logistics partners met delivery SLAs.',
    'On-time delivery improved to 96% from 93% previous quarter.',
    'Maintain current vendor relationships.');

  -- Test 20: Backup Recovery - FAIL (needs remediation)
  INSERT INTO control_tests (tenant_id, control_id, rct_row_id, tester_name, test_date, result, effectiveness, evidence, findings, recommendations)
  VALUES (v_tenant_id, ctrl_backup_recovery, rct_9, 'IT Manager', '2025-09-05', 'fail', 1,
    'Ransomware recovery drill failed. Isolated backup not current due to configuration error.',
    'Air-gapped backup 3 weeks behind production. Would result in significant data loss.',
    'Fix backup configuration immediately. Implement daily backup verification.')
  RETURNING id INTO test_fail_5;

  -- ============================================================
  -- REMEDIATION PLANS (5 plans for failed tests)
  -- Distribution: 1 open (critical), 2 in-progress, 1 resolved, 1 closed
  -- ============================================================

  -- Plan 1: Backup Infrastructure (IN-PROGRESS, high priority)
  INSERT INTO remediation_plans (
    tenant_id, control_test_id, control_id, rct_row_id,
    title, description, owner, deadline, status, priority, action_items, notes, created_date
  )
  VALUES (
    v_tenant_id, test_fail_1, ctrl_backup_recovery, rct_7,
    'Upgrade Backup Infrastructure for RTO Compliance',
    'Recovery test failed to meet 4-hour RTO target due to database growth. Need infrastructure upgrade.',
    'IT Director',
    '2026-02-15',
    'in-progress',
    'high',
    '[{"id":"1","description":"Assess current backup infrastructure capacity","completed":true,"completedDate":"2025-11-01"},{"id":"2","description":"Obtain quotes for infrastructure upgrade","completed":true,"completedDate":"2025-11-15"},{"id":"3","description":"Submit budget request for approval","completed":true,"completedDate":"2025-11-20"},{"id":"4","description":"Procure and install new backup servers","completed":false},{"id":"5","description":"Re-test recovery and validate RTO met","completed":false}]'::jsonb,
    'Budget approved in December planning cycle. Hardware on order, expected delivery mid-January.',
    '2025-10-25'
  );

  -- Plan 2: Quality Control Calibration (RESOLVED, waiting for closure)
  INSERT INTO remediation_plans (
    tenant_id, control_test_id, control_id, rct_row_id,
    title, description, owner, deadline, status, priority, action_items, notes, created_date, resolved_date
  )
  VALUES (
    v_tenant_id, test_fail_2, ctrl_quality_inspection, rct_16,
    'Implement Daily Calibration Checks for Line 3',
    'Inspection equipment calibration drift caused elevated defect rate. Need preventive calibration process.',
    'QA Manager',
    '2025-12-15',
    'resolved',
    'high',
    '[{"id":"1","description":"Recalibrate Line 3 inspection equipment","completed":true,"completedDate":"2025-11-12"},{"id":"2","description":"Implement daily calibration verification checklist","completed":true,"completedDate":"2025-11-18"},{"id":"3","description":"Train operators on calibration checks","completed":true,"completedDate":"2025-11-22"},{"id":"4","description":"Monitor defect rates for 2 weeks","completed":true,"completedDate":"2025-12-08"}]'::jsonb,
    'Defect rate returned to 0.9% after calibration. Daily checks preventing recurrence. Ready for closure verification.',
    '2025-11-11',
    '2025-12-08'
  );

  -- Plan 3: Privacy Impact Assessment Process (IN-PROGRESS, medium priority)
  INSERT INTO remediation_plans (
    tenant_id, control_test_id, control_id, rct_row_id,
    title, description, owner, deadline, status, priority, action_items, notes, created_date
  )
  VALUES (
    v_tenant_id, test_fail_3, ctrl_privacy_assessment, rct_15,
    'Mandatory PIA Gate in Project Approval',
    'Two projects bypassed privacy review. Need mandatory gate in project governance.',
    'DPO',
    '2026-01-31',
    'in-progress',
    'medium',
    '[{"id":"1","description":"Review current project approval workflow","completed":true,"completedDate":"2025-11-05"},{"id":"2","description":"Design PIA checkpoint in workflow","completed":true,"completedDate":"2025-11-20"},{"id":"3","description":"Configure workflow system with mandatory gate","completed":false},{"id":"4","description":"Create PIA template for project managers","completed":false},{"id":"5","description":"Train project managers on new requirement","completed":false}]'::jsonb,
    'Working with PMO to integrate PIA requirement into project intake form.',
    '2025-10-28'
  );

  -- Plan 4: Finance Department Security Training (CLOSED)
  INSERT INTO remediation_plans (
    tenant_id, control_test_id, control_id, rct_row_id,
    title, description, owner, deadline, status, priority, action_items, notes, created_date, resolved_date, closed_date
  )
  VALUES (
    v_tenant_id, test_fail_4, ctrl_security_training, rct_8,
    'Finance Department Phishing Remediation',
    'Finance department showed 12% phishing click rate, significantly above company average.',
    'CFO',
    '2025-08-31',
    'closed',
    'high',
    '[{"id":"1","description":"Conduct mandatory remedial training for all Finance staff","completed":true,"completedDate":"2025-05-25"},{"id":"2","description":"Implement weekly phishing simulations for Finance","completed":true,"completedDate":"2025-06-01"},{"id":"3","description":"Monitor click rates over 3-month period","completed":true,"completedDate":"2025-08-25"},{"id":"4","description":"Verify click rate below 5% threshold","completed":true,"completedDate":"2025-08-30"}]'::jsonb,
    'Finance click rate reduced to 3.8% in August. Remediation successful. Returning to standard quarterly simulations.',
    '2025-05-18',
    '2025-08-30',
    '2025-09-02'
  );

  -- Plan 5: Air-Gapped Backup Configuration (OPEN, critical priority)
  INSERT INTO remediation_plans (
    tenant_id, control_test_id, control_id, rct_row_id,
    title, description, owner, deadline, status, priority, action_items, notes, created_date
  )
  VALUES (
    v_tenant_id, test_fail_5, ctrl_backup_recovery, rct_9,
    'Fix Air-Gapped Backup Configuration',
    'Ransomware drill revealed air-gapped backup 3 weeks behind production due to configuration error.',
    'IT Director',
    '2026-01-15',
    'open',
    'critical',
    '[{"id":"1","description":"Identify root cause of backup lag","completed":false},{"id":"2","description":"Fix backup job configuration","completed":false},{"id":"3","description":"Verify daily backup completion","completed":false},{"id":"4","description":"Implement automated backup verification alerts","completed":false},{"id":"5","description":"Conduct ransomware drill to verify recovery","completed":false}]'::jsonb,
    'CRITICAL: Immediate attention required. This gap leaves us vulnerable to ransomware data loss.',
    '2025-09-10'
  );

  -- Done - raise notice with counts
  RAISE NOTICE 'Seed complete:';
  RAISE NOTICE '  RCT rows: %', (SELECT COUNT(*) FROM rct_rows WHERE tenant_id = v_tenant_id);
  RAISE NOTICE '  Controls: %', (SELECT COUNT(*) FROM controls WHERE tenant_id = v_tenant_id);
  RAISE NOTICE '  Control links: %', (SELECT COUNT(*) FROM control_links WHERE tenant_id = v_tenant_id);
  RAISE NOTICE '  Control tests: %', (SELECT COUNT(*) FROM control_tests WHERE tenant_id = v_tenant_id);
  RAISE NOTICE '  Remediation plans: %', (SELECT COUNT(*) FROM remediation_plans WHERE tenant_id = v_tenant_id);

END $$;

-- ============================================================
-- Verification queries (run after execution to confirm counts)
-- ============================================================
-- SELECT COUNT(*) as rct_count FROM rct_rows WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640';
-- SELECT COUNT(*) as control_count FROM controls WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640';
-- SELECT COUNT(*) as link_count FROM control_links WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640';
-- SELECT COUNT(*) as test_count FROM control_tests WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640';
-- SELECT COUNT(*) as plan_count FROM remediation_plans WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640';
-- SELECT result, COUNT(*) FROM control_tests WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640' GROUP BY result;
-- SELECT status, COUNT(*) FROM remediation_plans WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640' GROUP BY status;
