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

  // Verificar si viene de una autenticación exitosa con Google
  const authSuccess = searchParams.get('auth_success') === 'true'
  const authAction = searchParams.get('action')

  // Manejar redirección después de autenticación con Google
  useEffect(() => {
    console.log('Efecto de redirección ejecutándose')
    console.log('authSuccess:', authSuccess)
    console.log('user:', !!user)
    console.log('Todos los parámetros de URL:', Object.fromEntries(searchParams.entries()))
    
    // Función para manejar la redirección
    const handleRedirection = () => {
      if (authSuccess && user) {
        console.log('Condición authSuccess && user cumplida')
        
        // Intentar obtener la URL de retorno guardada en localStorage con la nueva clave específica
        const savedReturnUrl = localStorage.getItem('classes_auth_return_url')
        const oldSavedReturnUrl = localStorage.getItem('auth_return_url')
        const savedTimestamp = localStorage.getItem('classes_auth_timestamp')
        
        console.log('Auth success detectado, usuario autenticado:', !!user)
        console.log('URL guardada en localStorage (nueva clave):', savedReturnUrl)
        console.log('URL guardada en localStorage (clave anterior):', oldSavedReturnUrl)
        console.log('Timestamp guardado:', savedTimestamp)
        
        // Intentar primero con la nueva clave
        if (savedReturnUrl) {
          // Limpiar localStorage
          localStorage.removeItem('classes_auth_return_url')
          localStorage.removeItem('classes_auth_action')
          localStorage.removeItem('classes_auth_timestamp')
          
          // Verificar que el returnUrl sea válido (debe empezar con /clases/)
          if (savedReturnUrl.startsWith('/clases/') && savedReturnUrl !== '/clases/login') {
            console.log('Redirigiendo a URL guardada después de autenticación con Google:', savedReturnUrl)
            router.replace(savedReturnUrl)
            return
          } else {
            console.log('URL guardada no es válida:', savedReturnUrl)
          }
        } else if (oldSavedReturnUrl) {
          // Si no hay datos con la nueva clave, intentar con la clave anterior
          console.log('No se encontró URL guardada con la nueva clave, intentando con la clave anterior')
          // Limpiar localStorage
          localStorage.removeItem('auth_return_url')
          localStorage.removeItem('auth_action')
          
          // Verificar que el returnUrl sea válido (debe empezar con /clases/)
          if (oldSavedReturnUrl.startsWith('/clases/') && oldSavedReturnUrl !== '/clases/login') {
            console.log('Redirigiendo a URL guardada después de autenticación con Google:', oldSavedReturnUrl)
            router.replace(oldSavedReturnUrl)
            return
          } else {
            console.log('URL guardada no es válida:', oldSavedReturnUrl)
          }
        } else {
          console.log('No se encontró URL guardada en localStorage')
        }
        
        // Si no hay URL guardada o no es válida, redirigir a la página principal
        console.log('Redirigiendo a página principal de clases')
        router.replace('/clases')
      }
    }
    
    // Ejecutar la redirección después de un breve retraso para asegurar que todo esté cargado
    if (authSuccess && user) {
      const timer = setTimeout(() => {
        handleRedirection()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [authSuccess, user, router, searchParams])

  // Redirigir si ya hay una sesión activa
  useEffect(() => {
    if (!isLoading && user && !authSuccess) {
      // Verificar que el returnUrl sea válido (debe empezar con /clases/)
      if (decodedReturnUrl && decodedReturnUrl.startsWith('/clases/') && decodedReturnUrl !== '/clases/login') {
        router.replace(decodedReturnUrl)
      } else {
        router.replace('/clases')
      }
    }
  }, [user, isLoading, router, decodedReturnUrl, authSuccess])

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