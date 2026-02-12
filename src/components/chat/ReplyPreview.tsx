'use client'

import { motion } from 'framer-motion'
import CloseIcon from '@mui/icons-material/Close'

interface ReplyPreviewProps {
  sender: string
  text?: string
  imageUrl?: string
  color?: string
  onClick?: () => void
  onDismiss?: () => void
}

export default function ReplyPreview({
  sender,
  text,
  imageUrl,
  color = 'bg-indigo-500',
  onClick,
  onDismiss
}: ReplyPreviewProps) {

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
      animate={{ opacity: 1, height: 'auto', marginBottom: 8, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="origin-bottom"
    >
      <div
        onClick={onClick}
        className="
          relative flex items-center gap-3 p-2 rounded-xl 
          bg-white/10 dark:bg-zinc-800/80 backdrop-blur-md 
          border border-white/10 shadow-lg cursor-pointer overflow-hidden
        "
      >
        {/* Accent Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`} />

        {/* Image Preview */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Reply media"
            className="w-10 h-10 rounded-lg object-cover ml-2 border border-white/10 bg-black/20"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center ml-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0 py-0.5 pr-8">
          <p className="text-[11px] font-bold text-indigo-400 leading-tight mb-0.5 flex items-center gap-1">
            <span className="opacity-60">Replying to</span> {sender}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate opacity-90">
            {text || 'Photo Attachment'}
          </p>
        </div>

        {onDismiss && (
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
          </button>
        )}
      </div>
    </motion.div>
  )
}