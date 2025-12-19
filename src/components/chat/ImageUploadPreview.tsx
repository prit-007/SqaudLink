'use client'

import { useState, useRef } from 'react'

interface ImageUploadPreviewProps {
  onImageSelected: (file: File, preview: string) => void
  onCancel: () => void
}

export default function ImageUploadPreview({ onImageSelected, onCancel }: ImageUploadPreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSend = () => {
    if (selectedFile && preview) {
      onImageSelected(selectedFile, preview)
      setPreview(null)
      setSelectedFile(null)
    }
  }

  if (!preview) {
    return (
      <div className="p-4 border-t border-white/10">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 text-white font-medium transition-all flex items-center justify-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          Choose Image
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Image Preview */}
        <div className="mb-4 rounded-2xl overflow-hidden">
          <img src={preview} alt="Preview" className="w-full h-auto max-h-[60vh] object-contain" />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 text-white font-medium transition-all"
          >
            Send Image
          </button>
        </div>
      </div>
    </div>
  )
}
