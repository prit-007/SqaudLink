'use client'

import { useEffect, useState } from 'react'
import { Avatar, Box, Container, Divider, List, ListItem, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material'
import { ArrowBack, AccountCircle, Notifications, Palette, Security, Info, Help, Shield, VpnKey, Logout } from '@mui/icons-material'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar sx={{ width: 80, height: 80, fontSize: '2.5rem' }}>
            {profile?.username?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              {profile?.username || 'User'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {profile?.email || ''}
            </Typography>
          </Box>
        </Box>
        <Divider />

        <List sx={{ p: 0 }}>
          <ListItem>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ pl: 2, pt: 1 }}
            >
              Account
            </Typography>
          </ListItem>
          <ListItemButton component={Link} href="/settings/profile">
            <ListItemIcon>
              <AccountCircle />
            </ListItemIcon>
            <ListItemText
              primary="Profile"
              secondary="Manage your profile information"
            />
          </ListItemButton>
          <ListItemButton component={Link} href="/settings/privacy">
            <ListItemIcon>
              <VpnKey />
            </ListItemIcon>
            <ListItemText
              primary="Privacy & Security"
              secondary="Control your privacy settings"
            />
          </ListItemButton>
          <ListItemButton component={Link} href="/e2ee">
            <ListItemIcon>
              <Shield />
            </ListItemIcon>
            <ListItemText
              primary="End-to-End Encryption"
              secondary="Manage your encryption keys and devices"
            />
          </ListItemButton>

          <Divider component="li" sx={{ my: 1 }} />

          <ListItem>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ pl: 2, pt: 1 }}
            >
              Preferences
            </Typography>
          </ListItem>
          <ListItemButton component={Link} href="/settings/notifications">
            <ListItemIcon>
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="Notifications"
              secondary="Manage message and call notifications"
            />
          </ListItemButton>
          <ListItem disablePadding>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
              }}
            >
              <ListItemIcon>
                <Palette />
              </ListItemIcon>
              <ListItemText
                primary="Appearance"
                secondary="Customize the look and feel"
              />
            </Box>
          </ListItem>

          <Divider component="li" sx={{ my: 1 }} />

          <ListItem>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ pl: 2, pt: 1 }}
            >
              About
            </Typography>
          </ListItem>
          <ListItemButton component={Link} href="/settings/help">
            <ListItemIcon>
              <Help />
            </ListItemIcon>
            <ListItemText primary="Help & FAQ" />
          </ListItemButton>
          <ListItemButton component={Link} href="/settings/about">
            <ListItemIcon>
              <Info />
            </ListItemIcon>
            <ListItemText primary="About SquadLink" secondary="Version 1.0.0" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <Shield />
            </ListItemIcon>
            <ListItemText primary="Privacy Policy" />
          </ListItemButton>

          <Divider component="li" sx={{ my: 1 }} />

          <ListItemButton 
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Log Out" />
          </ListItemButton>
        </List>
      </Paper>
    </Container>
  )
}
