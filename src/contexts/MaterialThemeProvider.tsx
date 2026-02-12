'use client';

/// <reference path="../types/mui.d.ts" />

import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode, useState, useEffect } from 'react';
import NextAppDirEmotionCacheProvider from './EmotionCache';

// Theme color palettes for different chat themes
const themePalettes = {
  purple: {
    primary: { main: '#D0BCFF', light: '#EADDFF', dark: '#381E72', contrastText: '#381E72' },
    secondary: { main: '#CCC2DC', light: '#E8DEF8', dark: '#332D41', contrastText: '#332D41' },
  },
  blue: {
    primary: { main: '#A8C7FA', light: '#D3E3FD', dark: '#004A77', contrastText: '#004A77' },
    secondary: { main: '#BEC6DC', light: '#DEE3F1', dark: '#2D3F4D', contrastText: '#2D3F4D' },
  },
  green: {
    primary: { main: '#A6F4C5', light: '#D7F7E5', dark: '#00513B', contrastText: '#00513B' },
    secondary: { main: '#BBC7BE', light: '#DEE5DF', dark: '#3A4B3E', contrastText: '#3A4B3E' },
  },
  pink: {
    primary: { main: '#FFB1C8', light: '#FFD9E3', dark: '#8C004B', contrastText: '#8C004B' },
    secondary: { main: '#D4BABE', light: '#F5DCDF', dark: '#4A3943', contrastText: '#4A3943' },
  },
  orange: {
    primary: { main: '#FFB871', light: '#FFDCC2', dark: '#6C4100', contrastText: '#6C4100' },
    secondary: { main: '#D4C4AE', light: '#F3E6D5', dark: '#4A4135', contrastText: '#4A4135' },
  },
};

export type ChatTheme = keyof typeof themePalettes;

// Base theme configuration
const createMaterialTheme = (chatTheme: ChatTheme = 'purple') => {
  const palette = themePalettes[chatTheme];
  
  return createTheme({
    cssVariables: true,
    colorSchemes: {
      dark: {
        palette: {
          ...palette,
          tertiary: {
            main: '#EFB8C8',
            light: '#FFD8E4',
            dark: '#492532',
            contrastText: '#492532',
          },
          background: {
            default: '#141218',
            paper: '#141218',
          },
          surface: {
            main: '#141218',
          },
          surfaceContainer: {
            main: '#211F26',
          },
          error: {
            main: '#F2B8B5',
            light: '#F9DEDC',
            dark: '#601410',
            contrastText: '#601410',
          },
          onSurface: {
            main: '#E6E0E9',
          },
          onSurfaceVariant: {
            main: '#CAC4D0',
          },
          outline: {
            main: '#938F99',
          },
          outlineVariant: {
            main: '#49454F',
          },
        },
      },
      light: {
        palette: {
          ...palette,
          tertiary: {
            main: '#7D5260',
            light: '#FFD8E4',
            dark: '#31111D',
            contrastText: '#FFFFFF',
          },
          background: {
            default: '#FEF7FF',
            paper: '#FEF7FF',
          },
          surface: {
            main: '#FEF7FF',
          },
          surfaceContainer: {
            main: '#F3EDF7',
          },
          error: {
            main: '#B3261E',
            light: '#F9DEDC',
            dark: '#410E0B',
            contrastText: '#FFFFFF',
          },
          onSurface: {
          main: '#1D1B20',
        },
        onSurfaceVariant: {
          main: '#49454F',
        },
        outline: {
          main: '#79747E',
        },
        outlineVariant: {
          main: '#CAC4D0',
        },
      },
    },
  },
  typography: {
    fontFamily: [
      'var(--font-jakarta)',
      '"Plus Jakarta Sans"',
      'sans-serif',
    ].join(','),
    displayLarge: {
      fontSize: '3.5rem',
      fontWeight: 400,
      lineHeight: '4rem',
    },
    displayMedium: {
      fontSize: '2.8125rem',
      fontWeight: 400,
      lineHeight: '3.25rem',
    },
    displaySmall: {
      fontSize: '2.25rem',
      fontWeight: 500,
      lineHeight: '2.75rem',
    },
    headlineLarge: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: '2.5rem',
    },
    headlineMedium: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: '2.25rem',
    },
    headlineSmall: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: '2rem',
    },
    titleLarge: {
      fontSize: '1.375rem',
      fontWeight: 500,
      lineHeight: '1.75rem',
    },
    titleMedium: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: '1.5rem',
      letterSpacing: '0.15px',
    },
    titleSmall: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: '1.25rem',
      letterSpacing: '0.1px',
    },
    bodyLarge: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: '1.5rem',
      letterSpacing: '0.5px',
    },
    bodyMedium: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: '1.25rem',
      letterSpacing: '0.25px',
    },
    bodySmall: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: '1rem',
      letterSpacing: '0.4px',
    },
    labelLarge: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: '1.25rem',
      letterSpacing: '0.1px',
    },
    labelMedium: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: '1rem',
      letterSpacing: '0.5px',
    },
    labelSmall: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      lineHeight: '1rem',
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 16, // Material Design 3 rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '20px', // Pill shape
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          ':hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          ':hover': {
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
          },
        },
        sizeLarge: {
          borderRadius: '24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          backgroundImage: 'none',
          backgroundColor: 'var(--mui-palette-surfaceContainer-main)', // Use surface container
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
          },
          '& .MuiFilledInput-root': {
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: '16px', // MD3 FAB is squircle-ish
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
  },
});
};

export function MaterialThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>('purple');
  const [theme, setTheme] = useState(() => createMaterialTheme('purple'));

  // Listen for theme changes from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-theme') as ChatTheme;
    if (savedTheme && themePalettes[savedTheme]) {
      setCurrentTheme(savedTheme);
      setTheme(createMaterialTheme(savedTheme));
    }

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chat-theme' && e.newValue) {
        const newTheme = e.newValue as ChatTheme;
        if (themePalettes[newTheme]) {
          setCurrentTheme(newTheme);
          setTheme(createMaterialTheme(newTheme));
        }
      }
    };

    // Custom event for same-tab updates
    const handleThemeChange = (e: CustomEvent) => {
      const newTheme = e.detail as ChatTheme;
      if (themePalettes[newTheme]) {
        setCurrentTheme(newTheme);
        setTheme(createMaterialTheme(newTheme));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-change' as any, handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-change' as any, handleThemeChange);
    };
  }, []);

  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </NextAppDirEmotionCacheProvider>
  );
}
