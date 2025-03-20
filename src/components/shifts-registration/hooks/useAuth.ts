"use client"

import { useAuth } from '@/contexts/AuthContext'

interface UserData {
  id: string
  email: string
  name: string
  role: string
}

export function useShiftRegistrationAuth() {
  const auth = useAuth()

  return {
    user: auth.user ? {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.metadata.name || auth.user.email,
      role: auth.user.role
    } as UserData : null,
    isLoading: auth.isLoading,
    error: auth.error,
    signIn: auth.signIn,
    signOut: auth.signOut
  }
}
