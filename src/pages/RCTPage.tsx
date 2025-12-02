import { RCTTable } from '@/components/rct'

export function RCTPage() {
  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Risk Control Table
      </h1>
      <div className="flex-1 min-h-0">
        <RCTTable />
      </div>
    </div>
  )
}
