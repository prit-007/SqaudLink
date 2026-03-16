'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import Avatar from './Avatar'
import CloseIcon from '@mui/icons-material/Close'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

type StoryItem = {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption?: string
  created_at: string
  user?: {
    username?: string
    avatar_url?: string
  }
  is_viewed?: boolean
}

type StoryViewRow = {
  viewer_id: string
}

type StoryRow = {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption?: string
  created_at: string
  user?: {
    username?: string
    avatar_url?: string
  }
  story_views?: StoryViewRow[]
}

type StoryViewerProps = {
  open: boolean
  onClose: () => void
  userId: string
  initialStoryId?: string
  onStoryViewed?: (userId: string, storyId: string) => void
}

export default function StoryViewer({ open, onClose, userId, initialStoryId, onStoryViewed }: StoryViewerProps) {
  const [stories, setStories] = useState<StoryItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const currentStory = stories[currentIndex]
  const isVideo = currentStory?.media_type === 'video'
  const duration = isVideo ? 15000 : 5000

  const visibleStories = useMemo(() => stories.filter(Boolean), [stories])

  const fetchStories = useCallback(async () => {
    if (!open || !userId) return

    setIsLoading(true)
    setProgress(0)
    setMediaLoaded(false)

    try {
      const { data: authData } = await supabase.auth.getUser()
      const currentViewerId = authData.user?.id || null
      setViewerId(currentViewerId)

      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          caption,
          created_at,
          user:profiles!stories_user_id_fkey(username, avatar_url),
          story_views!left(viewer_id)
        `)
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      const formatted: StoryItem[] = ((data || []) as StoryRow[]).map((story) => ({
        id: story.id,
        user_id: story.user_id,
        media_url: story.media_url,
        media_type: story.media_type,
        caption: story.caption,
        created_at: story.created_at,
        user: story.user
          ? {
              username: story.user.username,
              avatar_url: story.user.avatar_url,
            }
          : undefined,
        is_viewed: currentViewerId ? (story.story_views || []).some((v) => v.viewer_id === currentViewerId) : false,
      }))

      setStories(formatted)

      if (formatted.length === 0) {
        setCurrentIndex(0)
        return
      }

      if (initialStoryId) {
        const idx = formatted.findIndex((s) => s.id === initialStoryId)
        setCurrentIndex(idx >= 0 ? idx : 0)
      } else {
        const firstUnviewed = formatted.findIndex((s) => !s.is_viewed)
        setCurrentIndex(firstUnviewed >= 0 ? firstUnviewed : 0)
      }
    } catch (error) {
      console.error('Failed to fetch stories for viewer:', error)
    } finally {
      setIsLoading(false)
    }
  }, [initialStoryId, open, supabase, userId])

  useEffect(() => {
    void fetchStories()
  }, [fetchStories])

  useEffect(() => {
    if (!open || !currentStory || !viewerId) return
    if (currentStory.user_id === viewerId) return
    if (currentStory.is_viewed) return

    const markViewed = async () => {
      try {
        const { error } = await supabase
          .from('story_views')
          .insert({
            story_id: currentStory.id,
            viewer_id: viewerId,
            viewed_at: new Date().toISOString(),
          })

        // Already viewed by this user in a previous open race; treat as success.
        if (error && error.code !== '23505') {
          return
        }

        setStories((prev) =>
          prev.map((story) =>
            story.id === currentStory.id ? { ...story, is_viewed: true } : story
          )
        )

        onStoryViewed?.(currentStory.user_id, currentStory.id)
      } catch {
        // Ignore transient write failures to keep story UX smooth.
      }
    }

    void markViewed()
  }, [currentStory, onStoryViewed, open, supabase, viewerId])

  useEffect(() => {
    if (!open || !currentStory || isPaused || !mediaLoaded) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < visibleStories.length - 1) {
            setCurrentIndex((idx) => idx + 1)
            setMediaLoaded(false)
            return 0
          }

          onClose()
          return 100
        }

        return prev + (100 / (duration / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [currentIndex, currentStory, duration, isPaused, mediaLoaded, onClose, open, visibleStories.length])

  const handleNext = useCallback(() => {
    if (currentIndex < visibleStories.length - 1) {
      setCurrentIndex((p) => p + 1)
      setProgress(0)
      setMediaLoaded(false)
    } else {
      onClose()
    }
  }, [currentIndex, onClose, visibleStories.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1)
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
          <div className="relative w-full h-full md:max-w-[450px] md:max-h-[850px] md:rounded-3xl overflow-hidden bg-zinc-900 shadow-2xl border border-white/5">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {currentStory && !isLoading && (
              <>
                <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-3">
                  {visibleStories.map((story, idx) => (
                    <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white"
                        initial={{ width: idx < currentIndex ? '100%' : '0%' }}
                        animate={{
                          width:
                            idx === currentIndex
                              ? `${progress}%`
                              : idx < currentIndex
                              ? '100%'
                              : '0%',
                        }}
                        transition={{ duration: 0.1, ease: 'linear' }}
                      />
                    </div>
                  ))}
                </div>

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
                        {currentStory.user?.username || 'User'}
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

                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pt-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  {currentStory.caption && (
                    <p className="text-white text-center text-lg font-medium drop-shadow-md leading-relaxed">
                      {currentStory.caption}
                    </p>
                  )}
                </div>

                <div className="absolute inset-0 z-10 flex">
                  <button type="button" className="flex-1 h-full" onClick={handlePrev} aria-label="Previous story" />
                  <button type="button" className="flex-1 h-full" onClick={handleNext} aria-label="Next story" />
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
