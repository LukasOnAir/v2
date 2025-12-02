import * as Dialog from '@radix-ui/react-dialog'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { FileText, X, Download } from 'lucide-react'
import { RFIDocument } from './RFIDocument'

interface RFIDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RFIDialog({ open, onOpenChange }: RFIDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-h-[85vh] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-surface-border shrink-0">
            <div className="p-2 bg-accent-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-accent-500" />
            </div>
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              Request for Information
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="ml-auto p-2 rounded-lg hover:bg-surface-overlay text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Content - PDF Preview */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="h-[500px] border border-surface-border rounded-lg overflow-hidden">
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <RFIDocument />
              </PDFViewer>
            </div>
          </div>

          {/* Footer with actions */}
          <div className="flex justify-end gap-2 p-4 border-t border-surface-border shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <PDFDownloadLink
              document={<RFIDocument />}
              fileName="RiskLytix_Vendor_RFI.pdf"
            >
              {({ loading }) => (
                <button
                  type="button"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  {loading ? 'Generating...' : 'Download PDF'}
                </button>
              )}
            </PDFDownloadLink>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
