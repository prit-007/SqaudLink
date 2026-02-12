# Profile Management & Group Features Implementation Guide

## Overview
This guide covers implementing comprehensive profile management features and group chat functionality for SquadLink.

## 1. Profile Management Features

### 1.1 Profile Picture Upload & Display

#### Database Schema Update
```sql
-- Add profile picture fields if not already present
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for profile pictures
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Profile avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Frontend Implementation

**Create `src/components/profile/ProfilePictureUpload.tsx`:**
```typescript
'use client'

import { useState } from 'react'
import { Box, Button, Avatar, CircularProgress, Alert } from '@mui/material'
import { CloudUpload } from '@mui/icons-material'
import { createClient } from '@/utils/supabase/client'

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string
  userId: string
  onUploadSuccess?: (url: string) => void
}

export default function ProfilePictureUpload({ 
  currentAvatarUrl, 
  userId, 
  onUploadSuccess 
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [preview, setPreview] = useState<string>(currentAvatarUrl || '')
  
  const supabase = createClient()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      setUploading(true)
      setError('')

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').pop()
        if (oldPath) {
          await supabase.storage
            .from('profile-avatars')
            .remove([`${userId}/${oldPath}`])
        }
      }

      // Upload new avatar
      const fileName = `${Date.now()}_${file.name}`
      const { error: uploadError, data } = await supabase.storage
        .from('profile-avatars')
        .upload(`${userId}/${fileName}`, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(`${userId}/${fileName}`)

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      setPreview(publicUrl)
      onUploadSuccess?.(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreview(currentAvatarUrl || '')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Avatar
          src={preview}
          sx={{
            width: 120,
            height: 120,
            margin: '0 auto',
            fontSize: '3rem',
            border: '4px solid rgba(255,255,255,0.1)',
          }}
        >
          {preview ? '' : '👤'}
        </Avatar>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Button
        variant="contained"
        component="label"
        fullWidth
        disabled={uploading}
        startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
      >
        {uploading ? 'Uploading...' : 'Choose Photo'}
        <input
          type="file"
          hidden
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </Button>
    </Box>
  )
}
```

### 1.2 Profile Editing

**Create `src/components/profile/EditProfileForm.tsx`:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { 
  Box, 
  Button, 
  TextField, 
  Alert, 
  CircularProgress,
  FormControlLabel,
  Switch 
} from '@mui/material'
import { createClient } from '@/utils/supabase/client'

interface EditProfileFormProps {
  userId: string
  onSaveSuccess?: () => void
}

export default function EditProfileForm({ userId, onSaveSuccess }: EditProfileFormProps) {
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState('online')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, bio, status')
          .eq('id', userId)
          .single()

        if (error) throw error
        setUsername(data.username)
        setBio(data.bio || '')
        setStatus(data.status || 'online')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess(false)

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onSaveSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <CircularProgress />
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">Profile updated successfully!</Alert>}

      <TextField
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        fullWidth
        disabled={saving}
      />

      <TextField
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        fullWidth
        multiline
        rows={3}
        placeholder="Tell people about yourself..."
        disabled={saving}
      />

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={status === 'online'}
              onChange={(e) => setStatus(e.target.checked ? 'online' : 'offline')}
              disabled={saving}
            />
          }
          label={`Status: ${status}`}
        />
      </Box>

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving}
        fullWidth
      >
        {saving ? <CircularProgress size={20} /> : 'Save Changes'}
      </Button>
    </Box>
  )
}
```

### 1.3 Public Profile Viewer

**Create `src/app/profile/[id]/page.tsx`:**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Box,
  Avatar,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Container,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { PersonAdd, Message } from '@mui/icons-material'
import { createClient } from '@/utils/supabase/client'

interface Profile {
  id: string
  username: string
  avatar_url: string
  bio: string
  status: string
  created_at: string
}

export default function PublicProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isFriend, setIsFriend] = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUserId(user.id)

        // Fetch profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        setProfile(data)

        // Check if friend
        if (user) {
          const { data: friendship } = await supabase
            .from('friendships')
            .select('id')
            .eq('user_id', user.id)
            .eq('friend_id', userId)
            .single()

          setIsFriend(!!friendship)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleAddFriend = async () => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: userId,
        })

      if (error) throw error
      setIsFriend(true)
    } catch (err) {
      console.error('Error adding friend:', err)
    }
  }

  const handleSendMessage = async () => {
    try {
      // Create or find conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'dm')
        .or(
          `and(participant_ids.contains.[${currentUserId}],participant_ids.contains.[${userId}])`
        )
        .single()

      if (existing) {
        window.location.href = `/chat/${existing.id}`
        return
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          type: 'dm',
          participant_ids: [currentUserId, userId],
        })
        .select('id')
        .single()

      if (error) throw error
      window.location.href = `/chat/${data.id}`
    } catch (err) {
      console.error('Error creating conversation:', err)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!profile) {
    return (
      <Container>
        <Typography color="error">Profile not found</Typography>
      </Container>
    )
  }

  const isOwnProfile = currentUserId === userId

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Avatar
          src={profile.avatar_url}
          sx={{
            width: 120,
            height: 120,
            margin: '0 auto 16px',
            fontSize: '3rem',
            border: '4px solid rgba(255,255,255,0.1)',
          }}
        >
          👤
        </Avatar>

        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          {profile.username}
        </Typography>

        <Chip
          label={profile.status === 'online' ? '🟢 Online' : '⚪ Offline'}
          size="small"
          sx={{ mb: 2 }}
        />

        {profile.bio && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {profile.bio}
          </Typography>
        )}

        {!isOwnProfile && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            {!isFriend && (
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={handleAddFriend}
              >
                Add Friend
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Message />}
              onClick={handleSendMessage}
            >
              Message
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  )
}
```

## 2. Group Chat Features

### 2.1 Database Schema for Groups

```sql
-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- admin, moderator, member
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Add to conversations table if not present
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- RLS Policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups they're members of"
ON groups FOR SELECT
USING (
  id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  )
  OR creator_id = auth.uid()
);

