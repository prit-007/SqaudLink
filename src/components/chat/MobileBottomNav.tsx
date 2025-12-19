'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileBottomNav() {
  const pathname = usePathname()
  
  const navItems = [
    {
      name: 'Chats',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      href: '/chat',
      badge: 3
    },
    {
      name: 'Stories',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
      href: '/chat',
      badge: 0
    },
    {
      name: 'Profile',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      href: '/home',
      badge: 0
    },
    {
      name: 'Settings',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M6 12H1m6 0h6m6 0h5" />
        </svg>
      ),
      href: '/home',
      badge: 0
    }
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative
                ${isActive 
                  ? 'text-purple-400' 
                  : 'text-zinc-400 hover:text-white active:scale-95'
                }
              `}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" />
              )}
              
              {/* Icon */}
              <div className="relative">
                {item.icon}
                
                {/* Badge */}
                {item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-zinc-900">
                    {item.badge}
                  </div>
                )}
              </div>
              
              {/* Label */}
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
