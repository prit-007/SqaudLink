'use client'

import { Box, keyframes } from '@mui/material'

const swing = keyframes`
  0% {
    transform: rotate(0deg);
    animation-timing-function: ease-out;
  }
  25% {
    transform: rotate(70deg);
    animation-timing-function: ease-in;
  }
  50% {
    transform: rotate(0deg);
    animation-timing-function: linear;
  }
`

const swing2 = keyframes`
  0% {
    transform: rotate(0deg);
    animation-timing-function: linear;
  }
  50% {
    transform: rotate(0deg);
    animation-timing-function: ease-out;
  }
  75% {
    transform: rotate(-70deg);
    animation-timing-function: ease-in;
  }
`

export function SquiggleLoader() {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '50px',
        height: '50px',
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '25%',
            transformOrigin: 'center top',
            animation: i === 0 ? `${swing} 1.2s linear infinite` : i === 3 ? `${swing2} 1.2s linear infinite` : 'none',
            '&::after': {
              content: '""',
              display: 'block',
              width: '100%',
              height: '25%',
              borderRadius: '50%',
              bgcolor: 'primary.main',
            },
          }}
        />
      ))}
    </Box>
  )
}

export function CircleLoader() {
  return <SquiggleLoader />
}

export function SquigglyCircleLoader() {
  return <SquiggleLoader />
}

export function RotatingCircleLoader() {
  return <SquiggleLoader />
}

export function RotatingSquigglyCircleLoader() {
  return <SquiggleLoader />
}

export default function AllLoaders() {
  return (
    <Box className="flex flex-col items-center justify-center gap-4 p-4">
      <SquiggleLoader />
    </Box>
  )
}
