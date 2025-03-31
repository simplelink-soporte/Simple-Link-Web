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
  
  // Verificar si viene de una autenticación exitosa con Google
  const authSuccess = searchParams.get('auth_success') === 'true'
  const authAction = searchParams.get('action')
  const authError = searchParams.get('error')
  const authErrorDescription = searchParams.get('error_description')
  
  // Manejar redirección después de autenticación con Google
  useEffect(() => {
    console.log('Efecto de redirección ejecutándose en reservas/login')
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
        const savedReturnUrl = localStorage.getItem('reservas_auth_return_url')
        const savedTimestamp = localStorage.getItem('reservas_auth_timestamp')
        
        console.log('Auth success detectado, usuario autenticado:', !!user)
        console.log('Usuario ID:', user.id)
        console.log('Usuario email:', user.email)
        console.log('URL guardada en localStorage:', savedReturnUrl)
        console.log('Timestamp guardado:', savedTimestamp)
        
        // Verificar si tenemos una URL guardada
        if (savedReturnUrl) {
          // Limpiar localStorage
          localStorage.removeItem('reservas_auth_return_url')
          localStorage.removeItem('reservas_auth_action')
          localStorage.removeItem('reservas_auth_timestamp')
          
          // Verificar que el returnUrl sea válido (debe empezar con /reservas/)
          if ((savedReturnUrl.startsWith('/reservas/') || savedReturnUrl === '/reservas') && 
              savedReturnUrl !== '/reservas/login' && 
              savedReturnUrl !== '/reservas/auth/callback' &&
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
        console.log('Redirigiendo a página principal de reservas')
        router.replace('/reservas')
      }
    }
    
    // Ejecutar la redirección después de un breve retraso para asegurar que todo esté cargado
    if (authSuccess && user) {
      console.log('Programando redirección después de la autenticación con Google')
      const timer = setTimeout(() => {
        console.log('Ejecutando redirección programada')
        handleRedirection()
      }, 1500) // Aumentamos el tiempo de espera para asegurar que todo esté cargado
      
      return () => clearTimeout(timer)
    }
  }, [authSuccess, user, router, searchParams, isLoading, authError, authErrorDescription])
  
  // Redirigir si ya hay una sesión activa
  useEffect(() => {
    if (!isLoading && user && !authSuccess) {
      // Verificar que el returnUrl sea válido (debe empezar con /reservas/)
      if (decodedReturnUrl && decodedReturnUrl.startsWith('/reservas/') && decodedReturnUrl !== '/reservas/login') {
        router.replace(decodedReturnUrl)
      } else {
        router.replace('/reservas')
      }
    }
  }, [user, isLoading, router, decodedReturnUrl, authSuccess])

  // Si está cargando o hay usuario, mostrar loading
  if (isLoading || (user && !authSuccess)) {
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
