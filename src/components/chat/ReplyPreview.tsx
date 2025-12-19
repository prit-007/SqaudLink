'use client'

interface ReplyPreviewProps {
  sender: string
  text?: string
  imageUrl?: string
  color?: string
  onClick?: () => void
  onDismiss?: () => void // Only used in Input area
}

export default function ReplyPreview({ 
  sender, 
  text, 
  imageUrl, 
  color = 'bg-purple-500', 
  onClick, 
  onDismiss 
}: ReplyPreviewProps) {
  return (
    <div 
      onClick={onClick}
      className={`
        relative flex items-center gap-3 p-2 rounded-lg bg-black/20 overflow-hidden cursor-pointer
        ${onDismiss ? 'mb-2 mx-4 animate-in slide-in-from-bottom-2' : 'mb-1 opacity-90 hover:opacity-100'}
        border-l-4 ${color.replace('bg-', 'border-')}
      `}
    >
      {/* Tiny Image Preview */}
      {imageUrl ? (
        <img src={imageUrl} alt="Reply media" className="w-10 h-10 rounded-md object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">
            <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold truncate ${color.replace('bg-', 'text-')}`}>{sender}</p>
        <p className="text-xs text-white/70 truncate">{text || 'Photo'}</p>
      </div>

      {/* Close Button (Only for Input mode) */}
      {onDismiss && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
