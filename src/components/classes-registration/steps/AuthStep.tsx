"use client"

import { useState, Suspense, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { IconMail, IconLock, IconLoader2, IconBrandGoogle, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useClassRegistrationAuth } from '../hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { StepHeader } from '../shared/StepSection'
import { RegisterForm } from '../components/RegisterForm'
import { vinculacionService } from '@/services/vinculacionService'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

type LoginFormData = z.infer<typeof loginSchema>

interface AuthStepProps {
  onLoginSuccess?: () => void
}

export function AuthStep({ onLoginSuccess }: AuthStepProps) {
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const authError = searchParams.get('error')
  const authErrorDescription = searchParams.get('error_description')

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AuthStepContent 
        onLoginSuccess={onLoginSuccess} 
        returnUrl={returnUrl} 
        authError={authError} 
        authErrorDescription={authErrorDescription} 
      />
    </Suspense>
  )
}

function AuthStepContent({ onLoginSuccess, returnUrl, authError, authErrorDescription }: AuthStepProps & { returnUrl: string | null, authError: string | null, authErrorDescription: string | null }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'register'>('login')
  const { signIn, signInWithGoogle } = useClassRegistrationAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  useEffect(() => {
    if (authError) {
      let errorMessage = 'Error al iniciar sesión con Google'
      
      if (authError === 'access_denied') {
        errorMessage = 'Acceso denegado. La autenticación con Google fue cancelada o rechazada.'
      } else if (authErrorDescription) {
        errorMessage = `Error: ${authErrorDescription}`
      }
      
      toast.error(errorMessage)
      console.error('Error de autenticación con Google:', authError, authErrorDescription)
    }
  }, [authError, authErrorDescription])

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      const result = await signIn({
        email: data.email,
        password: data.password
      })

      if (!result?.user) {
        throw new Error('Error al iniciar sesión')
      }

      // Obtener el slug del returnUrl
      let slug = ''
      if (returnUrl) {
        const decodedUrl = decodeURIComponent(returnUrl)
        const match = decodedUrl.match(/\/clases\/([^\/]+)/)
        if (match && match[1]) {
          slug = match[1]
        }
      }

      // Si tenemos slug, obtener el empresa_id y crear la vinculación
      if (slug) {
        try {
          const supabase = createClientComponentClient<Database>()
          
          // Obtener el empresa_id usando el slug
          const { data: link, error: linkError } = await supabase
            .from('company_links')
            .select('empresa_id')
            .eq('slug', slug)
            .eq('is_active', true)
            .single()

          if (linkError) throw linkError
          if (!link) throw new Error('No se encontró el link de la empresa')

          // Crear la vinculación usando el empresa_id real
          await vinculacionService.createVinculacion(result.user.id, link.empresa_id)
        } catch (vinculacionError) {
          console.error('Error al crear vinculación:', vinculacionError)
          // No interrumpimos el flujo si falla la vinculación
        }
      }

      toast.success('Inicio de sesión exitoso')
      
      if (returnUrl) {
        const decodedUrl = decodeURIComponent(returnUrl)
        // Verificar que la URL sea válida y no sea la página de login
        if (decodedUrl.startsWith('/clases/') && !decodedUrl.includes('/login')) {
          console.log('Redirigiendo a:', decodedUrl)
          router.replace(decodedUrl)
        } else {
          console.log('URL de retorno inválida, redirigiendo a /clases')
          router.replace('/clases')
        }
      } else {
        onLoginSuccess?.()
      }
    } catch (error: any) {
      console.error('Error en inicio de sesión:', error)
      toast.error(error.message || 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    window.location.href = 'https://www.simple-link.com/reset'
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      console.log('Iniciando autenticación con Google desde AuthStep')
      
      // Obtener la URL actual para usarla en el returnUrl
      let currentReturnUrl = '/clases'
      
      // Si hay un returnUrl en los parámetros de la URL, usarlo
      if (returnUrl) {
        try {
          currentReturnUrl = decodeURIComponent(returnUrl)
          console.log('URL de retorno obtenida de parámetro URL:', currentReturnUrl)
        } catch (e) {
          console.error('Error al decodificar returnUrl:', e)
        }
      } else {
        // Intentar extraer el slug de la URL actual
        const pathSegments = window.location.pathname.split('/')
        if (pathSegments.length >= 3 && pathSegments[1] === 'clases') {
          const possibleSlug = pathSegments[2]
          if (possibleSlug && possibleSlug !== 'login' && possibleSlug !== 'auth') {
            currentReturnUrl = `/clases/${possibleSlug}`
            console.log('URL de retorno construida a partir de la URL actual:', currentReturnUrl)
          } else {
            console.log('No se pudo extraer un slug válido de la URL actual')
          }
        } else {
          console.log('No se pudo extraer información útil de la URL actual')
        }
      }
      
      // Decodificar el returnUrl si está codificado
      if (currentReturnUrl !== '/clases') {
        try {
          if (currentReturnUrl.includes('%')) {
            currentReturnUrl = decodeURIComponent(currentReturnUrl)
          }
        } catch (e) {
          console.error('Error al decodificar returnUrl:', e)
        }
      }
      
      // Si la URL de retorno es la página de callback o login, usar la página principal
      if (currentReturnUrl.includes('/auth/callback') || 
          currentReturnUrl === '/clases/login' ||
          currentReturnUrl === '/clases') {
        console.log('URL de retorno no válida, usando /clases como fallback')
        currentReturnUrl = '/clases'
      }
      
      // Asegurarse de que la URL comience con /clases/
      if (!currentReturnUrl.startsWith('/clases/') && currentReturnUrl !== '/clases') {
        console.log('URL de retorno no comienza con /clases/, prefijando')
        currentReturnUrl = `/clases/${currentReturnUrl.replace(/^\//, '')}`
      }
      
      // Guardar el returnUrl en localStorage para recuperarlo después de la autenticación
      console.log('Guardando returnUrl en localStorage:', currentReturnUrl)
      
      // Usar un nombre de clave más específico para evitar conflictos
      localStorage.setItem('classes_auth_return_url', currentReturnUrl)
      
      // Guardar si es registro o inicio de sesión con un nombre más específico
      localStorage.setItem('classes_auth_action', authView === 'register' ? 'register' : 'login')
      
      // También guardar la marca de tiempo para verificar la frescura de los datos
      localStorage.setItem('classes_auth_timestamp', Date.now().toString())
      
      console.log('Guardando returnUrl para después de la autenticación:', currentReturnUrl)
      console.log('Acción de autenticación:', authView === 'register' ? 'register' : 'login')
      
      // Mostrar mensaje de redirección
      toast.info('Redirigiendo a Google para autenticación...')
      
      // Redirigir a la página de autenticación de Google usando el contexto de autenticación
      // La función signInWithGoogle no acepta parámetros según la implementación en AuthContext
      await signInWithGoogle()
    } catch (error: any) {
      console.error('Error al iniciar autenticación con Google:', error)
      toast.error(error.message || 'Error al conectar con Google')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm mx-auto">
        {authView === 'login' ? (
          <>
            <div className="mb-6">
              <Image
                src="/images/Miroodles - Mono Comp.png"
                alt="Login illustration"
                width={120}
                height={120}
                className="mb-4"
              />
            </div>
            <StepHeader 
              title="Iniciar sesión"
              subtitle="Ingresa tus credenciales para continuar"
              className="mb-2"
            />

            {/* Link de registro */}
            <button
              type="button"
              onClick={() => setAuthView('register')}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 mb-8"
            >
              ¿No tienes cuenta? <span className="text-gray-900 font-medium">Crea una aquí</span>
            </button>

            <div className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IconMail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        autoComplete="email"
                        disabled={isLoading}
                        className={cn(
                          "block w-full pl-9 pr-3 py-2 text-sm rounded-md",
                          "bg-white border border-gray-200",
                          "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "placeholder:text-gray-400",
                          errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        )}
                        placeholder="tu@email.com"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Contraseña */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IconLock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        disabled={isLoading}
                        className={cn(
                          "block w-full pl-9 pr-9 py-2 text-sm rounded-md",
                          "bg-white border border-gray-200",
                          "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "placeholder:text-gray-400",
                          errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        )}
                        placeholder="••••••"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <IconEyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <IconEye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Olvidé mi contraseña */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  {/* Botón de inicio de sesión */}
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center justify-center",
                      "px-4 py-2 rounded-md",
                      "bg-gray-900 text-white",
                      "text-sm font-medium",
                      "hover:bg-gray-800",
                      "focus:outline-none focus:ring-2 focus:ring-gray-900/10",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-colors duration-200"
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {isLoading ? (
                      <>
                        <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Iniciando sesión...</span>
                      </>
                    ) : (
                      <span>Iniciar Sesión</span>
                    )}
                  </motion.button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">o</span>
                  </div>
                </div>

                {/* Botón de Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2",
                    "px-4 py-2 rounded-md",
                    "bg-white text-gray-800",
                    "text-sm font-medium",
                    "border border-gray-200",
                    "hover:bg-gray-50",
                    "focus:outline-none focus:ring-2 focus:ring-gray-900/10",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors duration-200"
                  )}
                >
                  {isGoogleLoading ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      <span>Conectando con Google...</span>
                    </>
                  ) : (
                    <>
                      <IconBrandGoogle className="w-4 h-4" />
                      <span>Continuar con Google</span>
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          </>
        ) : (
          <RegisterForm 
            onBack={() => setAuthView('login')}
            onSuccess={() => {
              if (returnUrl) {
                router.push(returnUrl)
              } else {
                onLoginSuccess?.()
              }
            }}
          />
        )}
      </div>
    </div>
  )
} 