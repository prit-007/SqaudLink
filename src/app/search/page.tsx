'use client'

import {
  Box,
  Container,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  ListItemButton,
} from '@mui/material'
import { Search, TrendingUp, Person, Message } from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SquiggleLoader } from '@/components/chat/SquiggleLoader'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

function TabPanel(props: {
  children?: React.ReactNode
  index: number
  value: number
}) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function SearchPage() {
  const [tabValue, setTabValue] = useState(0)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery)
    if (!searchQuery.trim()) {
        setMessages([])
        setUsers([])
        return
    }

    setLoading(true)
    try {
        // Search Messages
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: msgData } = await supabase.rpc('search_messages', {
                search_query: searchQuery,
                p_user_id: user.id
            })
            setMessages(msgData || [])
        }

        // Search Users
        const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${searchQuery}%`)
            .limit(20)
        setUsers(userData || [])

    } catch (error) {
        console.error('Search failed', error)
    } finally {
        setLoading(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        if (query) handleSearch(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search messages, users, or topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              sx: {
                borderRadius: '28px',
                bgcolor: 'action.hover',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
              },
            }}
          />
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="search tabs"
            variant="fullWidth"
          >
            <Tab label="Trending" icon={<TrendingUp />} iconPosition="start" />
            <Tab label="Messages" icon={<Message />} iconPosition="start" />
            <Tab label="Users" icon={<Person />} iconPosition="start" />
          </Tabs>
        </Box>

        {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <SquiggleLoader />
            </Box>
        ) : (
            <>
                <TabPanel value={tabValue} index={0}>
                  <Typography variant="h6" gutterBottom>
                    Trending Topics
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label="#NextJS15" component="a" href="#" clickable onClick={() => setQuery('NextJS15')} />
                    <Chip label="#React19" component="a" href="#" clickable onClick={() => setQuery('React19')} />
                    <Chip label="#MaterialDesign3" component="a" href="#" clickable onClick={() => setQuery('MaterialDesign3')} />
                    <Chip label="#Supabase" component="a" href="#" clickable onClick={() => setQuery('Supabase')} />
                    <Chip label="#RealtimeChat" component="a" href="#" clickable onClick={() => setQuery('RealtimeChat')} />
                  </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Typography variant="h6" gutterBottom>
                    Message Results
                  </Typography>
                  <List>
                    {messages.length === 0 && query && <Typography sx={{p:2}} color="text.secondary">No messages found.</Typography>}
                    {messages.map((msg) => (
                        <div key={msg.id}>
                            <ListItemButton onClick={() => router.push(`/chat/${msg.conversation_id}`)}>
                              <ListItemText
                                primary={msg.content}
                                secondary={
                                  <>
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      color="text.primary"
                                    >
                                      {msg.sender_username}
                                    </Typography>
                                    {` — ${formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}`}
                                  </>
                                }
                              />
                            </ListItemButton>
                            <Divider component="li" />
                        </div>
                    ))}
                  </List>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Typography variant="h6" gutterBottom>
                    User Results
                  </Typography>
                  <List>
                    {users.length === 0 && query && <Typography sx={{p:2}} color="text.secondary">No users found.</Typography>}
                    {users.map((user) => (
                        <div key={user.id}>
                            <ListItemButton>
                              <ListItemAvatar>
                                <Avatar src={user.avatar_url}>{user.username?.[0]?.toUpperCase()}</Avatar>
                              </ListItemAvatar>
                              <ListItemText primary={user.username} secondary={user.status || 'Offline'} />
                            </ListItemButton>
                            <Divider component="li" />
                        </div>
                    ))}
                  </List>
                </TabPanel>
            </>
        )}
      </Paper>
    </Container>
  )
}
