'use client'

interface StoryRingProps {
  src: string
  alt: string
  username: string
  hasStory?: boolean
  hasUnviewed?: boolean
  isOwn?: boolean
  onClick?: () => void
}

export default function StoryRing({ src, alt, username, hasStory = false, hasUnviewed = false, isOwn = false, onClick }: StoryRingProps) {
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={onClick}>
      <div className="relative">
        {/* Story Ring */}
        <div
          className={`
            relative w-16 h-16 rounded-full p-[2px] transition-all
            ${hasStory && hasUnviewed
              ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
              : hasStory
              ? 'bg-zinc-600/50'
              : 'bg-zinc-700/50'
            }
            ${onClick ? 'group-hover:scale-105 active:scale-95' : ''}
          `}
        >
          <div className="w-full h-full rounded-full bg-zinc-900 p-[2px]">
            <img
              src={src}
              alt={alt}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* Add Story Button (for own story without stories) */}
        {isOwn && !hasStory && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              +
            </div>
          </div>
        )}
      </div>

      {/* Username */}
      <span className="text-[10px] font-medium text-zinc-400 group-hover:text-white transition-colors max-w-[64px] truncate">
        {username}
      </span>
    </div>
  )
}
