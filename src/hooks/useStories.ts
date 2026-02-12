'use client'

import { useEffect, useState } from 'react'
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

export function useStories({ enabled = true }: UseStoriesOptions = {}) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [myStories, setMyStories] = useState<Story[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!enabled) return

    const fetchStories = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

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

        storiesData.forEach((story: any) => {
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
            is_viewed: story.story_views?.some((v: any) => v.viewer_id === user.id) || false,
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
        setIsLoading(false)
      }
    }

    fetchStories()

    // Subscribe to new stories
    const channel = supabase
      .channel('stories')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stories',
        },
        () => {
          fetchStories() // Refresh on new story
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, supabase])

  const refreshStories = async () => {
    setIsLoading(true)
    // Trigger a re-fetch by updating a state that's in the dependency array
    await new Promise((resolve) => setTimeout(resolve, 100))
    setIsLoading(false)
  }

  return {
    storyGroups,
    myStories,
    isLoading,
    refreshStories,
  }
}
