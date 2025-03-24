"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AuthStep from '@/components/shifts-registration/steps/AuthStep'
import { Suspense } from 'react'
import { ClassRegistrationProvider } from '@/components/classes-registration'

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()
  
  // Obtener y decodificar returnUrl
  const returnUrl = searchParams.get('returnUrl')
  const decodedReturnUrl = returnUrl ? decodeURIComponent(returnUrl) : ''
  
  // Extraer el slug si está presente en la URL
  const slug = decodedReturnUrl ? decodedReturnUrl.split('/')[2] : ''
  
  // Redirigir si ya hay una sesión activa
  useEffect(() => {
    if (!isLoading && user) {
      // Verificar que el returnUrl sea válido (debe empezar con /reservas/)
      if (decodedReturnUrl && decodedReturnUrl.startsWith('/reservas/') && decodedReturnUrl !== '/reservas/login') {
        router.replace(decodedReturnUrl)
      } else {
        router.replace('/reservas')
      }
    }
  }, [user, isLoading, router, decodedReturnUrl])

  // Si está cargando o hay usuario, mostrar loading
  if (isLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white w-full flex items-center justify-center">
      <ClassRegistrationProvider empresaId={slug || 'default'}>
        <AuthStep onLoginSuccess={() => {
          if (decodedReturnUrl) {
            router.replace(decodedReturnUrl)
          } else {
            router.replace('/reservas')
          }
        }} />
      </ClassRegistrationProvider>
    </div>
  )
}
