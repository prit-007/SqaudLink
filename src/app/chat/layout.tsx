'use client'

import Sidebar from '@/components/chat/Sidebar'
import MobileBottomNav from '@/components/chat/MobileBottomNav'
import { usePathname } from 'next/navigation'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isChatOpen = pathname.includes('/chat/') && pathname !== '/chat'

  return (
    <ThemeProvider>
    <div className="flex h-screen bg-zinc-950 overflow-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Sidebar - Hidden on mobile when chat is open */}
      <div className={`${isChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] md:min-w-[380px] md:max-w-[380px] flex-shrink-0 z-10`}>
        <Sidebar />
      </div>

      {/* Main Content - Hidden on mobile when chat is closed (showing list) */}
      <div className={`flex-1 relative z-0 ${!isChatOpen ? 'hidden md:flex md:items-center md:justify-center' : 'flex'}`}>
        {children}
      </div>
      
      {/* Mobile Bottom Navigation - Only show on chat list page */}
      {!isChatOpen && <MobileBottomNav />}
    </div>
    </ThemeProvider>
  )
}
