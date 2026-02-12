'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface AvatarProps {
  src?: string | null
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  online?: boolean
  className?: string
  hasStory?: boolean
  onClick?: () => void
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl'
}

const indicatorSizeMap = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5'
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
  const [imageError, setImageError] = useState(false)

  // Get initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <motion.div 
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      className={`relative inline-block ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Story Ring Gradient */}
      {hasStory && (
        <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-spin-slow opacity-80" />
      )}

      {/* Avatar Container */}
      <div className={`
        relative overflow-hidden rounded-full 
        ${sizeMap[size]} 
        ${hasStory ? 'border-[3px] border-zinc-950' : ''}
        bg-zinc-800 flex items-center justify-center select-none
        shadow-inner ring-1 ring-white/10
      `}>
        {src && !imageError ? (
          <img 
            src={src} 
            alt={alt}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          />
        ) : (
          <span className="font-bold text-zinc-400">
            {getInitials(alt)}
          </span>
        )}
      </div>
      
      {/* Status Indicator (with "cut-out" border effect) */}
      {online !== undefined && (
        <div className={`
          absolute bottom-0 right-0 
          ${indicatorSizeMap[size]} 
          bg-emerald-500 rounded-full 
          ring-2 ring-zinc-950
          ${online ? 'animate-pulse-slow shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-500'}
        `} />
      )}
    </motion.div>
  )
}