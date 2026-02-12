'use client';

import {
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Fab,
  Switch,
  Slider,
  Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import ShareIcon from '@mui/icons-material/Share';

/**
 * Example Material Design 3 Component
 * This demonstrates how to use MUI components alongside Tailwind CSS
 */
export function MaterialDesignExample() {
  return (
    <Box className="flex flex-col gap-6 p-6 max-w-md mx-auto">
      <Typography variant="headlineMedium" className="mb-2">
        Android 16 Style
      </Typography>

      {/* Card with Material Design 3 styling */}
      <Card elevation={0} sx={{ bgcolor: 'surfaceContainer.main' }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              A16
            </Avatar>
          }
          action={
            <IconButton aria-label="share">
              <ShareIcon />
            </IconButton>
          }
          title="Material You"
          subheader="Dynamic & Personal"
        />
        <CardContent>
          <Typography variant="bodyLarge" color="text.secondary" className="mb-4">
            This UI mimics the latest Android 16 design language. 
            Notice the rounded corners, pastel tones in dark mode, and flat surfaces.
          </Typography>

          {/* Chips */}
          <Box className="flex flex-wrap gap-2 mb-6">
            <Chip label="Android 16" color="primary" />
            <Chip label="Material You" color="secondary" />
            <Chip label="Tailwind" variant="outlined" />
          </Box>

          {/* Interactive Elements */}
          <Box className="flex flex-col gap-4">
            <Box className="flex items-center justify-between">
              <Typography variant="bodyMedium">Enable Notifications</Typography>
              <Switch defaultChecked />
            </Box>
            
            <Box>
              <Typography variant="bodySmall" gutterBottom>Volume</Typography>
              <Slider defaultValue={30} aria-label="Volume" />
            </Box>

            <TextField
              fullWidth
              label="Quick Note"
              variant="filled"
              placeholder="Type here..."
              className="mt-2"
            />
          </Box>

          {/* Actions */}
          <Box className="flex gap-2 justify-end mt-6">
            <Button variant="text">Dismiss</Button>
            <Button
              variant="contained"
              endIcon={<SendIcon />}
            >
              Action
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Surface variations */}
      <Box className="grid grid-cols-2 gap-4">
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'surface.main', borderRadius: 4 }}>
            <Typography variant="labelLarge">Surface</Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'surfaceContainer.main', borderRadius: 4 }}>
            <Typography variant="labelLarge">Container</Typography>
        </Paper>
      </Box>

      {/* FAB */}
      <Fab
        color="tertiary"
        aria-label="add"
        className="fixed bottom-6 right-6"
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
