/**
 * Bank Preset - Banking/Financial Services demo data
 *
 * Contains risk and process taxonomies typical of retail and commercial
 * banking operations, with focus on credit, market, and operational risks.
 */

import type { PresetData } from './types.ts'

export const bankPreset: PresetData = {
  risks: [
    {
      name: 'Credit Risk',
      description: 'Risk of loss from borrower default or credit deterioration',
      children: [
        {
          name: 'Lending',
          description: 'Loan portfolio credit risks',
          children: [
            {
              name: 'Consumer Loan Default',
              description: 'Personal loan, credit card, auto loan defaults',
            },
            {
              name: 'Mortgage Default',
              description: 'Residential and commercial mortgage defaults',
            },
            {
              name: 'Commercial Loan Default',
              description: 'Business and corporate loan defaults',
            },
            {
              name: 'Concentration Risk',
              description: 'Over-exposure to single borrower or sector',
            },
          ],
        },
        {
          name: 'Counterparty',
          description: 'Trading and derivative counterparty risks',
          children: [
            {
              name: 'Settlement Risk',
              description: 'Counterparty fails to settle transaction',
            },
            {
              name: 'Derivative Exposure',
              description: 'Mark-to-market exposure on derivative contracts',
            },
          ],
        },
      ],
    },
    {
      name: 'Market Risk',
      description: 'Risk of loss from market price movements',
      children: [
        {
          name: 'Interest Rate Risk',
          description: 'Exposure to interest rate movements',
          children: [
            {
              name: 'Repricing Risk',
              description: 'Mismatch in asset/liability repricing dates',
            },
            {
              name: 'Yield Curve Risk',
              description: 'Non-parallel shifts in yield curve',
            },
            {
              name: 'Basis Risk',
              description: 'Spread changes between related rates',
            },
          ],
        },
        {
          name: 'Foreign Exchange Risk',
          description: 'Currency exposure',
          children: [
            {
              name: 'Transaction Exposure',
              description: 'FX impact on pending transactions',
            },
            {
              name: 'Translation Exposure',
              description: 'FX impact on foreign subsidiary financials',
            },
          ],
        },
        {
          name: 'Equity Risk',
          description: 'Stock and equity portfolio exposure',
        },
      ],
    },
    {
      name: 'Operational Risk',
      description: 'Risk from inadequate processes, people, or systems',
      children: [
        {
          name: 'Process Failures',
          description: 'Errors in business processes',
          children: [
            {
              name: 'Transaction Errors',
              description: 'Processing mistakes, data entry errors',
            },
            {
              name: 'Documentation Errors',
              description: 'Incomplete or incorrect documentation',
            },
            {
              name: 'Settlement Failures',
              description: 'Failed trades or late settlements',
            },
          ],
        },
        {
          name: 'Technology Risk',
          description: 'IT and system-related risks',
          children: [
            {
              name: 'System Outages',
              description: 'Core banking system downtime',
            },
            {
              name: 'Cybersecurity',
              description: 'Data breaches, unauthorized access',
            },
            {
              name: 'Data Integrity',
              description: 'Corrupt or inaccurate data',
            },
          ],
        },
        {
          name: 'Fraud',
          description: 'Internal and external fraud',
          children: [
            {
              name: 'External Fraud',
              description: 'Customer fraud, identity theft, card fraud',
            },
            {
              name: 'Internal Fraud',
              description: 'Employee fraud, unauthorized transactions',
            },
          ],
        },
      ],
    },
    {
      name: 'Compliance Risk',
      description: 'Risk of regulatory non-compliance',
      children: [
        {
          name: 'Regulatory Compliance',
          description: 'Banking regulation adherence',
          children: [
            {
              name: 'Capital Requirements',
              description: 'Basel III/IV capital adequacy compliance',
            },
            {
              name: 'Consumer Protection',
              description: 'Fair lending, disclosure requirements',
            },
            {
              name: 'Privacy Regulations',
              description: 'GDPR, data protection compliance',
            },
          ],
        },
        {
          name: 'AML/CFT',
          description: 'Anti-money laundering and terrorist financing',
          children: [
            {
              name: 'Customer Identification',
              description: 'KYC and CDD failures',
            },
            {
              name: 'Transaction Monitoring',
              description: 'Suspicious activity detection failures',
            },
            {
              name: 'Sanctions Screening',
              description: 'OFAC and sanctions list violations',
            },
          ],
        },
      ],
    },
    {
      name: 'Liquidity Risk',
      description: 'Risk of inability to meet payment obligations',
      children: [
        {
          name: 'Funding Liquidity',
          description: 'Inability to raise funds at reasonable cost',
        },
        {
          name: 'Market Liquidity',
          description: 'Inability to sell assets without significant loss',
        },
        {
          name: 'Intraday Liquidity',
          description: 'Insufficient funds for payment processing',
        },
      ],
    },
  ],

  processes: [
    {
      name: 'Lending',
      description: 'Credit and loan origination processes',
      children: [
        {
          name: 'Consumer Lending',
          description: 'Personal loans, credit cards, auto finance',
        },
        {
          name: 'Mortgage Origination',
          description: 'Home loan application and underwriting',
        },
        {
          name: 'Commercial Lending',
          description: 'Business and corporate loan origination',
        },
        {
          name: 'Credit Monitoring',
          description: 'Portfolio monitoring and collections',
        },
      ],
    },
    {
      name: 'Trading',
      description: 'Treasury and trading operations',
      children: [
        {
          name: 'Fixed Income Trading',
          description: 'Bond and interest rate trading',
        },
        {
          name: 'FX Trading',
          description: 'Currency trading operations',
        },
        {
          name: 'Derivatives',
          description: 'Swap and options trading',
        },
      ],
    },
    {
      name: 'Operations',
      description: 'Back office operations',
      children: [
        {
          name: 'Payment Processing',
          description: 'Wire transfers, ACH, card processing',
        },
        {
          name: 'Trade Settlement',
          description: 'Securities and FX settlement',
        },
        {
          name: 'Account Services',
          description: 'Account opening, maintenance, closing',
        },
        {
          name: 'Reconciliations',
          description: 'Daily reconciliation processes',
        },
      ],
    },
    {
      name: 'Risk Management',
      description: 'Enterprise risk functions',
      children: [
        {
          name: 'Credit Risk Management',
          description: 'Credit analysis and portfolio management',
        },
        {
          name: 'Market Risk Management',
          description: 'Trading risk monitoring and limits',
        },
        {
          name: 'Operational Risk',
          description: 'Incident management and RCSA',
        },
      ],
    },
    {
      name: 'Compliance',
      description: 'Regulatory compliance functions',
      children: [
        {
          name: 'AML Operations',
          description: 'Transaction monitoring and SAR filing',
        },
        {
          name: 'Regulatory Reporting',
          description: 'Basel, call reports, stress testing',
        },
        {
          name: 'Compliance Testing',
          description: 'Compliance monitoring and testing',
        },
      ],
    },
    {
      name: 'Technology',
      description: 'IT and technology functions',
      children: [
        {
          name: 'Core Banking Systems',
          description: 'Core system maintenance and support',
        },
        {
          name: 'Information Security',
          description: 'Cybersecurity and access management',
        },
        {
          name: 'Disaster Recovery',
          description: 'Business continuity and DR',
        },
      ],
    },
  ],

  controls: [
    {
      name: 'Credit Scoring Model Validation',
      description:
        'Annual independent validation of consumer credit scoring models',
      controlType: 'Detective',
      testFrequency: 'annually',
      testProcedure:
        'Review model validation report. Verify independent review. Check model performance metrics against thresholds.',
    },
    {
      name: 'Loan Officer Approval Authority',
      description:
        'Tiered approval limits requiring senior approval for large loans',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Sample 30 loans exceeding officer limit. Verify appropriate approval obtained. Review delegation matrix currency.',
    },
    {
      name: 'Dual Authorization for Wire Transfers',
      description:
        'Two-person approval required for wire transfers above threshold',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Sample 25 wire transfers over threshold. Verify dual approval in system. Review segregation of duties.',
    },
    {
      name: 'Daily P&L Reconciliation',
      description:
        'Trading desk P&L reconciled to general ledger daily',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review reconciliation reports for past 30 days. Investigate breaks over tolerance. Verify sign-off by controller.',
    },
    {
      name: 'VaR Limit Monitoring',
      description:
        'Real-time monitoring of Value at Risk against approved limits',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Review VaR breach reports. Verify escalation followed for breaches. Test calculation accuracy against sample.',
    },
    {
      name: 'KYC Document Verification',
      description:
        'Customer identification documents verified against government database',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Sample 50 new accounts. Verify ID verification completion. Test database connectivity and response accuracy.',
    },
    {
      name: 'OFAC Screening',
      description:
        'All transactions screened against OFAC sanctions list in real-time',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Process test transactions with known matches. Verify alerts generated. Review list update frequency.',
    },
    {
      name: 'Suspicious Activity Review',
      description:
        'AML alerts reviewed and dispositioned within 5 business days',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Calculate average disposition time. Sample 20 alerts for investigation quality. Verify SAR filing timeline.',
    },
    {
      name: 'System Access Review',
      description:
        'Quarterly review of user access rights to critical systems',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Pull access reports for core banking. Verify terminated users removed. Review privileged access justification.',
    },
    {
      name: 'Penetration Testing',
      description:
        'Annual third-party penetration test of internet-facing systems',
      controlType: 'Detective',
      testFrequency: 'annually',
      testProcedure:
        'Review penetration test report. Verify remediation of critical findings. Check scope coverage of all external systems.',
    },
    {
      name: 'Capital Adequacy Calculation',
      description:
        'Monthly calculation and reporting of capital ratios',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review capital calculation working papers. Verify risk-weighted asset calculations. Check against regulatory minimums.',
    },
    {
      name: 'Liquidity Buffer Monitoring',
      description:
        'Daily monitoring of HQLA against LCR requirements',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review daily LCR reports for past 30 days. Verify HQLA eligibility classification. Test stress scenario calculations.',
    },
    {
      name: 'Fraud Detection Model',
      description:
        'Real-time machine learning model for card fraud detection',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Review model performance metrics. Calculate false positive/negative rates. Verify rule updates implemented.',
    },
    {
      name: 'Loan Documentation Checklist',
      description:
        'Standardized checklist ensures all required documents collected',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Sample 30 funded loans. Verify checklist completion. Review exception documentation and approvals.',
    },
    {
      name: 'Disaster Recovery Test',
      description:
        'Semi-annual failover test of critical systems to DR site',
      controlType: 'Corrective',
      testFrequency: 'annually',
      testProcedure:
        'Review DR test results. Verify RTO/RPO met for critical systems. Check remediation of identified gaps.',
    },
  ],

  rctPairings: [
    // Credit Risk pairings
    {
      riskPath: ['Credit Risk', 'Lending', 'Consumer Loan Default'],
      processPath: ['Lending', 'Consumer Lending'],
    },
    {
      riskPath: ['Credit Risk', 'Lending', 'Mortgage Default'],
      processPath: ['Lending', 'Mortgage Origination'],
    },
    {
      riskPath: ['Credit Risk', 'Lending', 'Commercial Loan Default'],
      processPath: ['Lending', 'Commercial Lending'],
    },
    {
      riskPath: ['Credit Risk', 'Lending', 'Concentration Risk'],
      processPath: ['Risk Management', 'Credit Risk Management'],
    },
    {
      riskPath: ['Credit Risk', 'Counterparty', 'Settlement Risk'],
      processPath: ['Operations', 'Trade Settlement'],
    },
    {
      riskPath: ['Credit Risk', 'Counterparty', 'Derivative Exposure'],
      processPath: ['Trading', 'Derivatives'],
    },
    // Market Risk pairings
    {
      riskPath: ['Market Risk', 'Interest Rate Risk', 'Repricing Risk'],
      processPath: ['Risk Management', 'Market Risk Management'],
    },
    {
      riskPath: ['Market Risk', 'Foreign Exchange Risk', 'Transaction Exposure'],
      processPath: ['Trading', 'FX Trading'],
    },
    {
      riskPath: ['Market Risk', 'Equity Risk'],
      processPath: ['Trading', 'Fixed Income Trading'],
    },
    // Operational Risk pairings
    {
      riskPath: ['Operational Risk', 'Process Failures', 'Transaction Errors'],
      processPath: ['Operations', 'Payment Processing'],
    },
    {
      riskPath: ['Operational Risk', 'Process Failures', 'Settlement Failures'],
      processPath: ['Operations', 'Trade Settlement'],
    },
    {
      riskPath: ['Operational Risk', 'Technology Risk', 'System Outages'],
      processPath: ['Technology', 'Core Banking Systems'],
    },
    {
      riskPath: ['Operational Risk', 'Technology Risk', 'Cybersecurity'],
      processPath: ['Technology', 'Information Security'],
    },
    {
      riskPath: ['Operational Risk', 'Fraud', 'External Fraud'],
      processPath: ['Operations', 'Account Services'],
    },
    {
      riskPath: ['Operational Risk', 'Fraud', 'Internal Fraud'],
      processPath: ['Risk Management', 'Operational Risk'],
    },
    // Compliance Risk pairings
    {
      riskPath: ['Compliance Risk', 'Regulatory Compliance', 'Capital Requirements'],
      processPath: ['Compliance', 'Regulatory Reporting'],
    },
    {
      riskPath: ['Compliance Risk', 'AML/CFT', 'Customer Identification'],
      processPath: ['Operations', 'Account Services'],
    },
    {
      riskPath: ['Compliance Risk', 'AML/CFT', 'Transaction Monitoring'],
      processPath: ['Compliance', 'AML Operations'],
    },
    {
      riskPath: ['Compliance Risk', 'AML/CFT', 'Sanctions Screening'],
      processPath: ['Operations', 'Payment Processing'],
    },
    // Liquidity Risk pairings
    {
      riskPath: ['Liquidity Risk', 'Funding Liquidity'],
      processPath: ['Trading', 'Fixed Income Trading'],
    },
    {
      riskPath: ['Liquidity Risk', 'Intraday Liquidity'],
      processPath: ['Operations', 'Payment Processing'],
    },
  ],
}
