'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import SearchIcon from '@mui/icons-material/Search'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { motion } from 'framer-motion'

export default function MobileBottomNav() {
  const pathname = usePathname()
  
  const navItems = [
    { name: 'Chats', icon: ChatBubbleOutlineIcon, href: '/chat' },
    { name: 'Search', icon: SearchIcon, href: '/search' },
    { name: 'Profile', icon: PersonOutlineIcon, href: '/home' }, // Assuming profile is at /home based on previous
    { name: 'Settings', icon: SettingsOutlinedIcon, href: '/settings' }
  ]

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-between px-6 py-3 relative overflow-hidden">
        
        {/* Background Glass Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative z-10 flex flex-col items-center gap-1 group"
            >
              <div 
                className={`
                  p-2 rounded-xl transition-all duration-300
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 translate-y-[-4px]' 
                    : 'text-zinc-400 hover:text-zinc-200'
                  }
                `}
              >
                <Icon sx={{ fontSize: 22 }} />
              </div>
              
              {isActive && (
                <motion.div 
                  layoutId="active-dot"
                  className="absolute -bottom-1 w-1 h-1 bg-indigo-400 rounded-full"
                />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}