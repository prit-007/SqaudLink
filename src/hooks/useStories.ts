'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface UseStoriesOptions {
  enabled?: boolean
}

interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption?: string
  expires_at: string
  created_at: string
  user?: {
    username: string
    avatar_url?: string
  }
  view_count?: number
  is_viewed?: boolean
}

interface StoryGroup {
  user_id: string
  username: string
  avatar_url?: string
  stories: Story[]
  latest_story_time: string
  unviewed_count: number
}

interface StoryViewRow {
  viewer_id: string
}

interface StoryRow {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption?: string
  expires_at: string
  created_at: string
  user?: {
    username: string
    avatar_url?: string
  }
  story_views?: StoryViewRow[]
}

export function useStories({ enabled = true }: UseStoriesOptions = {}) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [myStories, setMyStories] = useState<Story[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchStories = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStoryGroups([])
        setMyStories([])
        return
      }

      // Fetch all active stories from contacts
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles!stories_user_id_fkey(username, avatar_url),
          story_views!left(viewer_id)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // Separate my stories from others
      const myStoriesList: Story[] = []
      const othersStories: Story[] = []

      ;((storiesData || []) as StoryRow[]).forEach((story) => {
        const storyObj: Story = {
          id: story.id,
          user_id: story.user_id,
          media_url: story.media_url,
          media_type: story.media_type,
          caption: story.caption,
          expires_at: story.expires_at,
          created_at: story.created_at,
          user: story.user ? {
            username: story.user.username,
            avatar_url: story.user.avatar_url,
          } : undefined,
          view_count: story.story_views?.length || 0,
          is_viewed: story.story_views?.some((v) => v.viewer_id === user.id) || false,
        }

        if (story.user_id === user.id) {
          myStoriesList.push(storyObj)
        } else {
          othersStories.push(storyObj)
        }
      })

      setMyStories(myStoriesList)

      // Group stories by user
      const grouped = othersStories.reduce((acc, story) => {
        const existing = acc.find((g) => g.user_id === story.user_id)
        if (existing) {
          existing.stories.push(story)
          if (!story.is_viewed) existing.unviewed_count++
        } else {
          acc.push({
            user_id: story.user_id,
            username: story.user?.username || 'Unknown',
            avatar_url: story.user?.avatar_url,
            stories: [story],
            latest_story_time: story.created_at,
            unviewed_count: story.is_viewed ? 0 : 1,
          })
        }
        return acc
      }, [] as StoryGroup[])

      // Sort: unviewed first, then by latest story time
      grouped.sort((a, b) => {
        if (a.unviewed_count > 0 && b.unviewed_count === 0) return -1
        if (a.unviewed_count === 0 && b.unviewed_count > 0) return 1
        return new Date(b.latest_story_time).getTime() - new Date(a.latest_story_time).getTime()
      })

      setStoryGroups(grouped)
    } catch (error) {
      console.error('Failed to fetch stories:', error)
    } finally {
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true)
        setIsLoading(false)
      }
    }
  }, [hasLoadedOnce, supabase])

  const markUserStoriesViewed = useCallback((targetUserId: string) => {
    setStoryGroups((prev) =>
      prev.map((group) =>
        group.user_id === targetUserId
          ? { ...group, unviewed_count: 0, stories: group.stories.map((s) => ({ ...s, is_viewed: true })) }
          : group
      )
    )
  }, [])

  useEffect(() => {
    if (!enabled) return

    let currentUserId: string | null = null

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      // Debounce bursty realtime events to avoid visual jitter.
      refreshTimeoutRef.current = setTimeout(() => {
        void fetchStories()
      }, 180)
    }

    if (!hasLoadedOnce) {
      setIsLoading(true)
    }
    void fetchStories()
    void supabase.auth.getUser().then(({ data: { user } }) => {
      currentUserId = user?.id || null
    })

    // Subscribe to story and view changes to keep rings in sync.
    const channel = supabase
      .channel('stories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        () => {
          scheduleRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'story_views',
        },
        (payload: { new?: { viewer_id?: string } }) => {
          // Local viewer updates are already applied optimistically in UI.
          if (currentUserId && payload.new?.viewer_id === currentUserId) return
          scheduleRefresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [enabled, fetchStories, hasLoadedOnce, supabase])

  const refreshStories = async () => {
    await fetchStories()
  }

  return {
    storyGroups,
    myStories,
    isLoading,
    refreshStories,
    markUserStoriesViewed,
  }
}
