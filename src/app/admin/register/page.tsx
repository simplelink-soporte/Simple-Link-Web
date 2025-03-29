"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLoginForm } from '@/components/auth/AdminLoginForm'

export default function RegisterPage() {
  const router = useRouter()
  
  // Redirigir a la página de login con el parámetro de acción de registro
  useEffect(() => {
    router.replace('/admin/login?action=register')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirigiendo...</p>
    </div>
  )
}
