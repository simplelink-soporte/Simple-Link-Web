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
  const authError = searchParams.get('error')
  const authErrorDescription = searchParams.get('error_description')

  // Manejar redirección después de autenticación con Google
  useEffect(() => {
    console.log('Efecto de redirección ejecutándose')
    console.log('authSuccess:', authSuccess)
    console.log('user:', !!user)
    console.log('isLoading:', isLoading)
    console.log('authError:', authError)
    console.log('authErrorDescription:', authErrorDescription)
    console.log('Todos los parámetros de URL:', Object.fromEntries(searchParams.entries()))
    
    // Si hay un error de autenticación, mostrarlo y no intentar redireccionar
    if (authError) {
      console.error(`Error de autenticación: ${authError}`, authErrorDescription)
      // No hacer nada más, el componente AuthStep mostrará el error
      return
    }
    
    // Función para manejar la redirección
    const handleRedirection = () => {
      if (authSuccess && user) {
        console.log('Condición authSuccess && user cumplida')
        
        // Intentar obtener la URL de retorno guardada en localStorage con la nueva clave específica
        const savedReturnUrl = localStorage.getItem('classes_auth_return_url')
        const savedTimestamp = localStorage.getItem('classes_auth_timestamp')
        
        console.log('Auth success detectado, usuario autenticado:', !!user)
        console.log('Usuario ID:', user.id)
        console.log('Usuario email:', user.email)
        console.log('URL guardada en localStorage:', savedReturnUrl)
        console.log('Timestamp guardado:', savedTimestamp)
        
        // Verificar si tenemos una URL guardada
        if (savedReturnUrl) {
          // Limpiar localStorage
          localStorage.removeItem('classes_auth_return_url')
          localStorage.removeItem('classes_auth_action')
          localStorage.removeItem('classes_auth_timestamp')
          
          // Verificar que el returnUrl sea válido (debe empezar con /clases/)
          if ((savedReturnUrl.startsWith('/clases/') || savedReturnUrl === '/clases') && 
              savedReturnUrl !== '/clases/login' && 
              savedReturnUrl !== '/clases/auth/callback' &&
              !savedReturnUrl.includes('error=')) {
            console.log('Redirigiendo a URL guardada después de autenticación con Google:', savedReturnUrl)
            router.replace(savedReturnUrl)
            return
          } else {
            console.log('URL guardada no es válida:', savedReturnUrl)
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
      console.log('Programando redirección después de la autenticación con Google')
      const timer = setTimeout(() => {
        console.log('Ejecutando redirección programada')
        handleRedirection()
      }, 1500) // Aumentamos aún más el tiempo de espera para asegurar que todo esté cargado
      
      return () => clearTimeout(timer)
    }
  }, [authSuccess, user, router, searchParams, isLoading, authError, authErrorDescription])

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