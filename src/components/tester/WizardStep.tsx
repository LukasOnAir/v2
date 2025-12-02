import type { ReactNode } from 'react'

interface WizardStepInfo {
  id: string
  title: string
  subtitle: string
}

interface WizardStepProps {
  step: WizardStepInfo
  children: ReactNode
}

export function WizardStep({ step, children }: WizardStepProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-text-primary">{step.title}</h2>
        <p className="text-sm text-text-secondary mt-1">{step.subtitle}</p>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
