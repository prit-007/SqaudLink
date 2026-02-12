'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

import { experimental_extendTheme as extendTheme } from '@mui/material/styles';

export type Theme = 'purple' | 'blue' | 'green' | 'pink' | 'orange';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define your color palettes
const themePalettes = {
  purple: {
    primary: {
      main: '#6750A4',
      light: '#EADDFF',
      dark: '#21005E',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#625B71',
      light: '#E8DEF8',
      dark: '#1D192B',
      contrastText: '#FFFFFF',
    },
  },
  blue: {
    primary: {
      main: '#00639B',
      light: '#D0E6FF',
      dark: '#001D33',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#51606F',
      light: '#D4E4F5',
      dark: '#0A1D2C',
      contrastText: '#FFFFFF',
    },
  },
  green: {
    primary: {
      main: '#006D3D',
      light: '#9EF2BB',
      dark: '#00210F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#4F6353',
      light: '#D1E8D3',
      dark: '#0A1E10',
      contrastText: '#FFFFFF',
    },
  },
  pink: {
    primary: {
      main: '#B90063',
      light: '#FFD9E2',
      dark: '#3E001D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#74565F',
      light: '#FFD9E2',
      dark: '#2B151C',
      contrastText: '#FFFFFF',
    },
  },
  orange: {
    primary: {
      main: '#8C5100',
      light: '#FFDCC1',
      dark: '#2D1600',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#725B42',
      light: '#FDDDBB',
      dark: '#2A1905',
      contrastText: '#FFFFFF',
    },
  },
};

export const themes = Object.fromEntries(
  Object.entries(themePalettes).map(([key, value]) => [
    key,
    {
      primary: ``, // Gradients are handled in MessageBubble
      accent: key,
      glow: `rgba(124, 58, 237, 0.3)`, // Example glow
      text: `text-${key}-400`,
      bg: `bg-${key}-500`,
      border: `border-${key}-500`,
    },
  ])
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('purple');

  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-theme') as Theme;
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
    }
  }, []);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('chat-theme', newTheme);
    
    // Dispatch custom event for MaterialThemeProvider to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('theme-change', { detail: newTheme }));
    }
    
    console.log("Switching chat theme to:", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
