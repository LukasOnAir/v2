/**
 * Insurer Preset - Insurance Company demo data
 *
 * Contains risk and process taxonomies typical of property & casualty
 * or life insurance operations, with focus on underwriting, claims,
 * and investment risks.
 */

import type { PresetData } from './types.ts'

export const insurerPreset: PresetData = {
  risks: [
    {
      name: 'Underwriting Risk',
      description: 'Risk of loss from insurance underwriting activities',
      children: [
        {
          name: 'Pricing Risk',
          description: 'Inadequate premium for risk assumed',
          children: [
            {
              name: 'Model Inaccuracy',
              description: 'Actuarial models fail to predict loss accurately',
            },
            {
              name: 'Rate Inadequacy',
              description: 'Filed rates insufficient for risk class',
            },
            {
              name: 'Competitive Pressure',
              description: 'Market forces premium below technical rate',
            },
          ],
        },
        {
          name: 'Selection Risk',
          description: 'Adverse selection in policy acquisition',
          children: [
            {
              name: 'Anti-Selection',
              description: 'Higher-risk applicants disproportionately apply',
            },
            {
              name: 'Information Asymmetry',
              description: 'Material information not disclosed by applicant',
            },
          ],
        },
        {
          name: 'Reserving Risk',
          description: 'Inadequate loss reserves',
          children: [
            {
              name: 'IBNR Estimation',
              description: 'Incurred but not reported claims underestimated',
            },
            {
              name: 'Case Reserve Adequacy',
              description: 'Individual claim reserves insufficient',
            },
            {
              name: 'Catastrophe Reserve',
              description: 'Reserves for large loss events inadequate',
            },
          ],
        },
      ],
    },
    {
      name: 'Investment Risk',
      description: 'Risk of loss from investment activities',
      children: [
        {
          name: 'Market Risk',
          description: 'Investment portfolio market exposure',
          children: [
            {
              name: 'Interest Rate Risk',
              description: 'Duration mismatch between assets and liabilities',
            },
            {
              name: 'Equity Risk',
              description: 'Stock portfolio volatility',
            },
            {
              name: 'Real Estate Risk',
              description: 'Property investment devaluation',
            },
          ],
        },
        {
          name: 'Credit Risk',
          description: 'Fixed income credit exposure',
          children: [
            {
              name: 'Default Risk',
              description: 'Bond issuer default',
            },
            {
              name: 'Downgrade Risk',
              description: 'Credit rating deterioration',
            },
            {
              name: 'Spread Risk',
              description: 'Credit spread widening',
            },
          ],
        },
        {
          name: 'Liquidity Risk',
          description: 'Inability to liquidate investments',
          children: [
            {
              name: 'Asset Liquidity',
              description: 'Illiquid investments difficult to sell',
            },
            {
              name: 'Cash Flow Mismatch',
              description: 'Investment maturities misaligned with claims',
            },
          ],
        },
      ],
    },
    {
      name: 'Operational Risk',
      description: 'Risk from internal processes and systems',
      children: [
        {
          name: 'Claims Processing',
          description: 'Errors in claims handling',
          children: [
            {
              name: 'Claim Leakage',
              description: 'Overpayment of claims due to errors',
            },
            {
              name: 'Fraud Claims',
              description: 'Fraudulent claims not detected',
            },
            {
              name: 'Settlement Delays',
              description: 'Claims processed outside SLA',
            },
          ],
        },
        {
          name: 'Policy Administration',
          description: 'Policy servicing errors',
          children: [
            {
              name: 'Issuance Errors',
              description: 'Incorrect policy terms or coverage',
            },
            {
              name: 'Premium Collection',
              description: 'Billing errors, failed collections',
            },
          ],
        },
        {
          name: 'Technology Risk',
          description: 'IT system failures',
          children: [
            {
              name: 'System Availability',
              description: 'Core systems downtime',
            },
            {
              name: 'Data Breach',
              description: 'Customer data compromise',
            },
          ],
        },
      ],
    },
    {
      name: 'Compliance Risk',
      description: 'Regulatory and legal compliance',
      children: [
        {
          name: 'Regulatory Compliance',
          description: 'Insurance regulation adherence',
          children: [
            {
              name: 'Solvency Requirements',
              description: 'Capital adequacy compliance',
            },
            {
              name: 'Market Conduct',
              description: 'Sales and service compliance',
            },
            {
              name: 'Product Filing',
              description: 'Policy form and rate filing compliance',
            },
          ],
        },
        {
          name: 'Legal Risk',
          description: 'Litigation and contract risk',
          children: [
            {
              name: 'Bad Faith Claims',
              description: 'Litigation for unfair claims handling',
            },
            {
              name: 'Class Actions',
              description: 'Product or practice class actions',
            },
          ],
        },
      ],
    },
    {
      name: 'Strategic Risk',
      description: 'Business strategy and market risks',
      children: [
        {
          name: 'Market Changes',
          description: 'Shifts in insurance market',
          children: [
            {
              name: 'Distribution Disruption',
              description: 'Changing distribution channels',
            },
            {
              name: 'Product Obsolescence',
              description: 'Products no longer meeting market needs',
            },
          ],
        },
        {
          name: 'Reputational Risk',
          description: 'Brand and reputation damage',
        },
        {
          name: 'Climate Risk',
          description: 'Long-term climate change impacts',
        },
      ],
    },
  ],

  processes: [
    {
      name: 'Underwriting',
      description: 'Policy underwriting and pricing',
      children: [
        {
          name: 'Risk Assessment',
          description: 'Application review and risk evaluation',
        },
        {
          name: 'Pricing',
          description: 'Premium calculation and rating',
        },
        {
          name: 'Policy Issuance',
          description: 'Policy document generation and delivery',
        },
        {
          name: 'Reinsurance',
          description: 'Reinsurance placement and management',
        },
      ],
    },
    {
      name: 'Claims',
      description: 'Claims handling and settlement',
      children: [
        {
          name: 'First Notice of Loss',
          description: 'Claim intake and registration',
        },
        {
          name: 'Investigation',
          description: 'Claim investigation and verification',
        },
        {
          name: 'Adjustment',
          description: 'Loss assessment and reserve setting',
        },
        {
          name: 'Settlement',
          description: 'Claim payment and closure',
        },
      ],
    },
    {
      name: 'Investments',
      description: 'Investment portfolio management',
      children: [
        {
          name: 'Portfolio Management',
          description: 'Asset allocation and rebalancing',
        },
        {
          name: 'Trading',
          description: 'Security trading execution',
        },
        {
          name: 'Performance Reporting',
          description: 'Investment performance analysis',
        },
      ],
    },
    {
      name: 'Operations',
      description: 'Policy servicing and administration',
      children: [
        {
          name: 'Policy Servicing',
          description: 'Endorsements, renewals, cancellations',
        },
        {
          name: 'Premium Billing',
          description: 'Invoice generation and collection',
        },
        {
          name: 'Customer Service',
          description: 'Policyholder inquiries and support',
        },
      ],
    },
    {
      name: 'Actuarial',
      description: 'Actuarial analysis and reserving',
      children: [
        {
          name: 'Pricing Analysis',
          description: 'Rate adequacy and development',
        },
        {
          name: 'Loss Reserving',
          description: 'IBNR and case reserve estimation',
        },
        {
          name: 'Capital Modeling',
          description: 'Economic capital and stress testing',
        },
      ],
    },
    {
      name: 'Compliance',
      description: 'Regulatory compliance functions',
      children: [
        {
          name: 'Regulatory Filings',
          description: 'Annual statements and reports',
        },
        {
          name: 'Market Conduct',
          description: 'Sales and service compliance monitoring',
        },
        {
          name: 'Audit',
          description: 'Internal audit and examination prep',
        },
      ],
    },
  ],

  controls: [
    {
      name: 'Underwriting Authority Matrix',
      description:
        'Tiered approval limits based on risk size and type',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Sample 30 bound policies. Verify approval within delegated authority. Review referral patterns to senior underwriters.',
    },
    {
      name: 'Actuarial Rate Review',
      description:
        'Quarterly review of loss ratios by line and class',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Review loss ratio reports. Verify action taken for classes outside targets. Check rate change recommendations implemented.',
    },
    {
      name: 'Special Investigation Unit Review',
      description:
        'SIU referral for claims meeting fraud indicators',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review SIU referral volume and outcomes. Verify indicator triggers working. Calculate denial rate for referred claims.',
    },
    {
      name: 'Claims Reserve Adequacy Review',
      description:
        'Supervisor review of case reserves above threshold',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Sample 25 claims over threshold. Verify supervisor review documented. Compare final settlement to initial reserve.',
    },
    {
      name: 'Investment Compliance Check',
      description:
        'Daily automated check of portfolio against investment policy',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Review exception reports for past 30 days. Verify breaches escalated appropriately. Test limit calculations.',
    },
    {
      name: 'Duration Matching Monitor',
      description:
        'Monthly ALM report comparing asset and liability duration',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review ALM report. Verify duration gap within policy limits. Check immunization strategy effectiveness.',
    },
    {
      name: 'Policy Issuance Quality Review',
      description:
        'Random sample quality check of issued policies',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Sample 30 issued policies. Compare to application and quote. Calculate error rate by type and severity.',
    },
    {
      name: 'Premium Audit Program',
      description:
        'Annual premium audit for commercial policies with reported premiums',
      controlType: 'Detective',
      testFrequency: 'annually',
      testProcedure:
        'Review audit completion rate. Analyze additional/return premium trends. Verify auditor qualifications.',
    },
    {
      name: 'Subrogation Recovery Tracking',
      description:
        'Systematic identification and pursuit of subrogation opportunities',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Review subrogation recovery ratio. Sample closed claims for missed opportunities. Verify third-party tracking.',
    },
    {
      name: 'Solvency Ratio Calculation',
      description:
        'Monthly calculation and reporting of risk-based capital ratio',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review RBC calculation working papers. Verify factor application accuracy. Compare to regulatory minimums.',
    },
    {
      name: 'Complaints Management',
      description:
        'Tracking and response to policyholder complaints within SLA',
      controlType: 'Corrective',
      testFrequency: 'monthly',
      testProcedure:
        'Review complaint volume and trends. Verify response time SLA compliance. Track escalations to regulators.',
    },
    {
      name: 'Market Conduct Self-Audit',
      description:
        'Annual review of sales and service practices for compliance',
      controlType: 'Detective',
      testFrequency: 'annually',
      testProcedure:
        'Review self-audit findings. Verify corrective actions completed. Compare to prior exam findings.',
    },
    {
      name: 'Reinsurance Collectability Review',
      description:
        'Quarterly assessment of reinsurer credit quality',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Review reinsurer credit ratings. Verify collateral adequacy. Calculate concentration by counterparty.',
    },
    {
      name: 'Loss Reserve Opinion',
      description:
        'Annual appointed actuary statement of reserve adequacy',
      controlType: 'Detective',
      testFrequency: 'annually',
      testProcedure:
        'Review actuarial opinion letter. Verify methodology documentation. Check range testing performed.',
    },
    {
      name: 'Catastrophe Modeling',
      description:
        'Annual update of cat model and PML calculation',
      controlType: 'Detective',
      testFrequency: 'annually',
      testProcedure:
        'Review cat model output. Verify exposure data quality. Compare PML to reinsurance program.',
    },
  ],

  rctPairings: [
    // Underwriting Risk pairings
    {
      riskPath: ['Underwriting Risk', 'Pricing Risk', 'Model Inaccuracy'],
      processPath: ['Actuarial', 'Pricing Analysis'],
    },
    {
      riskPath: ['Underwriting Risk', 'Pricing Risk', 'Rate Inadequacy'],
      processPath: ['Underwriting', 'Pricing'],
    },
    {
      riskPath: ['Underwriting Risk', 'Selection Risk', 'Anti-Selection'],
      processPath: ['Underwriting', 'Risk Assessment'],
    },
    {
      riskPath: ['Underwriting Risk', 'Selection Risk', 'Information Asymmetry'],
      processPath: ['Underwriting', 'Risk Assessment'],
    },
    {
      riskPath: ['Underwriting Risk', 'Reserving Risk', 'IBNR Estimation'],
      processPath: ['Actuarial', 'Loss Reserving'],
    },
    {
      riskPath: ['Underwriting Risk', 'Reserving Risk', 'Case Reserve Adequacy'],
      processPath: ['Claims', 'Adjustment'],
    },
    // Investment Risk pairings
    {
      riskPath: ['Investment Risk', 'Market Risk', 'Interest Rate Risk'],
      processPath: ['Investments', 'Portfolio Management'],
    },
    {
      riskPath: ['Investment Risk', 'Market Risk', 'Equity Risk'],
      processPath: ['Investments', 'Trading'],
    },
    {
      riskPath: ['Investment Risk', 'Credit Risk', 'Default Risk'],
      processPath: ['Investments', 'Portfolio Management'],
    },
    {
      riskPath: ['Investment Risk', 'Liquidity Risk', 'Cash Flow Mismatch'],
      processPath: ['Actuarial', 'Capital Modeling'],
    },
    // Operational Risk pairings
    {
      riskPath: ['Operational Risk', 'Claims Processing', 'Claim Leakage'],
      processPath: ['Claims', 'Settlement'],
    },
    {
      riskPath: ['Operational Risk', 'Claims Processing', 'Fraud Claims'],
      processPath: ['Claims', 'Investigation'],
    },
    {
      riskPath: ['Operational Risk', 'Claims Processing', 'Settlement Delays'],
      processPath: ['Claims', 'Settlement'],
    },
    {
      riskPath: ['Operational Risk', 'Policy Administration', 'Issuance Errors'],
      processPath: ['Underwriting', 'Policy Issuance'],
    },
    {
      riskPath: ['Operational Risk', 'Policy Administration', 'Premium Collection'],
      processPath: ['Operations', 'Premium Billing'],
    },
    {
      riskPath: ['Operational Risk', 'Technology Risk', 'Data Breach'],
      processPath: ['Operations', 'Customer Service'],
    },
    // Compliance Risk pairings
    {
      riskPath: ['Compliance Risk', 'Regulatory Compliance', 'Solvency Requirements'],
      processPath: ['Compliance', 'Regulatory Filings'],
    },
    {
      riskPath: ['Compliance Risk', 'Regulatory Compliance', 'Market Conduct'],
      processPath: ['Compliance', 'Market Conduct'],
    },
    {
      riskPath: ['Compliance Risk', 'Legal Risk', 'Bad Faith Claims'],
      processPath: ['Claims', 'Settlement'],
    },
    // Strategic Risk pairings
    {
      riskPath: ['Strategic Risk', 'Climate Risk'],
      processPath: ['Actuarial', 'Capital Modeling'],
    },
  ],
}
