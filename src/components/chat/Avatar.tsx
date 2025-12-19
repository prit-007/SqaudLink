import React from 'react'

interface AvatarProps {
  src: string
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  className?: string
  hasStory?: boolean
  onClick?: () => void
}

const sizeClasses = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
}

export default function Avatar({ 
  src, 
  alt, 
  size = 'md', 
  online, 
  className = '',
  hasStory = false,
  onClick
}: AvatarProps) {
  const avatarContent = (
    <div className={`relative ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      {hasStory ? (
        <div className="p-[2px] rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-teal-500 animate-pulse">
          <div className="p-[2px] bg-zinc-900 rounded-full">
            <img 
              src={src} 
              alt={alt}
              className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
            />
          </div>
        </div>
      ) : (
        <img 
          src={src} 
          alt={alt}
          className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        />
      )}
      
      {online !== undefined && (
        <div className={`absolute bottom-0 right-0 ${size === 'xs' ? 'w-2 h-2' : 'w-3 h-3'} bg-zinc-900 rounded-full flex items-center justify-center`}>
          <div className={`${size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${online ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'} rounded-full`}></div>
        </div>
      )}
    </div>
  )

  return avatarContent
}
