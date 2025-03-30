"use client"

import { useState, Suspense, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { IconMail, IconLock, IconLoader2, IconBrandGoogle, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useShiftRegistrationAuth } from '../hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
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

function AuthStep({ onLoginSuccess }: AuthStepProps) {
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
  const { signIn } = useShiftRegistrationAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Verificar si viene de una autenticación exitosa con Google
  const authSuccess = searchParams.get('auth_success') === 'true'
  const authAction = searchParams.get('action')
  
  // Mostrar mensaje de error si viene de un error de autenticación con Google
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
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

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
        const match = decodedUrl.match(/\/turnos\/([^\/]+)/)
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
        if (decodedUrl.startsWith('/turnos/') && !decodedUrl.includes('/login')) {
          console.log('Redirigiendo a:', decodedUrl)
          router.replace(decodedUrl)
        } else {
          console.log('URL de retorno inválida, redirigiendo a /turnos')
          router.replace('/turnos')
        }
      } else {
        // En lugar de simplemente llamar a onLoginSuccess, verificamos si estamos en la página de turnos
        const currentPath = window.location.pathname
        
        // Si la ruta actual comienza con /shifts/, estamos en un formulario de turnos
        // y debemos permanecer en él
        if (currentPath.includes('/shifts/')) {
          console.log('Login exitoso en formulario de turnos, permaneciendo en la misma página')
          // Llamamos a onLoginSuccess para avanzar al siguiente paso
          onLoginSuccess?.()
        } else {
          // Si no estamos en una página de turnos, onLoginSuccess manejará el flujo
          // (normalmente avanzar al siguiente paso)
          console.log('Login exitoso, ejecutando callback de éxito')
          onLoginSuccess?.()
        }
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
      console.log('Iniciando autenticación con Google desde AuthStep de reservas')
      
      // Obtener la URL actual para usarla en el returnUrl
      let currentReturnUrl = returnUrl || window.location.pathname
      
      // Decodificar el returnUrl si está codificado
      if (returnUrl) {
        try {
          currentReturnUrl = decodeURIComponent(returnUrl)
        } catch (e) {
          console.error('Error al decodificar returnUrl:', e)
        }
      }
      
      // Si la URL de retorno es la página de callback o login, usar la página principal
      if (currentReturnUrl.includes('/auth/callback') || 
          currentReturnUrl === '/reservas/login' ||
          currentReturnUrl === '/reservas') {
        console.log('URL de retorno no válida, usando /reservas como fallback')
        currentReturnUrl = '/reservas'
      }
      
      // Asegurarse de que la URL comience con /reservas/
      if (!currentReturnUrl.startsWith('/reservas/') && currentReturnUrl !== '/reservas') {
        console.log('URL de retorno no comienza con /reservas/, prefijando')
        currentReturnUrl = `/reservas/${currentReturnUrl.replace(/^\//, '')}`
      }
      
      // Guardar el returnUrl en localStorage para recuperarlo después de la autenticación
      console.log('Guardando returnUrl en localStorage:', currentReturnUrl)
      
      // Usar un nombre de clave más específico para evitar conflictos
      localStorage.setItem('reservas_auth_return_url', currentReturnUrl)
      
      // Guardar si es registro o inicio de sesión con un nombre más específico
      localStorage.setItem('reservas_auth_action', authView === 'register' ? 'register' : 'login')
      
      // También guardar la marca de tiempo para verificar la frescura de los datos
      localStorage.setItem('reservas_auth_timestamp', Date.now().toString())
      
      console.log('Guardando returnUrl para después de la autenticación:', currentReturnUrl)
      console.log('Acción de autenticación:', authView === 'register' ? 'register' : 'login')
      
      // Mostrar mensaje de redirección
      toast.info('Redirigiendo a Google para autenticación...')
      
      // Usar URL absoluta para evitar problemas con subdominios
      const origin = window.location.origin
      
      // Asegurarse de que la URL de redirección sea correcta y completa
      const redirectUrl = `${origin}/reservas/auth/callback?client_type=reservas&action=${authView === 'register' ? 'register' : 'login'}`
      
      console.log('URL de redirección para OAuth:', redirectUrl)
      
      // Llamar directamente a Supabase para evitar problemas de redirección
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile',
          skipBrowserRedirect: false // Asegurar que Supabase maneje la redirección
        }
      })

      if (error) throw error
      
      // No necesitamos hacer nada más aquí, ya que Supabase manejará la redirección
      // y el callback se encargará del resto del proceso
    } catch (error: any) {
      const errorMessage = error.message || 'Error al iniciar sesión con Google'
      toast.error(errorMessage)
      console.error('Error en inicio de sesión con Google:', error)
      setIsGoogleLoading(false) // Asegurarse de desactivar el estado de carga en caso de error
    }
    // Nota: No usamos finally aquí porque la redirección de Supabase interrumpirá la ejecución
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
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
              <p className="text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
            </div>

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
                      <p className="text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
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
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <IconEyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <IconEye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-500">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center justify-center",
                      "px-4 py-2 text-sm font-medium text-white",
                      "bg-gray-900 rounded-md",
                      "hover:bg-gray-800 transition-colors duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Iniciar sesión'
                    )}
                  </button>
                  
                  {/* Separador */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">O continúa con</span>
                    </div>
                  </div>
                  
                  {/* Botón de Google */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className={cn(
                      "w-full flex items-center justify-center",
                      "px-4 py-2 text-sm font-medium text-gray-700",
                      "bg-white border border-gray-200 rounded-md",
                      "hover:bg-gray-50 transition-colors duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isGoogleLoading ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <IconBrandGoogle className="h-4 w-4 mr-2" />
                        Google
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          </>
        ) : (
          <RegisterForm
            onSuccess={() => {
              toast.success('Registro exitoso')
              setAuthView('login')
            }}
            onCancel={() => setAuthView('login')}
          />
        )}
      </div>
    </div>
  )
}

export default AuthStep;