CREATE POLICY "Group members can view group memberships"
ON group_members FOR SELECT
USING (
  group_id IN (
    SELECT id FROM groups WHERE creator_id = auth.uid()
  )
  OR user_id = auth.uid()
);
```

### 2.2 Create Group Modal

**Create `src/components/chat/CreateGroupModal.tsx`:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material'
import { createClient } from '@/utils/supabase/client'

interface User {
  id: string
  username: string
  avatar_url: string
}

interface CreateGroupModalProps {
  open: boolean
  onClose: () => void
  onGroupCreated?: (groupId: string) => void
  currentUserId: string
}

export default function CreateGroupModal({
  open,
  onClose,
  onGroupCreated,
  currentUserId,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (!open) return

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', currentUserId)

        if (error) throw error
        setAllUsers(data || [])
      } catch (err) {
        console.error('Error fetching users:', err)
        setError('Failed to load users')
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [open])

  const handleCreateGroup = async () => {
    try {
      if (!groupName.trim()) {
        setError('Group name is required')
        return
      }

      if (selectedMembers.length === 0) {
        setError('Select at least one member')
        return
      }

      setLoading(true)
      setError('')

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          description,
          creator_id: currentUserId,
        })
        .select('id')
        .single()

      if (groupError) throw groupError

      // Add members
      const members = [
        ...selectedMembers,
        currentUserId, // Add creator as admin
      ]

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(
          members.map((userId) => ({
            group_id: group.id,
            user_id: userId,
            role: userId === currentUserId ? 'admin' : 'member',
          }))
        )

      if (membersError) throw membersError

      // Create conversation for group
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          group_id: group.id,
          name: groupName,
        })
        .select('id')
        .single()

      if (convError) throw convError

      onGroupCreated?.(conversation.id)
      setGroupName('')
      setDescription('')
      setSelectedMembers([])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Group</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          fullWidth
          disabled={loading}
          autoFocus
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={2}
          disabled={loading}
          placeholder="Optional group description"
        />

        <Box>
          <strong style={{ display: 'block', marginBottom: '8px' }}>
            Select Members
          </strong>
          {loadingUsers ? (
            <CircularProgress size={20} />
          ) : (
            <List sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
              {allUsers.map((user) => (
                <ListItem key={user.id} disablePadding>
                  <ListItemButton
                    onClick={() => toggleMember(user.id)}
                    dense
                  >
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedMembers.includes(user.id)}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <Avatar
                      src={user.avatar_url}
                      sx={{ width: 32, height: 32, mr: 1 }}
                    >
                      👤
                    </Avatar>
                    <ListItemText primary={user.username} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateGroup}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : 'Create Group'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

### 2.3 Group Management Page

**Create `src/app/groups/[id]/page.tsx`:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import { Delete, Edit } from '@mui/icons-material'
import { createClient } from '@/utils/supabase/client'

interface GroupMember {
  id: string
  user_id: string
  username: string
  avatar_url: string
  role: string
}

interface GroupData {
  id: string
  name: string
  description: string
  creator_id: string
}

export default function GroupManagementPage() {
  const params = useParams()
  const groupId = params.id as string

  const [group, setGroup] = useState<GroupData | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUserId(user.id)

        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single()

        if (groupError) throw groupError
        setGroup(groupData)

        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select('id, user_id, role, profiles(username, avatar_url)')
          .eq('group_id', groupId)

        if (membersError) throw membersError
        setMembers(
          membersData?.map((m: any) => ({
            ...m,
            username: m.profiles.username,
            avatar_url: m.profiles.avatar_url,
          })) || []
        )

        if (user) {
          const adminMember = membersData?.find(
            (m: any) => m.user_id === user.id && m.role === 'admin'
          )
          setIsAdmin(!!adminMember)
        }
      } catch (err) {
        console.error('Error fetching group:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [groupId])

  const handleUpdateGroup = async () => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editingName,
          description: editingDescription,
        })
        .eq('id', groupId)

      if (error) throw error
      setEditDialogOpen(false)
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              name: editingName,
              description: editingDescription,
            }
          : null
      )
    } catch (err) {
      console.error('Error updating group:', err)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      console.error('Error removing member:', err)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!group) {
    return <Typography color="error">Group not found</Typography>
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {group.name}
          </Typography>
          {isAdmin && (
            <Button
              size="small"
              startIcon={<Edit />}
              onClick={() => {
                setEditingName(group.name)
                setEditingDescription(group.description || '')
                setEditDialogOpen(true)
              }}
            >
              Edit
            </Button>
          )}
        </Box>

        {group.description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {group.description}
          </Typography>
        )}

        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
          Members ({members.length})
        </Typography>

        <List>
          {members.map((member) => (
            <ListItem
              key={member.id}
              secondaryAction={
                isAdmin && member.user_id !== currentUserId ? (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    Remove
                  </Button>
                ) : null
              }
            >
              <ListItemAvatar>
                <Avatar src={member.avatar_url}>👤</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={member.username}
                secondary={member.role === 'admin' ? '👑 Admin' : 'Member'}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Group Name"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Description"
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateGroup} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
```

## 3. Integration Steps

### Step 1: Update Navigation
Add links to profile and group management in your main navigation or menu.

### Step 2: Update Sidebar
Use the `CreateGroupModal` in your Sidebar or add a button to create groups.

### Step 3: Add Friend System Database
```sql
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
ON friendships FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());
```

## 4. Next Steps

1. Update `useFriends` hook to fetch and cache friend relationships
2. Add friend request system (pending/accepted states)
3. Implement friend search in DirectMessage creation
4. Add group search functionality
5. Implement group invite links
6. Add group settings (permissions, visibility, etc.)

