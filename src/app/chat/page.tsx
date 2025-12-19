export default function ChatPage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 backdrop-blur-sm">
      <div className="w-32 h-32 bg-gradient-to-br from-purple-500/20 to-teal-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse-glow">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="grad1" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a78bfa"/>
              <stop offset="1" stopColor="#2dd4bf"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Select a chat to start messaging</h2>
      <p className="text-zinc-400 max-w-md">
        Choose from your existing conversations or start a new one to connect with your squad.
      </p>
    </div>
  )
}
