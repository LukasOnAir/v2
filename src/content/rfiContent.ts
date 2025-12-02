/**
 * Static RFI (Request for Information) content for vendor assessment documents.
 * This content describes the organization's risk management methodology to help
 * vendors understand requirements during procurement workflows.
 */

export interface RFISection {
  heading: string
  content: string[]
}

export interface RFIContent {
  title: string
  subtitle: string
  sections: RFISection[]
}

export const rfiContent: RFIContent = {
  title: 'Request for Information',
  subtitle: 'Vendor Risk Assessment Questionnaire',
  sections: [
    {
      heading: '1. Introduction and Purpose',
      content: [
        'This Request for Information (RFI) document is intended to gather information about your organization\'s risk management capabilities, control frameworks, and compliance certifications. The information provided will help us evaluate potential vendors as part of our procurement and due diligence process.',
        'Please review the sections below carefully and provide comprehensive responses to help us understand how your organization manages risk, implements controls, and maintains compliance with relevant standards.',
        'We encourage you to be thorough in your responses, as incomplete information may affect our ability to fully assess your organization\'s suitability for partnership.',
      ],
    },
    {
      heading: '2. Company Overview',
      content: [
        'Our organization operates an Enterprise Risk Management (ERM) program designed to identify, assess, and mitigate risks across all business functions. We utilize a structured approach to risk management that encompasses operational, financial, strategic, and compliance risks.',
        'As part of our vendor management process, we require detailed information about the risk management practices of our potential partners. This ensures alignment with our risk appetite and regulatory obligations.',
        'We operate in a regulated environment and are committed to maintaining robust controls and governance practices across our supply chain and third-party relationships.',
      ],
    },
    {
      heading: '3. Risk Management Framework',
      content: [
        'Our risk management methodology follows industry best practices and is aligned with recognized frameworks such as COSO ERM, ISO 31000, and NIST. Key elements of our approach include:',
        'Risk Identification: We maintain a comprehensive risk taxonomy that categorizes risks across multiple dimensions including operational, financial, strategic, compliance, and technology risk categories.',
        'Risk Assessment: Risks are assessed using a standardized scoring methodology that evaluates both likelihood and impact. Gross risk scores represent inherent risk before controls, while net risk scores reflect residual risk after control effectiveness is considered.',
        'Control Framework: We implement three types of controls - Preventative controls to stop risk events from occurring, Detective controls to identify when risk events have occurred, and Corrective controls to remediate issues and restore normal operations.',
        'Risk Monitoring: Continuous monitoring and periodic reassessment ensure that our risk profile remains current and that controls continue to operate effectively.',
      ],
    },
    {
      heading: '4. Information Requested',
      content: [
        'Please provide the following information about your organization:',
        'Company Information: Legal entity name, headquarters location, years in operation, number of employees, and relevant industry experience.',
        'Risk Management Capabilities: Describe your organization\'s approach to risk management, including any formal risk management frameworks or methodologies employed.',
        'Control Environment: Detail the types of controls your organization implements (preventative, detective, corrective) and how control effectiveness is measured and monitored.',
        'Compliance Certifications: List relevant certifications held by your organization (e.g., ISO 27001, SOC 2 Type II, ISO 9001, PCI DSS, HIPAA compliance if applicable).',
        'Security Practices: Describe your information security program, including data protection measures, access controls, encryption standards, and incident response procedures.',
        'Business Continuity: Outline your business continuity and disaster recovery capabilities, including RTO/RPO targets and testing frequency.',
        'Third-Party Risk: Explain how your organization manages risks associated with your own vendors and subcontractors.',
      ],
    },
    {
      heading: '5. Response Format',
      content: [
        'Please structure your response to address each section outlined in this RFI. We recommend organizing your response with clear section headings that correspond to our information requests.',
        'Supporting Documentation: Where applicable, please include copies of relevant certifications, audit reports (e.g., SOC 2 reports), policy documents, or other evidence supporting your responses.',
        'Confidentiality: Information provided in response to this RFI will be treated as confidential and used solely for the purpose of vendor evaluation.',
        'Questions: If you have questions regarding this RFI or require clarification on any items, please contact your designated procurement representative.',
        'Timeline: Please submit your completed response within the timeframe communicated by our procurement team.',
      ],
    },
    {
      heading: '6. Evaluation Criteria',
      content: [
        'Responses will be evaluated based on the following criteria:',
        'Completeness: Thoroughness and clarity of information provided in response to each section of this RFI.',
        'Risk Management Maturity: Demonstration of a mature, formalized approach to risk management with clear governance structures.',
        'Control Effectiveness: Evidence of well-designed and effectively operating controls, supported by independent assurance where available.',
        'Compliance Posture: Relevant certifications and demonstrated commitment to regulatory compliance.',
        'Security Standards: Alignment with industry-standard security practices and frameworks.',
        'Business Resilience: Demonstrated capability to maintain operations during disruptions and recover from incidents.',
        'This evaluation forms part of our overall vendor assessment process, which may include additional due diligence activities following receipt of your response.',
      ],
    },
  ],
}
