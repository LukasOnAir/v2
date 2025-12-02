/**
 * Casino Preset - Holland Casino themed demo data
 *
 * Contains risk and process taxonomies typical of casino operations,
 * with focus on gaming, AML/KYC compliance, and security.
 */

import type { PresetData } from './types.ts'

export const casinoPreset: PresetData = {
  risks: [
    {
      name: 'Operational Risk',
      description: 'Risks from internal operations and processes',
      children: [
        {
          name: 'Gaming Operations',
          description: 'Risks related to casino floor operations',
          children: [
            {
              name: 'Table Game Integrity',
              description: 'Card counting, cheating, dealer collusion',
            },
            {
              name: 'Slot Machine Malfunction',
              description: 'Technical failures, payout errors, RNG issues',
            },
            {
              name: 'Cash Handling Errors',
              description: 'Errors in cage operations, chip counts, cash drops',
            },
            {
              name: 'Game Equipment Failure',
              description: 'Cards, chips, roulette wheels, dice defects',
            },
          ],
        },
        {
          name: 'Security',
          description: 'Physical and digital security risks',
          children: [
            {
              name: 'Theft & Fraud',
              description: 'Employee theft, customer fraud, chip counterfeiting',
            },
            {
              name: 'Surveillance Gaps',
              description: 'Camera coverage, monitoring failures, blind spots',
            },
            {
              name: 'Physical Security',
              description: 'Unauthorized access, patron safety incidents',
            },
          ],
        },
        {
          name: 'IT Systems',
          description: 'Technology and systems risks',
          children: [
            {
              name: 'System Downtime',
              description: 'Gaming system outages, network failures',
            },
            {
              name: 'Cybersecurity',
              description: 'Data breaches, hacking attempts, malware',
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
          name: 'AML/KYC',
          description: 'Anti-money laundering compliance',
          children: [
            {
              name: 'CTR Filing',
              description: 'Currency Transaction Report compliance failures',
            },
            {
              name: 'SAR Filing',
              description: 'Suspicious Activity Report compliance failures',
            },
            {
              name: 'Customer Due Diligence',
              description: 'Know Your Customer verification failures',
            },
            {
              name: 'Transaction Monitoring',
              description: 'Failure to detect structuring or layering',
            },
          ],
        },
        {
          name: 'Gaming License',
          description: 'License maintenance and conditions',
          children: [
            {
              name: 'Reporting Requirements',
              description: 'Regulatory filings and disclosure failures',
            },
            {
              name: 'Employee Licensing',
              description: 'Staff gaming permits and background checks',
            },
            {
              name: 'License Conditions',
              description: 'Violations of specific license terms',
            },
          ],
        },
        {
          name: 'Responsible Gambling',
          description: 'Player protection obligations',
          children: [
            {
              name: 'Self-Exclusion Program',
              description: 'Failure to enforce self-exclusion lists',
            },
            {
              name: 'Problem Gambling Detection',
              description: 'Failure to identify problem gambling behavior',
            },
          ],
        },
      ],
    },
    {
      name: 'Financial Risk',
      description: 'Financial and economic risks',
      children: [
        {
          name: 'Cash Management',
          description: 'Cash flow and handling risks',
          children: [
            {
              name: 'Vault Discrepancies',
              description: 'Cash count variances, reconciliation errors',
            },
            {
              name: 'Float Management',
              description: 'Insufficient chips or cash for payouts',
            },
          ],
        },
        {
          name: 'Credit Risk',
          description: 'Customer credit and marker risks',
          children: [
            {
              name: 'Marker Collection',
              description: 'Uncollectible player markers and credit',
            },
            {
              name: 'High Roller Credit',
              description: 'Extended credit to VIP players',
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
          name: 'Competition',
          description: 'Competitive pressures and market share',
        },
        {
          name: 'Reputation',
          description: 'Brand damage, negative publicity',
        },
        {
          name: 'Regulatory Changes',
          description: 'New laws affecting gaming operations',
        },
      ],
    },
  ],

  processes: [
    {
      name: 'Gaming Floor',
      description: 'Casino gaming operations',
      children: [
        {
          name: 'Table Games',
          description: 'Blackjack, roulette, poker, baccarat operations',
        },
        {
          name: 'Slot Operations',
          description: 'Slot machine management and maintenance',
        },
        {
          name: 'Cage Operations',
          description: 'Cash handling, chip exchange, markers',
        },
        {
          name: 'Pit Management',
          description: 'Table supervision and player rating',
        },
      ],
    },
    {
      name: 'Customer Services',
      description: 'Guest relations and services',
      children: [
        {
          name: 'VIP Services',
          description: 'High roller programs and junkets',
        },
        {
          name: 'Loyalty Program',
          description: 'Player rewards and comp management',
        },
        {
          name: 'Guest Complaints',
          description: 'Dispute resolution and service recovery',
        },
      ],
    },
    {
      name: 'Back Office',
      description: 'Administrative functions',
      children: [
        {
          name: 'Finance & Accounting',
          description: 'Revenue recognition, reconciliation, reporting',
        },
        {
          name: 'Human Resources',
          description: 'Hiring, training, employee licensing',
        },
        {
          name: 'IT Operations',
          description: 'Systems maintenance and support',
        },
      ],
    },
    {
      name: 'Compliance',
      description: 'Regulatory compliance functions',
      children: [
        {
          name: 'AML Monitoring',
          description: 'Transaction surveillance and alerts',
        },
        {
          name: 'Regulatory Reporting',
          description: 'CTR, SAR, and gaming commission filings',
        },
        {
          name: 'Internal Audit',
          description: 'Compliance testing and verification',
        },
      ],
    },
    {
      name: 'Security',
      description: 'Physical and surveillance security',
      children: [
        {
          name: 'Surveillance',
          description: '24/7 camera monitoring and recording',
        },
        {
          name: 'Physical Security',
          description: 'Access control and patrol',
        },
        {
          name: 'Investigations',
          description: 'Incident investigation and reporting',
        },
      ],
    },
  ],

  controls: [
    {
      name: 'Dual Verification for High-Value Payouts',
      description:
        'Two staff members must verify any payout over EUR 10,000 before release',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Review sample of 20 high-value payouts from previous month. Verify dual signature present on all. Check CCTV footage for random sample of 5.',
    },
    {
      name: '24-Hour Surveillance Coverage',
      description:
        'Continuous camera coverage of all gaming floor areas with no blind spots',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Walk gaming floor with surveillance map. Verify all cameras operational. Review 8 hours of random footage for quality and coverage.',
    },
    {
      name: 'Daily CTR Filing Review',
      description:
        'Compliance officer reviews and files all Currency Transaction Reports within 24 hours',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Sample 30 CTRs from prior month. Verify filing timestamps within 24 hours. Check completeness of customer information.',
    },
    {
      name: 'Monthly AML Training Certification',
      description:
        'All customer-facing staff complete AML awareness training monthly',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Pull training completion report. Verify 100% completion rate. Review training content for regulatory currency.',
    },
    {
      name: 'Self-Exclusion List Check',
      description:
        'All loyalty program enrollments checked against self-exclusion registry',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Test sample of 50 new enrollments. Verify registry check performed. Attempt test enrollment with excluded person.',
    },
    {
      name: 'Daily Cash Reconciliation',
      description:
        'All cage and vault cash counts reconciled daily with variance reporting',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Review daily reconciliation reports for past 30 days. Investigate any variances over EUR 100. Verify sign-offs by shift supervisors.',
    },
    {
      name: 'Card Shuffle Procedure Verification',
      description:
        'Dealers follow standardized shuffle procedures monitored by pit boss',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Observe shuffle procedures at 10 random tables. Verify pit boss monitoring. Review training records for shuffle certification.',
    },
    {
      name: 'Slot Machine RNG Testing',
      description:
        'Random Number Generators tested by approved testing lab annually',
      controlType: 'Detective',
      testFrequency: 'annually',
      testProcedure:
        'Obtain RNG certification reports from testing lab. Verify all machines tested within 12 months. Review payout percentage compliance.',
    },
    {
      name: 'Employee Background Check',
      description:
        'All new hires complete background verification before starting work',
      controlType: 'Preventative',
      testFrequency: 'quarterly',
      testProcedure:
        'Review HR files for employees hired in quarter. Verify background check completion dates. Sample check 10 employees against registry.',
    },
    {
      name: 'Suspicious Transaction Alert Response',
      description:
        'All AML alerts reviewed and dispositioned within 24 hours',
      controlType: 'Detective',
      testFrequency: 'monthly',
      testProcedure:
        'Pull alert disposition report. Calculate average response time. Review sample of 20 alerts for quality of investigation.',
    },
    {
      name: 'Chip Inventory Count',
      description: 'Weekly physical count of all chip inventory in vault and on floor',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Attend surprise chip count. Verify reconciliation to system inventory. Review variance reports from past quarter.',
    },
    {
      name: 'Access Control Review',
      description:
        'Quarterly review of system and physical access rights for all employees',
      controlType: 'Detective',
      testFrequency: 'quarterly',
      testProcedure:
        'Pull access rights report. Verify terminated employees removed. Review elevated access for business need.',
    },
    {
      name: 'CCTV Footage Retention',
      description:
        'Surveillance footage retained for minimum 30 days per regulatory requirement',
      controlType: 'Directive',
      testFrequency: 'monthly',
      testProcedure:
        'Request footage from 31 days ago for random camera. Verify availability and quality. Check storage capacity projections.',
    },
    {
      name: 'Marker Credit Approval',
      description:
        'Credit manager approval required for all player markers over EUR 25,000',
      controlType: 'Preventative',
      testFrequency: 'monthly',
      testProcedure:
        'Review marker issuances over EUR 25,000. Verify credit manager sign-off. Check credit limit compliance.',
    },
    {
      name: 'Problem Gambling Intervention Training',
      description:
        'Staff trained to recognize and respond to problem gambling indicators',
      controlType: 'Preventative',
      testFrequency: 'annually',
      testProcedure:
        'Review training completion records. Test staff knowledge with scenario questions. Verify intervention protocols documented.',
    },
  ],

  rctPairings: [
    // Gaming Operations risks paired with relevant processes
    {
      riskPath: ['Operational Risk', 'Gaming Operations', 'Table Game Integrity'],
      processPath: ['Gaming Floor', 'Table Games'],
    },
    {
      riskPath: ['Operational Risk', 'Gaming Operations', 'Slot Machine Malfunction'],
      processPath: ['Gaming Floor', 'Slot Operations'],
    },
    {
      riskPath: ['Operational Risk', 'Gaming Operations', 'Cash Handling Errors'],
      processPath: ['Gaming Floor', 'Cage Operations'],
    },
    // Security risks paired with security processes
    {
      riskPath: ['Operational Risk', 'Security', 'Theft & Fraud'],
      processPath: ['Security', 'Surveillance'],
    },
    {
      riskPath: ['Operational Risk', 'Security', 'Surveillance Gaps'],
      processPath: ['Security', 'Surveillance'],
    },
    {
      riskPath: ['Operational Risk', 'Security', 'Physical Security'],
      processPath: ['Security', 'Physical Security'],
    },
    // AML risks paired with compliance processes
    {
      riskPath: ['Compliance Risk', 'AML/KYC', 'CTR Filing'],
      processPath: ['Compliance', 'Regulatory Reporting'],
    },
    {
      riskPath: ['Compliance Risk', 'AML/KYC', 'SAR Filing'],
      processPath: ['Compliance', 'Regulatory Reporting'],
    },
    {
      riskPath: ['Compliance Risk', 'AML/KYC', 'Customer Due Diligence'],
      processPath: ['Customer Services', 'VIP Services'],
    },
    {
      riskPath: ['Compliance Risk', 'AML/KYC', 'Transaction Monitoring'],
      processPath: ['Compliance', 'AML Monitoring'],
    },
    // Gaming license risks
    {
      riskPath: ['Compliance Risk', 'Gaming License', 'Employee Licensing'],
      processPath: ['Back Office', 'Human Resources'],
    },
    {
      riskPath: ['Compliance Risk', 'Gaming License', 'Reporting Requirements'],
      processPath: ['Compliance', 'Regulatory Reporting'],
    },
    // Responsible gambling
    {
      riskPath: ['Compliance Risk', 'Responsible Gambling', 'Self-Exclusion Program'],
      processPath: ['Customer Services', 'Loyalty Program'],
    },
    {
      riskPath: ['Compliance Risk', 'Responsible Gambling', 'Problem Gambling Detection'],
      processPath: ['Gaming Floor', 'Pit Management'],
    },
    // Financial risks
    {
      riskPath: ['Financial Risk', 'Cash Management', 'Vault Discrepancies'],
      processPath: ['Gaming Floor', 'Cage Operations'],
    },
    {
      riskPath: ['Financial Risk', 'Cash Management', 'Float Management'],
      processPath: ['Gaming Floor', 'Cage Operations'],
    },
    {
      riskPath: ['Financial Risk', 'Credit Risk', 'Marker Collection'],
      processPath: ['Back Office', 'Finance & Accounting'],
    },
    {
      riskPath: ['Financial Risk', 'Credit Risk', 'High Roller Credit'],
      processPath: ['Customer Services', 'VIP Services'],
    },
    // IT risks
    {
      riskPath: ['Operational Risk', 'IT Systems', 'System Downtime'],
      processPath: ['Back Office', 'IT Operations'],
    },
    {
      riskPath: ['Operational Risk', 'IT Systems', 'Cybersecurity'],
      processPath: ['Back Office', 'IT Operations'],
    },
  ],
}
