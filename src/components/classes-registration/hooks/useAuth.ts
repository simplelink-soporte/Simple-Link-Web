"use client"

import { useAuth } from '@/contexts/AuthContext'

interface UserData {
  id: string
  email: string
  name: string
  role?: string
}

export function useClassRegistrationAuth() {
  const auth = useAuth()

  return {
    user: auth.user ? {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.metadata.name || auth.user.email,
      // El campo role puede no existir en AuthUser
      role: auth.user.metadata.role
    } as UserData : null,
    isLoading: auth.isLoading,
    error: auth.error,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signInWithGoogle: auth.signInWithGoogle,
    signOut: auth.signOut
  }
} 