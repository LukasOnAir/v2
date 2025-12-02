import { useState, useEffect } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface PhotoUploadProps {
  onUpload: (url: string | null) => void
  existingUrl?: string
}

export function PhotoUpload({ onUpload, existingUrl }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(existingUrl || null)
  const [error, setError] = useState<string | null>(null)

  // Sync preview with existingUrl prop changes
  useEffect(() => {
    if (existingUrl) {
      setPreview(existingUrl)
    }
  }, [existingUrl])

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (< 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Image must be less than 10MB')
      toast.error('Image must be less than 10MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Create preview immediately
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)

      // Generate unique filename
      const extension = file.name.split('.').pop() || 'jpg'
      const filename = `${crypto.randomUUID()}.${extension}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('test-evidence')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('test-evidence')
        .getPublicUrl(filename)

      onUpload(urlData.publicUrl)
      toast.success('Photo uploaded')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      toast.error(message)
      setPreview(null)
      onUpload(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Evidence preview"
            className="w-full rounded-lg object-cover max-h-48"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      <label className="flex items-center justify-center gap-2 w-full min-h-[48px] px-4 py-3 bg-surface-elevated border border-surface-border rounded-lg cursor-pointer hover:bg-surface-overlay transition-colors focus-within:ring-2 focus-within:ring-accent-500 focus-within:ring-offset-2 focus-within:ring-offset-surface-base">
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            <span className="text-sm text-text-secondary">Uploading...</span>
          </>
        ) : (
          <>
            <Camera className="w-5 h-5 text-accent-400" />
            <span className="text-sm text-text-primary">
              {preview ? 'Replace Photo' : 'Take Photo'}
            </span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
