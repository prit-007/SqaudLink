'use client'

import { login, signup, type ActionState } from './actions'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    username: '',
  })
  const router = useRouter()

  const initialServerState: ActionState = { status: 'idle', message: '' }

  const [loginState, loginAction, loginPending] = useActionState<ActionState, FormData>(login, initialServerState)
  const [signupState, signupAction, signupPending] = useActionState<ActionState, FormData>(signup, initialServerState)

  const activeState = isSignUp ? signupState : loginState
  const isPending = isSignUp ? signupPending : loginPending

  const passwordIsStrong = (value: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/.test(value)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget
    const formData = new FormData(form)
    const email = (formData.get('email') || '').toString().trim()
    const password = (formData.get('password') || '').toString()
    const username = (formData.get('username') || '').toString().trim()

    const nextErrors = {
      email: '',
      password: '',
      username: '',
    }

    if (!email) {
      nextErrors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (!passwordIsStrong(password)) {
      nextErrors.password =
        'Use 6+ chars with upper, lower, number, and symbol.'
    }

    if (isSignUp) {
      if (!username) {
        nextErrors.username = 'Username is required.'
      } else if (username.length < 3) {
        nextErrors.username = 'Username must be at least 3 characters.'
      }
    }

    const hasErrors = Object.values(nextErrors).some(Boolean)
    setErrors(nextErrors)

    if (hasErrors) {
      event.preventDefault()
    }
  }

  // Redirect after successful login and initialize E2EE
  useEffect(() => {
    if (!isSignUp && loginState.status === 'success') {
      // Initialize E2EE crypto service
      import('@/utils/crypto-service').then(async ({ CryptoService }) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          try {
            await CryptoService.initializeDevice(user.id)
            console.log('✅ E2EE initialized')
          } catch (error) {
            console.error('⚠️ E2EE initialization failed:', error)
          }
        }
      })
      router.push('/home')
      router.refresh()
    }
  }, [isSignUp, loginState, router])

  // Reset field errors when switching modes
  useEffect(() => {
    setErrors({ email: '', password: '', username: '' })
  }, [isSignUp])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-purple-950/20 to-zinc-950 text-white relative overflow-hidden px-4 py-8">
      
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 md:w-96 h-64 md:h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-64 md:w-96 h-64 md:h-96 bg-teal-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-64 md:w-96 h-64 md:h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      {/* Floating Chat Bubbles Decoration */}
      <div className="absolute top-10 md:top-20 left-4 md:left-10 opacity-10 animate-float hidden sm:block">
        <svg width="60" height="60" className="md:w-20 md:h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" fill="currentColor"/>
        </svg>
      </div>
      <div className="absolute bottom-20 md:bottom-32 right-8 md:right-16 opacity-10 animate-float hidden sm:block" style={{animationDelay: '1s'}}>
        <svg width="50" height="50" className="md:w-15 md:h-15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" fill="currentColor"/>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-6 md:mb-8 animate-float">
          <div className="inline-block p-3 md:p-4 bg-gradient-to-br from-purple-500/20 to-teal-500/20 rounded-2xl md:rounded-3xl backdrop-blur-sm border border-white/10 mb-3 md:mb-4 animate-pulse-glow">
            <svg width="40" height="40" className="md:w-12 md:h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 9V7C17 5.89543 16.1046 5 15 5H5C3.89543 5 3 5.89543 3 7V13C3 14.1046 3.89543 15 5 15H7M7 15V19L11 15H19C20.1046 15 21 14.1046 21 13V9C21 7.89543 20.1046 7 19 7H17" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="grad1" x1="3" y1="5" x2="21" y2="19" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a78bfa"/>
                  <stop offset="1" stopColor="#2dd4bf"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-teal-400 bg-clip-text text-transparent mb-2">
            Squad Link
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm">Where conversations come alive ✨</p>
        </div>

        {/* Main Form Card */}
        <form
          className="p-5 sm:p-6 md:p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl"
          onSubmit={handleSubmit}
          action={isSignUp ? signupAction : loginAction}
          noValidate
        >
          {/* Tab Switcher */}
          <div className="flex gap-1.5 md:gap-2 p-1 bg-black/20 rounded-xl mb-5 md:mb-6">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                !isSignUp 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                isSignUp 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            {/* Username Field - Only for Sign Up */}
            {isSignUp && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M6 21C6 17.134 8.68629 14 12 14C15.3137 14 18 17.134 18 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Username
                </label>
                <input
                  name="username"
                  type="text"
                  placeholder="your_unique_name"
                  required={isSignUp}
                  aria-invalid={Boolean(errors.username)}
                  className="w-full px-4 py-3 md:py-3.5 text-base rounded-xl bg-black/30 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-zinc-600 hover:bg-black/40"
                />
                {errors.username && (
                  <p className="text-xs text-red-300 ml-1">{errors.username}</p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                aria-invalid={Boolean(errors.email)}
                className="w-full px-4 py-3 md:py-3.5 text-base rounded-xl bg-black/30 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-zinc-600 hover:bg-black/40"
              />
              {errors.email && (
                <p className="text-xs text-red-300 ml-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Password
              </label>
              <input
                name="password"
                type="password"
                placeholder="••••••••••"
                required
                minLength={6}
                aria-invalid={Boolean(errors.password)}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}"
                title="Use 6+ chars with upper, lower, number, and symbol."
                className="w-full px-4 py-3.5 rounded-xl bg-black/30 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-zinc-600 hover:bg-black/40"
              />
              <p className="text-xs text-zinc-500 ml-1">
                Must be 6+ chars with uppercase, lowercase, number, and symbol.
              </p>
              {errors.password && (
                <p className="text-xs text-red-300 ml-1">{errors.password}</p>
              )}
            </div>

            {/* Email Confirmation Notice */}
            {isSignUp && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs text-purple-300 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>Please check your email to confirm your account after signing up.</span>
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:via-purple-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-xl shadow-purple-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-purple-500/50"
              >
                {isPending
                  ? isSignUp
                    ? 'Creating account...'
                    : 'Signing in...'
                  : isSignUp
                    ? '🚀 Create Account'
                    : '👋 Welcome Back'}
              </button>
            </div>

            {/* Server Response Messages */}
            {activeState.message && (
              <div
                className={`mt-3 text-xs rounded-lg px-3 py-3 border ${
                  activeState.status === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}
              >
                {activeState.message}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </form>

        {/* Bottom Tagline */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600">
            Connect • Chat • Collaborate
          </p>
        </div>
      </div>
    </div>
  )
}
