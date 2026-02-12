'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import Avatar from './Avatar'
import CloseIcon from '@mui/icons-material/Close'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

// (Types omitted for brevity, assuming standard imports)

export default function StoryViewer({ open, onClose, userId, initialStoryId }: any) {
  const [stories, setStories] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const supabase = createClient()

  const currentStory = stories[currentIndex]
  const isVideo = currentStory?.media_type === 'video'
  const duration = isVideo ? 15000 : 5000 

  // Fetch Logic (Keep existing logic, just wrapping in new UI)
  useEffect(() => {
    if (!open || !userId) return
    const fetchStories = async () => {
      setIsLoading(true)
      // ... (Fetch query logic same as before) ...
      // Mock data for UI demo:
      // setStories(data) 
      setIsLoading(false)
    }
    fetchStories()
  }, [open, userId])

  // Progress Logic
  useEffect(() => {
    if (!open || !currentStory || isPaused || !mediaLoaded) return
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + (100 / (duration / 100))
      })
    }, 100)
    return () => clearInterval(interval)
  }, [currentIndex, open, isPaused, mediaLoaded])

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(p => p + 1)
      setProgress(0)
      setMediaLoaded(false)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(p => p - 1)
      setProgress(0)
      setMediaLoaded(false)
    }
  }, [currentIndex])

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        >
          {/* Main Container */}
          <div className="relative w-full h-full md:max-w-[450px] md:max-h-[850px] md:rounded-3xl overflow-hidden bg-zinc-900 shadow-2xl border border-white/5">
            
            {/* Loading */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {currentStory && (
              <>
                {/* Progress Indicators */}
                <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-3">
                  {stories.map((_, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-white"
                        initial={{ width: idx < currentIndex ? '100%' : '0%' }}
                        animate={{ width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' }}
                        transition={{ duration: 0.1, ease: 'linear' }}
                      />
                    </div>
                  ))}
                </div>

                {/* Header Info */}
                <div className="absolute top-6 left-0 right-0 z-30 px-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={currentStory.user?.avatar_url} 
                      alt="User" 
                      size="sm" 
                      className="border border-white/20 shadow-sm"
                    />
                    <div className="drop-shadow-md">
                      <p className="text-sm font-bold text-white leading-tight">
                        {currentStory.user?.username}
                      </p>
                      <p className="text-[10px] text-white/80 leading-tight">
                        {formatDistanceToNow(new Date(currentStory.created_at))} ago
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button onClick={() => setIsPaused(!isPaused)} className="text-white/90 hover:text-white drop-shadow-md">
                      {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                    </button>
                    <button onClick={onClose} className="text-white/90 hover:text-white drop-shadow-md">
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {/* Media Content */}
                <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                  {!mediaLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-900">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                    </div>
                  )}
                  
                  {isVideo ? (
                    <video
                      src={currentStory.media_url}
                      autoPlay
                      className="w-full h-full object-cover"
                      onLoadedData={() => setMediaLoaded(true)}
                      onEnded={handleNext}
                    />
                  ) : (
                    <img
                      src={currentStory.media_url}
                      alt="Story"
                      className="w-full h-full object-cover"
                      onLoad={() => setMediaLoaded(true)}
                    />
                  )}
                </div>

                {/* Caption Gradient Overlay */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pt-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  {currentStory.caption && (
                    <p className="text-white text-center text-lg font-medium drop-shadow-md leading-relaxed">
                      {currentStory.caption}
                    </p>
                  )}
                </div>

                {/* Invisible Touch Areas for Navigation */}
                <div className="absolute inset-0 z-10 flex">
                  <div className="flex-1 h-full" onClick={handlePrev} />
                  <div className="flex-1 h-full" onClick={handleNext} />
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}