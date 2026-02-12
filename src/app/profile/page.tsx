'use client'

import {
  Avatar,
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Button,
} from '@mui/material'
import {
  Person,
  PhotoCamera,
  Link as LinkIcon,
  MoreHoriz,
  Message,
} from '@mui/icons-material'
import { useState } from 'react'

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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function ProfilePage() {
  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Box
          sx={{
            height: 200,
            bgcolor: 'primary.light',
            position: 'relative',
          }}
        >
          <Avatar
            sx={{
              width: 120,
              height: 120,
              fontSize: '4rem',
              position: 'absolute',
              bottom: -60,
              left: '50%',
              transform: 'translateX(-50%)',
              border: '4px solid',
              borderColor: 'background.paper',
            }}
          >
            P
          </Avatar>
        </Box>
        <Box sx={{ pt: '76px', pb: 2, textAlign: 'center' }}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Prit
          </Typography>
          <Typography variant="body1" color="text.secondary">
            @prit_007
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, px: 3 }}>
            Building the future of communication. Co-founder @SquadLink.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" startIcon={<Message />}>
              Message
            </Button>
            <Button variant="outlined">Follow</Button>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="profile tabs"
            variant="fullWidth"
          >
            <Tab label="Activity" />
            <Tab label="Media" />
            <Tab label="Links" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Reacted to a message"
                secondary="in #general"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Started a new chat"
                secondary="with Alice"
              />
            </ListItem>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Shared Media
          </Typography>
          {/* Placeholder for a grid of images */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
             <Box sx={{width: '100%', height: 100, bgcolor: 'grey.200', borderRadius: 1}} />
             <Box sx={{width: '100%', height: 100, bgcolor: 'grey.200', borderRadius: 1}} />
             <Box sx={{width: '100%', height: 100, bgcolor: 'grey.200', borderRadius: 1}} />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Shared Links
          </Typography>
          <List>
            <ListItem>
                <ListItemIcon><LinkIcon /></ListItemIcon>
                <ListItemText primary="nextjs.org" secondary="The React Framework for the Web" />
            </ListItem>
          </List>
        </TabPanel>
      </Paper>
    </Container>
  )
}
