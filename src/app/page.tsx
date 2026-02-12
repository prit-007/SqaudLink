'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Box, Button, Container, Typography, Paper, CircularProgress } from '@mui/material'
import { createClient } from '@/utils/supabase/client'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import GroupsIcon from '@mui/icons-material/Groups'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'

export default function RootPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
      setIsLoading(false)
      
      // Auto-redirect if logged in after 1 second
      if (session) {
        setTimeout(() => {
          router.push('/chat')
        }, 1000)
      }
    }
    
    checkAuth()
  }, [router, supabase])

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (isLoggedIn) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2, color: 'text.secondary' }}>
            Redirecting to chat...
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Container maxWidth="md">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: 'linear-gradient(45deg, #9333ea 30%, #ec4899 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Squad Link
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              mb: 4,
              fontWeight: 400,
            }}
          >
            Secure, real-time messaging with end-to-end encryption
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                Get Started
              </Button>
            </Link>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                }}
              >
                Sign In
              </Button>
            </Link>
          </Box>
        </Box>

        {/* Features */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              bgcolor: 'surfaceContainer.main',
              borderRadius: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              End-to-End Encryption
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your messages are secured with RSA-2048 and AES-256 encryption. Only you and your contacts can read them.
            </Typography>
          </Paper>

          <Paper
            elevation={2}
            sx={{
              p: 3,
              bgcolor: 'surfaceContainer.main',
              borderRadius: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Real-Time Messaging
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Instant message delivery with typing indicators, read receipts, and emoji reactions.
            </Typography>
          </Paper>

          <Paper
            elevation={2}
            sx={{
              p: 3,
              bgcolor: 'surfaceContainer.main',
              borderRadius: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <PhotoLibraryIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Stories & Media
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Share photos, videos, and voice messages. Post 24-hour stories to keep your friends updated.
            </Typography>
          </Paper>

          <Paper
            elevation={2}
            sx={{
              p: 3,
              bgcolor: 'surfaceContainer.main',
              borderRadius: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <GroupsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Group Chats
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Create group conversations, share media, and stay connected with your squads.
            </Typography>
          </Paper>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Built with Next.js, Supabase, and Material Design 3
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

