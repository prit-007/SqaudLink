'use client'

import Sidebar from '@/components/chat/Sidebar'
import MobileBottomNav from '@/components/chat/MobileBottomNav'
import { usePathname } from 'next/navigation'
import { ThemeProvider as ChatThemeProvider } from '@/contexts/ThemeContext'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isChatOpen = pathname.includes('/chat/') && pathname !== '/chat'

  return (
    <ChatThemeProvider>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-zinc-950 text-white relative">
        
        {/* Ambient Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
        </div>

        {/* Sidebar: Visible on Desktop always, Mobile only if chat NOT open */}
        <aside className={`
          ${isChatOpen ? 'hidden md:flex' : 'flex'} 
          w-full md:w-[380px] flex-col z-20 
          border-r border-white/5 bg-white/5 backdrop-blur-xl
        `}>
          <Sidebar />
        </aside>

        {/* Main Content Stage */}
        <main className={`
          flex-1 relative z-10 flex flex-col min-w-0
          ${!isChatOpen ? 'hidden md:flex' : 'flex'}
        `}>
          {children}
        </main>
        
        {/* Mobile Navigation */}
        {!isChatOpen && <MobileBottomNav />}
      </div>
    </ChatThemeProvider>
  )
} 