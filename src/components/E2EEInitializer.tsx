'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CryptoService } from '@/utils/crypto-service'

/**
 * E2EE Initializer Component
 * Automatically initializes E2EE when user is logged in
 * Place this in the root layout or main app component
 */
export function E2EEInitializer() {
  const [status, setStatus] = useState<'initializing' | 'ready' | 'error' | 'disabled'>('initializing')
  const supabase = createClient()

  useEffect(() => {
    const initializeE2EE = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setStatus('disabled')
          return
        }

        // Check if E2EE is already initialized
        if (CryptoService.isInitialized()) {
          setStatus('ready')
          console.log('🔐 E2EE already initialized')
          return
        }

        // Initialize E2EE for this device
        const deviceInfo = await CryptoService.initializeDevice(user.id)
        
        if (deviceInfo.id === 'no-e2ee') {
          setStatus('disabled')
          console.warn('⚠️ E2EE tables not found. Run migration_v2.1_spice_pack.sql to enable.')
          return
        }

        setStatus('ready')
        console.log('✅ E2EE initialized:', deviceInfo.name)
      } catch (error) {
        console.error('❌ E2EE initialization failed:', error)
        setStatus('error')
      }
    }

    initializeE2EE()

    // Re-initialize on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !CryptoService.isInitialized()) {
        initializeE2EE()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Show status indicator (optional - can be removed in production)
  if (process.env.NODE_ENV === 'development' && status !== 'disabled') {
    return (
      <div className="fixed bottom-4 left-4 z-50 pointer-events-none">
        <div className={`
          px-3 py-1.5 rounded-full text-xs font-medium
          ${status === 'initializing' ? 'bg-yellow-500/20 text-yellow-300' : ''}
          ${status === 'ready' ? 'bg-green-500/20 text-green-300' : ''}
          ${status === 'error' ? 'bg-red-500/20 text-red-300' : ''}
        `}>
          {status === 'initializing' && '🔐 Initializing E2EE...'}
          {status === 'ready' && '🔐 E2EE Ready'}
          {status === 'error' && '🔐 E2EE Error'}
        </div>
      </div>
    )
  }

  return null
}
