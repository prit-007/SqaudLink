'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Theme = 'purple' | 'blue' | 'green' | 'pink' | 'orange'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const themes = {
  purple: {
    primary: 'from-violet-600 via-purple-600 to-indigo-600',
    accent: 'purple',
    glow: 'rgba(124, 58, 237, 0.3)',
    text: 'text-purple-400',
    bg: 'bg-purple-500',
    border: 'border-purple-500'
  },
  blue: {
    primary: 'from-blue-600 via-cyan-600 to-sky-600',
    accent: 'blue',
    glow: 'rgba(37, 99, 235, 0.3)',
    text: 'text-blue-400',
    bg: 'bg-blue-500',
    border: 'border-blue-500'
  },
  green: {
    primary: 'from-emerald-600 via-green-600 to-teal-600',
    accent: 'green',
    glow: 'rgba(16, 185, 129, 0.3)',
    text: 'text-green-400',
    bg: 'bg-green-500',
    border: 'border-green-500'
  },
  pink: {
    primary: 'from-pink-600 via-rose-600 to-red-600',
    accent: 'pink',
    glow: 'rgba(236, 72, 153, 0.3)',
    text: 'text-pink-400',
    bg: 'bg-pink-500',
    border: 'border-pink-500'
  },
  orange: {
    primary: 'from-orange-600 via-amber-600 to-yellow-600',
    accent: 'orange',
    glow: 'rgba(249, 115, 22, 0.3)',
    text: 'text-orange-400',
    bg: 'bg-orange-500',
    border: 'border-orange-500'
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('purple')

  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-theme') as Theme
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme)
    }
  }, [])

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('chat-theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
