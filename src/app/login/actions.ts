'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type ActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export async function login(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { status: 'error', message: error.message || 'Could not authenticate user' }
  }

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Logged in successfully. Redirecting…' }
}

export async function signup(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      // We need this to create the profile row trigger we made in SQL!
      data: {
        username: formData.get('username') as string,
        avatar_url: `https://api.dicebear.com/9.x/notionists/svg?seed=${Math.random()}`,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/login`,
    },
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { status: 'error', message: error.message || 'Could not create user' }
  }

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Signup successful. Check your email to confirm your account.' }
}