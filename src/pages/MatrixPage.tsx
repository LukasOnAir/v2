import { MatrixGrid, MatrixToolbar } from '@/components/matrix'

export function MatrixPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Risk-Process Matrix
      </h1>

      <MatrixToolbar />
      <MatrixGrid />
    </div>
  )
}
