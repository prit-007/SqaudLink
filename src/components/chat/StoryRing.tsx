'use client'

interface StoryRingProps {
  src: string
  alt: string
  username: string
  hasStory?: boolean
  hasUnviewed?: boolean
  unviewedCount?: number
  isOpened?: boolean
  isOwn?: boolean
  onClick?: () => void
}

export default function StoryRing({
  src,
  alt,
  username,
  hasStory = false,
  hasUnviewed = false,
  unviewedCount = 0,
  isOpened = false,
  isOwn = false,
  onClick
}: StoryRingProps) {
  const showUnviewed = hasStory && hasUnviewed && unviewedCount > 0

  return (
    <button
      type="button"
      className="flex flex-col items-center gap-2 cursor-pointer group outline-none"
      onClick={onClick}
      aria-label={`${username} story ${showUnviewed ? `(${unviewedCount} new)` : isOpened ? '(opened)' : ''}`}
    >
      <div className="relative">
        {/* Story Ring */}
        <div
          className={`
            relative w-16 h-16 rounded-full p-[2px] transition-all duration-200
            ${hasStory && hasUnviewed
              ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
              : hasStory
              ? 'bg-zinc-500/60'
              : 'bg-zinc-700/50'
            }
            ${isOpened && !showUnviewed ? 'opacity-75 saturate-50' : ''}
            ${onClick ? 'group-hover:scale-105 group-focus-visible:scale-105 active:scale-95' : ''}
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

        {showUnviewed && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 border border-zinc-900">
            {unviewedCount > 9 ? '9+' : unviewedCount}
          </div>
        )}

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
      <span className="text-[10px] font-medium text-zinc-400 group-hover:text-white transition-colors max-w-[72px] truncate">
        {username}{isOpened && !showUnviewed ? ' • seen' : ''}
      </span>
    </button>
  )
}
