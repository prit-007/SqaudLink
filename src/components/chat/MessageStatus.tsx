'use client'

import React from 'react';
import { motion } from 'framer-motion';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';

type Status = 'sending' | 'sent' | 'read';

interface MessageStatusProps {
  status: Status;
}

export default function MessageStatus({ status }: MessageStatusProps) {
  // Configuration map for cleaner rendering
  const config = {
    sending: {
      icon: AccessTimeIcon,
      color: 'text-white/50', // Tailwind class
      animate: { rotate: 360 }
    },
    sent: {
      icon: DoneIcon,
      color: 'text-white/70',
      animate: {}
    },
    read: {
      icon: DoneAllIcon,
      color: 'text-blue-300', // Distinct read color
      animate: {}
    }
  };

  const { icon: Icon, color, animate } = config[status];

  return (
    <motion.div
      initial={false}
      animate={animate}
      transition={{ 
        repeat: status === 'sending' ? Infinity : 0, 
        ease: "linear", 
        duration: 1.5 
      }}
      className={`flex items-center justify-center ${color}`}
      title={status}
    >
      <Icon sx={{ fontSize: 14 }} />
    </motion.div>
  );
} 