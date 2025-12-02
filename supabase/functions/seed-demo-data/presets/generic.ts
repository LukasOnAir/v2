/**
 * Generic Preset - Standard ERM demo data
 *
 * Contains risk and process taxonomies following the standard COSO ERM
 * framework, suitable for any organization implementing enterprise risk
 * management for the first time.
 */

import type { PresetData } from './types.ts'

export const genericPreset: PresetData = {
  risks: [
    {
      name: 'Strategic Risk',
      description: 'Risks affecting long-term goals and strategy execution',
      children: [
        {
          name: 'Market Risk',
          description: 'External market and competitive risks',
          children: [
            {
              name: 'Competition',
              description: 'Loss of market share to competitors',
            },
            {
              name: 'Market Disruption',
              description: 'Technology or business model disruption',
            },
            {
              name: 'Customer Concentration',
              description: 'Over-reliance on key customers',
            },
          ],
        },
        {
          name: 'Business Model Risk',
          description: 'Risks to core business model viability',
          children: [
            {
              name: 'Product Obsolescence',
              description: 'Products no longer meeting market needs',
            },
            {
              name: 'Channel Disruption',
              description: 'Distribution channel changes',
            },
          ],
        },
        {
          name: 'Growth Risk',
          description: 'Risks from growth initiatives',
          children: [
            {
              name: 'M&A Integration',
              description: 'Failed integration of acquisitions',
            },
            {
              name: 'Expansion Failure',
              description: 'New market or product launch failures',
            },
          ],
        },
      ],
    },
    {
      name: 'Operational Risk',
      description: 'Risks from internal processes, people, and systems',
      children: [
        {
          name: 'Process Risk',
          description: 'Business process failures',
          children: [
            {
              name: 'Process Inefficiency',
              description: 'Ineffective or inefficient processes',
            },
            {
              name: 'Quality Failures',
              description: 'Product or service quality defects',
            },
            {
              name: 'Delivery Delays',
              description: 'Failure to meet delivery commitments',
            },
          ],
        },
        {
          name: 'People Risk',
          description: 'Human resource risks',
          children: [
            {
              name: 'Key Person Dependency',
              description: 'Over-reliance on critical individuals',
            },
            {
              name: 'Skills Gap',
              description: 'Insufficient skills or training',
            },
            {
              name: 'Employee Misconduct',
              description: 'Fraud, theft, or policy violations',
            },
          ],
        },
        {
          name: 'Technology Risk',
          description: 'IT and systems risks',
          children: [
            {
              name: 'System Failure',
              description: 'Critical system downtime',
            },
            {
              name: 'Cybersecurity',
              description: 'Data breaches and cyber attacks',
            },
            {
              name: 'Data Quality',
              description: 'Inaccurate or incomplete data',
            },
          ],
        },
        {
          name: 'Supply Chain Risk',
          description: 'Vendor and supply risks',
          children: [
            {
              name: 'Supplier Failure',
              description: 'Critical supplier disruption',
            },
            {
              name: 'Supply Shortage',
              description: 'Material or component availability',
            },
          ],
        },
      ],
    },
    {
      name: 'Financial Risk',
      description: 'Risks affecting financial performance and position',
      children: [
        {
          name: 'Liquidity Risk',
          description: 'Inability to meet payment obligations',
          children: [
            {
              name: 'Cash Flow Shortage',
              description: 'Insufficient operating cash',
            },
            {
              name: 'Credit Facility Access',
              description: 'Inability to draw on credit lines',
            },
          ],
        },
        {
          name: 'Credit Risk',
          description: 'Customer credit and receivables risk',
          children: [
            {
              name: 'Customer Default',
              description: 'Accounts receivable write-offs',
            },
            {
              name: 'Concentration Risk',
              description: 'Large exposure to single debtor',
            },
          ],
        },
        {
          name: 'Market Price Risk',
          description: 'Exposure to price fluctuations',
          children: [
            {
              name: 'Commodity Prices',
              description: 'Raw material cost volatility',
            },
            {
              name: 'Foreign Exchange',
              description: 'Currency exposure on transactions',
            },
            {
              name: 'Interest Rates',
              description: 'Borrowing cost fluctuations',
            },
          ],
        },
      ],
    },
    {
      name: 'Compliance Risk',
      description: 'Regulatory and legal compliance risks',
      children: [
        {
          name: 'Regulatory Risk',
          description: 'Government and industry regulation',
          children: [
            {
              name: 'Licensing Requirements',
              description: 'Failure to maintain required licenses',
            },
            {
              name: 'Regulatory Changes',
              description: 'New regulations affecting operations',
            },
            {
              name: 'Reporting Requirements',
              description: 'Mandatory filing and disclosure failures',
            },
          ],
        },
        {
          name: 'Legal Risk',
          description: 'Legal and contractual risks',
          children: [
            {
              name: 'Contract Disputes',
              description: 'Customer or vendor contract litigation',
            },
            {
              name: 'Intellectual Property',
              description: 'IP infringement claims',
            },
            {
              name: 'Employment Claims',
              description: 'Employee litigation and complaints',
            },
          ],
        },
        {
          name: 'Data Privacy',
          description: 'Personal data protection compliance',
          children: [
            {
              name: 'GDPR Compliance',
              description: 'EU data protection regulation',
            },
            {
              name: 'Data Breach Notification',
              description: 'Required breach reporting',
            },
          ],
        },
      ],
    },
    {
      name: 'Reputational Risk',
      description: 'Risks to brand and stakeholder perception',
      children: [
        {
          name: 'Brand Damage',
          description: 'Negative publicity and brand erosion',
          children: [
            {
              name: 'Product Issues',
              description: 'Product safety or quality incidents',
            },
            {
              name: 'Service Failures',
              description: 'Highly visible service breakdowns',
            },
          ],
        },
        {
          name: 'Social Responsibility',
          description: 'ESG and ethical perception',
          children: [
            {
              name: 'Environmental Impact',
              description: 'Pollution or sustainability concerns',
            },
            {
              name: 'Labor Practices',
              description: 'Workplace safety or fairness issues',
            },
          ],
        },
      ],
    },
  ],

  processes: [
    {
      name: 'Core Operations',
      description: 'Primary business operations',
      children: [
        {
          name: 'Production',
          description: 'Manufacturing or service delivery',
        },
        {
          name: 'Quality Assurance',
          description: 'Quality control and testing',
        },
        {
          name: 'Logistics',
          description: 'Inventory and distribution',
        },
        {
          name: 'Customer Service',
          description: 'Support and service delivery',
        },
      ],
    },
    {
      name: 'Sales & Marketing',
      description: 'Revenue generation activities',
      children: [
        {
          name: 'Business Development',
          description: 'New customer acquisition',
        },
        {
          name: 'Account Management',
          description: 'Existing customer relationships',
        },
        {
          name: 'Marketing',
          description: 'Brand and product marketing',
        },
      ],
    },
    {
      name: 'Support Functions',
      description: 'Corporate support services',
      children: [
        {
          name: 'Finance',
          description: 'Accounting and financial management',
        },
        {
          name: 'Human Resources',
          description: 'People and talent management',
        },
        {
          name: 'Information Technology',
          description: 'IT systems and support',
        },
        {
          name: 'Legal',
          description: 'Legal affairs and contracts',
        },
      ],
    },
    {
      name: 'Procurement',
      description: 'Purchasing and vendor management',
      children: [
        {
          name: 'Sourcing',
          description: 'Vendor selection and contracting',
        },
        {
          name: 'Purchasing',
          description: 'Order processing and receiving',
        },
        {
          name: 'Vendor Management',
          description: 'Supplier relationship and performance',
        },
      ],
    },
    {
      name: 'Management',
      description: 'Executive and governance functions',
      children: [
        {
          name: 'Strategic Planning',
          description: 'Strategy development and review',
        },
        {
          name: 'Performance Management',
          description: 'KPI monitoring and reporting',
        },
        {
          name: 'Risk Management',
          description: 'Enterprise risk oversight',
        },
      ],
    },
    {
      name: 'Compliance',
      description: 'Regulatory and policy compliance',
      children: [
        {
          name: 'Regulatory Compliance',
          description: 'External regulation adherence',
        },
        {
          name: 'Internal Audit',
          description: 'Internal control testing',
        },
        {
          name: 'Policy Management',
          description: 'Corporate policy maintenance',
        },
      ],
    },
  ],

  controls: [
    {
      name: 'Strategic Plan Review',
      description:
        'Quarterly board review of strategic plan progress and market changes',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Review board minutes. Verify strategic KPIs presented. Check action items from prior review addressed.',
    },
    {
      name: 'Competitive Intelligence Monitoring',
      description:
        'Monthly review of competitor activities and market trends',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review market intelligence reports. Verify distribution to leadership. Check responses to competitive threats.',
    },
    {
      name: 'Standard Operating Procedures',
      description:
        'Documented SOPs for all critical business processes',
      controlType: 'Preventative',
      testFrequency: 'annually',
      testProcedure:
        'Review SOP inventory for completeness. Sample test 10 processes against documentation. Verify annual review dates.',
    },
    {
      name: 'Quality Control Inspection',
      description:
        'Systematic inspection of products/services before delivery',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review inspection logs. Calculate defect rate by category. Verify failed items prevented from release.',
    },
    {
      name: 'Succession Planning',
      description:
        'Documented succession plans for key leadership positions',
      controlType: 'Preventative',
      testFrequency: 'annually',
      testProcedure:
        'Review succession plans for completeness. Verify development plans for successors. Test emergency contact procedures.',
    },
    {
      name: 'Employee Background Verification',
      description:
        'Background checks completed for all new hires before start date',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Sample 20 recent hires. Verify background check completion date vs start date. Review exceptions.',
    },
    {
      name: 'System Backup and Recovery',
      description:
        'Daily backup of critical systems with periodic recovery testing',
      controlType: 'Corrective',
      testFrequency: 'quarterly',
      testProcedure:
        'Review backup logs for past 90 days. Perform recovery test for sample system. Verify RTO/RPO met.',
    },
    {
      name: 'Access Control Review',
      description:
        'Quarterly review of user access to critical systems',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Pull access reports for critical systems. Verify terminated users removed. Review privileged access justification.',
    },
    {
      name: 'Vendor Performance Scorecard',
      description:
        'Monthly tracking of critical vendor performance metrics',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review scorecards for critical vendors. Verify SLA metrics calculated correctly. Check action on poor performers.',
    },
    {
      name: 'Cash Flow Forecasting',
      description:
        'Weekly 13-week rolling cash flow forecast',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review forecast accuracy vs actuals. Verify assumptions documented. Check variance explanations.',
    },
    {
      name: 'Credit Limit Authorization',
      description:
        'Tiered approval matrix for customer credit limits',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Sample 25 credit limit changes. Verify approval within authority matrix. Review exception handling.',
    },
    {
      name: 'Regulatory Calendar',
      description:
        'Centralized tracking of all regulatory filing deadlines',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Review calendar completeness. Verify upcoming deadlines assigned owners. Check prior period filings timely.',
    },
    {
      name: 'Contract Review Checklist',
      description:
        'Legal review required for contracts above threshold',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Sample 20 contracts over threshold. Verify legal review completion. Check standard terms included.',
    },
    {
      name: 'Privacy Impact Assessment',
      description:
        'PIA required for new systems processing personal data',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Review new system implementations. Verify PIA completed before go-live. Check identified risks mitigated.',
    },
    {
      name: 'Incident Response Plan',
      description:
        'Documented and tested incident response procedures',
      controlType: 'Corrective',
      testFrequency: 'annually',
      testProcedure:
        'Review incident response plan currency. Conduct tabletop exercise. Verify contact lists current.',
    },
  ],

  rctPairings: [
    // Strategic Risk pairings
    {
      riskPath: ['Strategic Risk', 'Market Risk', 'Competition'],
      processPath: ['Sales & Marketing', 'Business Development'],
    },
    {
      riskPath: ['Strategic Risk', 'Market Risk', 'Customer Concentration'],
      processPath: ['Sales & Marketing', 'Account Management'],
    },
    {
      riskPath: ['Strategic Risk', 'Business Model Risk', 'Product Obsolescence'],
      processPath: ['Management', 'Strategic Planning'],
    },
    {
      riskPath: ['Strategic Risk', 'Growth Risk', 'M&A Integration'],
      processPath: ['Management', 'Strategic Planning'],
    },
    // Operational Risk pairings
    {
      riskPath: ['Operational Risk', 'Process Risk', 'Quality Failures'],
      processPath: ['Core Operations', 'Quality Assurance'],
    },
    {
      riskPath: ['Operational Risk', 'Process Risk', 'Delivery Delays'],
      processPath: ['Core Operations', 'Logistics'],
    },
    {
      riskPath: ['Operational Risk', 'People Risk', 'Key Person Dependency'],
      processPath: ['Support Functions', 'Human Resources'],
    },
    {
      riskPath: ['Operational Risk', 'People Risk', 'Skills Gap'],
      processPath: ['Support Functions', 'Human Resources'],
    },
    {
      riskPath: ['Operational Risk', 'Technology Risk', 'System Failure'],
      processPath: ['Support Functions', 'Information Technology'],
    },
    {
      riskPath: ['Operational Risk', 'Technology Risk', 'Cybersecurity'],
      processPath: ['Support Functions', 'Information Technology'],
    },
    {
      riskPath: ['Operational Risk', 'Supply Chain Risk', 'Supplier Failure'],
      processPath: ['Procurement', 'Vendor Management'],
    },
    // Financial Risk pairings
    {
      riskPath: ['Financial Risk', 'Liquidity Risk', 'Cash Flow Shortage'],
      processPath: ['Support Functions', 'Finance'],
    },
    {
      riskPath: ['Financial Risk', 'Credit Risk', 'Customer Default'],
      processPath: ['Support Functions', 'Finance'],
    },
    {
      riskPath: ['Financial Risk', 'Market Price Risk', 'Commodity Prices'],
      processPath: ['Procurement', 'Sourcing'],
    },
    {
      riskPath: ['Financial Risk', 'Market Price Risk', 'Foreign Exchange'],
      processPath: ['Support Functions', 'Finance'],
    },
    // Compliance Risk pairings
    {
      riskPath: ['Compliance Risk', 'Regulatory Risk', 'Reporting Requirements'],
      processPath: ['Compliance', 'Regulatory Compliance'],
    },
    {
      riskPath: ['Compliance Risk', 'Legal Risk', 'Contract Disputes'],
      processPath: ['Support Functions', 'Legal'],
    },
    {
      riskPath: ['Compliance Risk', 'Legal Risk', 'Employment Claims'],
      processPath: ['Support Functions', 'Human Resources'],
    },
    {
      riskPath: ['Compliance Risk', 'Data Privacy', 'GDPR Compliance'],
      processPath: ['Compliance', 'Regulatory Compliance'],
    },
    // Reputational Risk pairings
    {
      riskPath: ['Reputational Risk', 'Brand Damage', 'Product Issues'],
      processPath: ['Core Operations', 'Quality Assurance'],
    },
    {
      riskPath: ['Reputational Risk', 'Brand Damage', 'Service Failures'],
      processPath: ['Core Operations', 'Customer Service'],
    },
  ],
}
