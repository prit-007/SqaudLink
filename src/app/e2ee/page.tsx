'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CryptoService } from '@/utils/crypto-service'
import { createClient } from '@/utils/supabase/client'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  Alert,
  AlertTitle,
} from '@mui/material'
import {
  Smartphone,
  Computer,
  Tablet,
  Delete,
  Security,
  Key,
  Info,
  CheckCircle,
  ArrowBack,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'

interface Device {
  id: string
  name: string
  lastActive: string
  isCurrent: boolean
}

export default function E2EESettingsPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [currentDevice, setCurrentDevice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)
  const [e2eeEnabled, setE2eeEnabled] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      setIsLoading(true)
      
      // Check if E2EE is initialized
      const isInitialized = CryptoService.isInitialized()
      setE2eeEnabled(isInitialized)
      
      if (!isInitialized) {
        // Try to initialize
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          try {
            await CryptoService.initializeDevice(user.id)
            setE2eeEnabled(true)
          } catch (error) {
            console.error('Failed to initialize E2EE:', error)
            setIsLoading(false)
            return
          }
        }
      }

      // Get current device info
      const deviceInfo = CryptoService.getDeviceInfo()
      setCurrentDevice(deviceInfo)

      // Get all devices
      const devicesList = await CryptoService.listMyDevices()
      setDevices(devicesList)
    } catch (error) {
      console.error('Failed to load devices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDevice = async (device: Device) => {
    if (device.isCurrent) {
      alert('Cannot delete current device. Please log out from this device instead.')
      return
    }

    setDeviceToDelete(device)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteDevice = async () => {
    if (!deviceToDelete) return

    try {
      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('id', deviceToDelete.id)

      if (error) throw error

      // Refresh device list
      await loadDevices()
      setDeleteDialogOpen(false)
      setDeviceToDelete(null)
    } catch (error) {
      console.error('Failed to delete device:', error)
      alert('Failed to delete device. Please try again.')
    }
  }

  const getDeviceIcon = (name: string) => {
    if (name.toLowerCase().includes('iphone') || name.toLowerCase().includes('android')) {
      return <Smartphone />
    } else if (name.toLowerCase().includes('ipad') || name.toLowerCase().includes('tablet')) {
      return <Tablet />
    } else {
      return <Computer />
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading E2EE settings...</Typography>
      </Container>
    )
  }

  if (!e2eeEnabled) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => router.back()}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">End-to-End Encryption</Typography>
        </Box>

        <Alert severity="warning">
          <AlertTitle>E2EE Not Available</AlertTitle>
          The database tables for End-to-End Encryption have not been set up yet.
          Please run <code>migration_v2.1_spice_pack.sql</code> in your Supabase SQL Editor to enable E2EE.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">End-to-End Encryption</Typography>
      </Box>

      {/* E2EE Status */}
      <Card sx={{ mb: 3, bgcolor: 'success.main', color: 'success.contrastText' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle fontSize="large" />
            <Box>
              <Typography variant="h6">E2EE Enabled</Typography>
              <Typography variant="body2">Your messages are encrypted end-to-end</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Current Device Info */}
      {currentDevice && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Security color="primary" />
            <Typography variant="h6">Current Device</Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText
                primary={<><strong>Device Name:</strong> {currentDevice.name}</>}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={<><strong>Device ID:</strong> {currentDevice.id}</>}
                secondary="This ID is used to encrypt messages for this device"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={<><strong>Fingerprint:</strong> {currentDevice.fingerprint}</>}
                secondary="Unique identifier for this device"
              />
            </ListItem>
          </List>
        </Paper>
      )}

      {/* All Devices */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Key color="primary" />
          <Typography variant="h6">Trusted Devices</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Messages are encrypted for all your trusted devices. Remove devices you no longer use.
        </Typography>

        <List>
          {devices.map((device) => (
            <ListItem
              key={device.id}
              secondaryAction={
                !device.isCurrent && (
                  <IconButton edge="end" onClick={() => handleDeleteDevice(device)}>
                    <Delete />
                  </IconButton>
                )
              }
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                {getDeviceIcon(device.name)}
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {device.name}
                      {device.isCurrent && (
                        <Chip label="Current" size="small" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={`Last active ${formatDistanceToNow(new Date(device.lastActive), { addSuffix: true })}`}
                />
              </Box>
            </ListItem>
          ))}
        </List>

        {devices.length === 0 && (
          <Alert severity="info">
            <AlertTitle>No devices found</AlertTitle>
            You have no trusted devices yet. Log in from another device to add it.
          </Alert>
        )}
      </Paper>

      {/* Info Card */}
      <Alert severity="info" icon={<Info />}>
        <AlertTitle>How E2EE Works</AlertTitle>
        <ul style={{ marginLeft: 20, marginTop: 8 }}>
          <li>Each device has its own encryption keys (2048-bit RSA)</li>
          <li>Messages are encrypted with AES-256-GCM before sending</li>
          <li>Only your trusted devices can decrypt your messages</li>
          <li>The server never sees your private keys or plaintext messages</li>
          <li>Private keys are stored locally in IndexedDB, never sent to the server</li>
        </ul>
      </Alert>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove Device?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove <strong>{deviceToDelete?.name}</strong>?
            <br /><br />
            This device will no longer be able to decrypt new messages. You can add it back by logging in again from that device.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteDevice} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
