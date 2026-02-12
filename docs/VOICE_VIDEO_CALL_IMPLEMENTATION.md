# Voice & Video Call Implementation Guide for SquadLink

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Prerequisites](#prerequisites)
3. [Database Schema](#database-schema)
4. [WebRTC Setup](#webrtc-setup)
5. [Call Signaling](#call-signaling)
6. [UI Implementation](#ui-implementation)
7. [Deployment & Testing](#deployment--testing)

## Overview & Architecture

SquadLink's voice and video calling system uses:
- **WebRTC**: Peer-to-peer audio/video streaming
- **Supabase Realtime**: Call signaling (offer/answer/ICE candidates)
- **Browser Media APIs**: Microphone and camera access
- **React Context**: Call state management

### Architecture Diagram
```
User A                          Signaling Server                    User B
  │                          (Supabase Realtime)                      │
  ├─── Initiate Call ────────────────────────────────────────────────>│
  │       (SDP Offer)                                                 │
  │                                                                    │
  │<─── Call Ringing ──────────────────────────────────────────────────┤
  │       (Notification)                                               │
  │                                                                    │
  │<─── Accept Call ───────────────────────────────────────────────────┤
  │       (SDP Answer)                                                │
  │                                                                    │
  ├─── ICE Candidates ────────────────────────────────────────────────>│
  │     (connection gathering)                                        │
  │                                                                    │
  │<─── ICE Candidates ────────────────────────────────────────────────┤
  │                                                                    │
  ├═══════════ WebRTC Peer Connection ════════════════════════════════>│
  │           (Audio/Video Stream)                                    │
  │<═════════════════════════════════════════════════════════════════ ┤
```

## Prerequisites

### Dependencies
```bash
npm install simple-peer webrtc-adapter
# or
yarn add simple-peer webrtc-adapter
```

### Browser Support
- Chrome/Edge 23+
- Firefox 22+
- Safari 11+
- Mobile browsers (with HTTPS requirement)

### Permissions Required
- Microphone access
- Camera access (for video)
- Screen sharing (optional, additional permission)

## Database Schema

### Calls Table
```sql
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  call_type TEXT CHECK (call_type IN ('audio', 'video', 'screen-share')),
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'rejected', 'ended', 'missed')),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Call signaling messages
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type TEXT CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'hangup')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own calls"
ON calls FOR SELECT
USING (initiator_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create calls"
ON calls FOR INSERT
WITH CHECK (initiator_id = auth.uid());

CREATE POLICY "Users can update call status"
ON calls FOR UPDATE
USING (initiator_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can view call signals"
ON call_signals FOR SELECT
USING (
  call_id IN (
    SELECT id FROM calls 
    WHERE initiator_id = auth.uid() OR recipient_id = auth.uid()
  )
);

CREATE POLICY "Users can insert call signals"
ON call_signals FOR INSERT
WITH CHECK (from_user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_calls_initiator ON calls(initiator_id);
CREATE INDEX idx_calls_recipient ON calls(recipient_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created ON calls(created_at DESC);
```

### RTC Configuration
```sql
-- Store STUN/TURN servers configuration
CREATE TABLE IF NOT EXISTS rtc_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_server TEXT,
  turn_username TEXT,
  turn_password TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recommended STUN/TURN servers
INSERT INTO rtc_config (turn_server, turn_username, turn_password)
VALUES 
  ('stun:stun.l.google.com:19302', NULL, NULL),
  ('stun:stun1.l.google.com:19302', NULL, NULL),
  ('stun:stun2.l.google.com:19302', NULL, NULL);
```

## WebRTC Setup

### Create Call Context

**`src/contexts/CallContext.tsx`:**
```typescript
'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'

export interface CallState {
  activeCall: {
    callId: string
    type: 'audio' | 'video'
    with: {
      id: string
      username: string
      avatar_url: string
    }
    status: 'ringing' | 'accepted' | 'ended'
    startTime: number | null
    duration: number
    isInitiator: boolean
  } | null
  incomingCall: {
    callId: string
    from: {
      id: string
      username: string
      avatar_url: string
    }
    type: 'audio' | 'video'
  } | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  error: string | null
}

type CallAction =
  | { type: 'SET_ACTIVE_CALL'; payload: CallState['activeCall'] }
  | { type: 'SET_INCOMING_CALL'; payload: CallState['incomingCall'] }
  | { type: 'SET_LOCAL_STREAM'; payload: MediaStream }
  | { type: 'SET_REMOTE_STREAM'; payload: MediaStream }
  | { type: 'CLEAR_ACTIVE_CALL' }
  | { type: 'CLEAR_INCOMING_CALL' }
  | { type: 'CLEAR_STREAMS' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_DURATION'; payload: number }

const initialState: CallState = {
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  error: null,
}

function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case 'SET_ACTIVE_CALL':
      return { ...state, activeCall: action.payload }
    case 'SET_INCOMING_CALL':
      return { ...state, incomingCall: action.payload }
    case 'SET_LOCAL_STREAM':
      return { ...state, localStream: action.payload }
    case 'SET_REMOTE_STREAM':
      return { ...state, remoteStream: action.payload }
    case 'CLEAR_ACTIVE_CALL':
      return { ...state, activeCall: null }
    case 'CLEAR_INCOMING_CALL':
      return { ...state, incomingCall: null }
    case 'CLEAR_STREAMS':
      // Stop all tracks
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => track.stop())
      }
      if (state.remoteStream) {
        state.remoteStream.getTracks().forEach((track) => track.stop())
      }
      return { ...state, localStream: null, remoteStream: null }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'UPDATE_DURATION':
      return {
        ...state,
        activeCall: state.activeCall
          ? { ...state.activeCall, duration: action.payload }
          : null,
      }
    default:
      return state
  }
}

interface CallContextType extends CallState {
  dispatch: React.Dispatch<CallAction>
  startCall: (
    userId: string,
    type: 'audio' | 'video',
    constraints?: MediaStreamConstraints
  ) => Promise<MediaStream>
  acceptCall: (constraints?: MediaStreamConstraints) => Promise<MediaStream>
  rejectCall: () => void
  endCall: () => void
  toggleAudio: (enabled: boolean) => void
  toggleVideo: (enabled: boolean) => void
  switchCamera: () => Promise<void>
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(callReducer, initialState)

  const startCall = async (
    userId: string,
    type: 'audio' | 'video',
    constraints?: MediaStreamConstraints
  ): Promise<MediaStream> => {
    try {
      dispatch({ type: 'CLEAR_ERROR' })

      const mediaConstraints: MediaStreamConstraints = constraints || {
        audio: true,
        video: type === 'video',
      }

      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      dispatch({ type: 'SET_LOCAL_STREAM', payload: stream })

      return stream
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to access media devices'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }

  const acceptCall = async (
    constraints?: MediaStreamConstraints
  ): Promise<MediaStream> => {
    return startCall('', state.incomingCall?.type || 'audio', constraints)
  }

  const rejectCall = () => {
    dispatch({ type: 'CLEAR_INCOMING_CALL' })
  }

  const endCall = () => {
    dispatch({ type: 'CLEAR_STREAMS' })
    dispatch({ type: 'CLEAR_ACTIVE_CALL' })
  }

  const toggleAudio = (enabled: boolean) => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  const toggleVideo = (enabled: boolean) => {
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  const switchCamera = async () => {
    if (!state.localStream) return

    const videoTrack = state.localStream.getVideoTracks()[0]
    if (!videoTrack) return

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: {
            ideal: videoTrack.getSettings().facingMode === 'user' ? 'environment' : 'user',
          },
        },
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      const newVideoTrack = newStream.getVideoTracks()[0]

      if (newVideoTrack) {
        // Replace video track in RTCPeerConnection
        const sender = (window as any).__peerConnection
          ?.getSenders()
          .find((s: any) => s.track?.kind === 'video')

        if (sender) {
          await sender.replaceTrack(newVideoTrack)
        }

        // Update local stream
        state.localStream.removeTrack(videoTrack)
        state.localStream.addTrack(newVideoTrack)

        // Stop old track
        videoTrack.stop()
      }
    } catch (error) {
      console.error('Error switching camera:', error)
    }
  }

  return (
    <CallContext.Provider
      value={{
        ...state,
        dispatch,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        switchCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within CallProvider')
  }
  return context
}
```

## Call Signaling

### Create Call Service

**`src/services/callService.ts`:**
```typescript
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export class CallService {
  private supabase = createClient()
  private signalingChannel: RealtimeChannel | null = null

  async initiateCall(
    recipientId: string,
    conversationId: string,
    callType: 'audio' | 'video'
  ) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await this.supabase
        .from('calls')
        .insert({
          initiator_id: user.id,
          recipient_id: recipientId,
          conversation_id: conversationId,
          call_type: callType,
          status: 'ringing',
        })
        .select('id')
        .single()

      if (error) throw error

      // Notify recipient via Realtime
      await this.notifyUser(recipientId, {
        type: 'incoming-call',
        callId: data.id,
        initiatorId: user.id,
        callType,
      })

      return data.id
    } catch (error) {
      console.error('Error initiating call:', error)
      throw error
    }
  }

  async acceptCall(callId: string) {
    try {
      const { error } = await this.supabase
        .from('calls')
        .update({
          status: 'accepted',
          started_at: new Date().toISOString(),
        })
        .eq('id', callId)

      if (error) throw error
    } catch (error) {
      console.error('Error accepting call:', error)
      throw error
    }
  }

  async rejectCall(callId: string) {
    try {
      const { error } = await this.supabase
        .from('calls')
        .update({
          status: 'rejected',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId)

      if (error) throw error
    } catch (error) {
      console.error('Error rejecting call:', error)
      throw error
    }
  }

  async endCall(callId: string) {
    try {
      const { data: call } = await this.supabase
        .from('calls')
        .select('started_at')
        .eq('id', callId)
        .single()

      const duration = call?.started_at
        ? Math.floor(
            (new Date().getTime() - new Date(call.started_at).getTime()) /
            1000
          )
        : 0

      const { error } = await this.supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        })
        .eq('id', callId)

      if (error) throw error
    } catch (error) {
      console.error('Error ending call:', error)
      throw error
    }
  }

  async sendSignal(
    callId: string,
    signalType: 'offer' | 'answer' | 'ice-candidate' | 'hangup',
    signalData: any
  ) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await this.supabase
        .from('call_signals')
        .insert({
          call_id: callId,
          from_user_id: user.id,
          signal_type: signalType,
          signal_data: signalData,
        })

      if (error) throw error
    } catch (error) {
      console.error('Error sending signal:', error)
      throw error
    }
  }

  subscribeToSignals(
    callId: string,
    onSignal: (signal: any) => void
  ) {
    const channel = this.supabase
      .channel(`call:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          onSignal(payload.new)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  subscribeToIncomingCalls(
    userId: string,
    onIncomingCall: (call: any) => void
  ) {
    const channel = this.supabase
      .channel(`user:${userId}:calls`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          onIncomingCall(payload.new)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  private async notifyUser(userId: string, notification: any) {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: notification.type,
          data: notification,
        })

      if (error) throw error
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }
}

export const callService = new CallService()
```

## UI Implementation

### Call Interface Component

**`src/components/call/CallInterface.tsx`:**
```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Avatar,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material'
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  CallEnd,
  SwapCalls,
} from '@mui/icons-material'
import { useCall } from '@/contexts/CallContext'

interface CallInterfaceProps {
  open: boolean
  onClose: () => void
}

export default function CallInterface({ open, onClose }: CallInterfaceProps) {
  const {
    activeCall,
    localStream,
    remoteStream,
    toggleAudio,
    toggleVideo,
    switchCamera,
    endCall,
  } = useCall()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Timer for call duration
  useEffect(() => {
    if (!activeCall?.startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeCall.startTime!) / 1000)
      setDuration(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeCall?.startTime])

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`
  }

  const handleAudioToggle = () => {
    setAudioEnabled(!audioEnabled)
    toggleAudio(!audioEnabled)
  }

  const handleVideoToggle = () => {
    setVideoEnabled(!videoEnabled)
    toggleVideo(!videoEnabled)
  }

  const handleEndCall = async () => {
    endCall()
    onClose()
  }

  if (!activeCall) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          bgcolor: '#000',
          backgroundImage: remoteStream
            ? 'none'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingBottom: '56.25%', // 16:9 aspect ratio
          bgcolor: '#000',
        }}
      >
        {/* Remote Video */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Avatar
              src={activeCall.with.avatar_url}
              sx={{ width: 80, height: 80, mb: 2 }}
            >
              👤
            </Avatar>
            <Typography variant="h6">{activeCall.with.username}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {activeCall.status === 'ringing' ? 'Calling...' : 'Connecting...'}
            </Typography>
          </Box>
        )}

        {/* Local Video - Picture in Picture */}
        {localStream && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: '120px',
              height: '160px',
              borderRadius: 1,
              overflow: 'hidden',
              border: '2px solid white',
              zIndex: 10,
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        )}

        {/* Call Info Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 5,
          }}
        >
          <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
            {formatDuration(duration)}
          </Typography>
        </Box>

        {/* Controls */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            zIndex: 10,
          }}
        >
          <IconButton
            onClick={handleAudioToggle}
            sx={{
              bgcolor: audioEnabled ? 'primary.main' : 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: audioEnabled ? 'primary.dark' : 'error.dark',
              },
            }}
          >
            {audioEnabled ? <Mic /> : <MicOff />}
          </IconButton>

          <IconButton
            onClick={handleVideoToggle}
            sx={{
              bgcolor: videoEnabled ? 'primary.main' : 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: videoEnabled ? 'primary.dark' : 'error.dark',
              },
            }}
          >
            {videoEnabled ? <Videocam /> : <VideocamOff />}
          </IconButton>

          {videoEnabled && (
            <IconButton
              onClick={switchCamera}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <SwapCalls />
            </IconButton>
          )}

          <IconButton
            onClick={handleEndCall}
            sx={{
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': { bgcolor: 'error.dark' },
            }}
          >
            <CallEnd />
          </IconButton>
        </Box>
      </Box>
    </Dialog>
  )
}
```

### Incoming Call Notification

**`src/components/call/IncomingCallNotification.tsx`:**
```typescript
'use client'

import { Box, Paper, Avatar, Typography, Button, Stack } from '@mui/material'
import { CallEnd, Phone } from '@mui/icons-material'
import { useCall } from '@/contexts/CallContext'

interface IncomingCallNotificationProps {
  onAccept: () => void
  onReject: () => void
}

export default function IncomingCallNotification({
  onAccept,
  onReject,
}: IncomingCallNotificationProps) {
  const { incomingCall } = useCall()

  if (!incomingCall) return null

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        maxWidth: 300,
        zIndex: 1300,
        bgcolor: 'background.paper',
        border: '2px solid',
        borderColor: 'primary.main',
      }}
    >
      <Avatar src={incomingCall.from.avatar_url}>👤</Avatar>

      <Box sx={{ flex: 1 }}>
        <Typography variant="body1" fontWeight="bold">
          {incomingCall.from.username}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Incoming {incomingCall.type} call...
        </Typography>
      </Box>

      <Stack direction="row" gap={1}>
        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={<Phone />}
          onClick={onAccept}
        >
          Accept
        </Button>
        <Button
          variant="contained"
          color="error"
          size="small"
          startIcon={<CallEnd />}
          onClick={onReject}
        >
          Reject
        </Button>
      </Stack>
    </Paper>
  )
}
```

## Deployment & Testing

### Testing Checklist

- [ ] Microphone and camera access permissions working
- [ ] WebRTC connection established successfully
- [ ] Audio/video streams transmitted peer-to-peer
- [ ] Call can be initiated, accepted, and rejected
- [ ] Call can be ended by either party
- [ ] Audio/video can be toggled during call
- [ ] Camera switching works on mobile devices
- [ ] Call state persists correctly in context
- [ ] Incoming call notifications are reliable
- [ ] Call history is saved to database
- [ ] Network disconnection is handled gracefully

### HTTPS Requirement

WebRTC requires HTTPS in production. Ensure your deployment:
1. Uses SSL/TLS certificates
2. Is accessible via HTTPS URLs
3. Has proper CORS configuration

### Performance Optimization

```typescript
// Bitrate constraints for slower connections
const lowBandwidthConstraints = {
  audio: true,
  video: {
    width: { max: 320 },
    height: { max: 240 },
    frameRate: { max: 15 },
  },
}

// HD quality for better connections
const hdConstraints = {
  audio: true,
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
  },
}
```

## Integration Steps

1. **Update Layout**: Add `CallProvider` to root layout
2. **Add Call Button**: Add call button to chat header
3. **Display Notifications**: Add `IncomingCallNotification` to root layout
4. **Handle Permissions**: Request permissions on first call attempt
5. **Test End-to-End**: Test calls between two accounts

## Troubleshooting

### No Audio/Video
- Check microphone/camera permissions
- Verify browser support
- Check browser console for errors

### Connection Issues
- Verify STUN/TURN server configuration
- Check browser network tab
- Ensure firewall allows WebRTC

### Echoing Audio
- Use headphones
- Enable audio processing
- Check if audio tracks are properly connected

