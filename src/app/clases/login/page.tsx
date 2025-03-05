"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ClassRegistrationProvider } from '@/components/classes-registration'
import { AuthStep } from '@/components/classes-registration/steps/AuthStep'
import { LoginForm } from '@/components/auth/LoginForm'
import { Suspense } from 'react'

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
  const empresaId = decodedReturnUrl ? decodedReturnUrl.split('/')[2] : ''

  // Redirigir si ya hay una sesión activa
  useEffect(() => {
    if (!isLoading && user) {
      // Verificar que el returnUrl sea válido (debe empezar con /clases/)
      if (decodedReturnUrl && decodedReturnUrl.startsWith('/clases/') && decodedReturnUrl !== '/clases/login') {
        router.replace(decodedReturnUrl)
      } else {
        router.replace('/clases')
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

  // Si tenemos empresaId, envolver en ClassRegistrationProvider
  if (empresaId) {
    return (
      <div className="min-h-screen bg-white w-full flex items-center justify-center">
        <ClassRegistrationProvider empresaId={empresaId}>
          <AuthStep onLoginSuccess={() => {
            if (decodedReturnUrl) {
              router.replace(decodedReturnUrl)
            } else {
              router.replace('/clases')
            }
          }} />
        </ClassRegistrationProvider>
      </div>
    )
  }

  // Si no hay empresaId, mostrar AuthStep directamente
  return (
    <div className="min-h-screen bg-white w-full flex items-center justify-center">
      <AuthStep onLoginSuccess={() => {
        if (decodedReturnUrl) {
          router.replace(decodedReturnUrl)
        } else {
          router.replace('/clases')
        }
      }} />
    </div>
  )
} 