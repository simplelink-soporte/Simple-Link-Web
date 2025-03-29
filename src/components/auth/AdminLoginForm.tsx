"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { IconMail, IconLock, IconLoader2, IconBrandGoogle, IconUserPlus, IconLogin, IconArrowLeft, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

type LoginFormData = z.infer<typeof loginSchema>

export function AdminLoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const { signIn, signUp, signInWithGoogle, signOut } = useAuth()
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    setError: setFormError,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  // Efecto para manejar errores en la URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const error = searchParams.get('error')
    const action = searchParams.get('action')
    
    if (error === 'unauthorized') {
      toast.error('No tienes permisos de administrador para acceder a esta sección')
    } else if (error === 'callback') {
      toast.error('Error al procesar la autenticación con Google')
    }

    // Si viene con parámetro de registro, mostrar la vista de registro
    if (action === 'register') {
      setIsRegistering(true)
    }
  }, [])

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Limpiar errores previos
      setEmailError(null)
      setPasswordError(null)
      setIsLoading(true)
      
      // Usar signUp o signIn según el modo actual
      const result = isRegistering 
        ? await signUp({
            email: data.email,
            password: data.password
          })
        : await signIn({
            email: data.email,
            password: data.password
          })

      if (!result?.user) {
        throw new Error(isRegistering ? 'Error al registrar usuario' : 'Error al iniciar sesión')
      }

      // Verificar estado de la empresa y onboarding
      if (!result.onboarding.hasEmpresa) {
        console.log('Usuario sin empresa, redirigiendo a onboarding')
        toast.info('Por favor, complete el registro de su empresa')
        window.location.href = '/admin/onboarding'
        return
      }

      if (!result.onboarding.isOnboardingComplete) {
        console.log('Onboarding incompleto, redirigiendo a onboarding')
        toast.info('Por favor, complete el proceso de configuración inicial')
        window.location.href = '/admin/onboarding'
        return
      }

      console.log('Login exitoso, redirigiendo al dashboard')
      toast.success(isRegistering ? 'Registro exitoso' : 'Inicio de sesión exitoso')
      router.replace('/admin/dashboard/bookings/reservations')
    } catch (error: any) {
      console.error(isRegistering ? 'Error en registro:' : 'Error en login:', error)
      
      // Manejar errores específicos y mostrarlos en los campos correspondientes
      const errorMessage = error.message || '';
      
      if (errorMessage === 'Invalid login credentials' || errorMessage.includes('invalid credentials')) {
        if (isRegistering) {
          setEmailError('Error al crear cuenta. Intente con otro correo')
        } else {
          setEmailError('Correo o contraseña incorrectos')
          setPasswordError('Correo o contraseña incorrectos')
        }
      } else if (errorMessage.includes('User already registered')) {
        setEmailError('Este correo ya está registrado')
      } else if (errorMessage.includes('Password should be')) {
        setPasswordError('La contraseña debe tener al menos 6 caracteres')
      } else if (errorMessage.includes('Invalid email')) {
        setEmailError('Formato de correo inválido')
      } else if (errorMessage.includes('Email not confirmed')) {
        setEmailError('Correo no confirmado. Revisa tu bandeja de entrada')
      } else {
        // Para otros errores, usar el mensaje general
        setFormError('root', { 
          type: 'manual',
          message: errorMessage || (isRegistering ? 'Error al registrar usuario' : 'Error al iniciar sesión')
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      console.log('Iniciando autenticación con Google desde AdminLoginForm')
      
      // Obtener la URL actual para usarla en el returnUrl
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/admin/dashboard/bookings/reservations'
      
      // Guardar el returnUrl en localStorage para recuperarlo después de la autenticación
      localStorage.setItem('auth_return_url', returnUrl)
      
      // Guardar si es registro o inicio de sesión
      localStorage.setItem('auth_action', isRegistering ? 'register' : 'login')
      
      console.log('Guardando returnUrl para después de la autenticación:', returnUrl)
      console.log('Acción de autenticación:', isRegistering ? 'register' : 'login')
      
      // Mostrar mensaje de redirección
      toast.info('Redirigiendo a Google para autenticación...')
      
      // Usar URL absoluta para evitar problemas con subdominios
      const origin = window.location.origin
      const redirectUrl = `${origin}/auth/callback?client_type=admin&action=${isRegistering ? 'register' : 'login'}`
      
      // Llamar directamente a Supabase para evitar problemas de redirección
      // Usar signInWithOAuth con opciones optimizadas
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

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
  }

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm">
        {/* Encabezado */}
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-gray-900">
            {isRegistering 
              ? 'Crear Cuenta - SimpleLink Admin' 
              : 'SimpleLink - Panel Administrativo'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isRegistering 
              ? 'Crea una cuenta para administrar tu negocio' 
              : 'Ingresa tus credenciales para continuar'}
          </p>
        </div>

        {/* Link de contacto para acceso administrativo */}
        <button
          type="button"
          onClick={() => toast.info('Por favor, contacta con el equipo de soporte para solicitar acceso administrativo')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 mb-8"
        >
          ¿Necesitas ayuda? <span className="text-gray-900 font-medium">Contacta con soporte</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {isRegistering && (
            <div className="mb-4">
              <button 
                onClick={toggleMode}
                className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                <IconArrowLeft className="w-4 h-4 mr-1" />
                Volver a inicio de sesión
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error general */}
            {errors.root && (
              <div className="p-3 rounded-md bg-red-50 border border-red-100">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

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
                    (errors.email || emailError) && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                  placeholder="tu@email.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
              {!errors.email && emailError && (
                <p className="text-sm text-red-600">{emailError}</p>
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
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  disabled={isLoading}
                  className={cn(
                    "block w-full pl-9 pr-9 py-2 text-sm rounded-md",
                    "bg-white border border-gray-200",
                    "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "placeholder:text-gray-400",
                    (errors.password || passwordError) && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
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
              {!errors.password && passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
              {!isRegistering && (
                <div className="mt-1">
                  <a 
                    href="https://www.simple-link.com/reset" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              )}
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
                  <span>{isRegistering ? 'Registrando...' : 'Iniciando sesión...'}</span>
                </>
              ) : (
                <>
                  {isRegistering ? (
                    <>
                      <IconUserPlus className="w-4 h-4 mr-2" />
                      <span>Registrarse</span>
                    </>
                  ) : (
                    <>
                      <IconLogin className="w-4 h-4 mr-2" />
                      <span>Iniciar Sesión</span>
                    </>
                  )}
                </>
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
              "bg-white text-gray-700 border border-gray-200",
              "text-sm font-medium",
              "hover:bg-gray-50",
              "focus:outline-none focus:ring-2 focus:ring-gray-200",
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
                <span>{isRegistering ? 'Registrarse con Google' : 'Continuar con Google'}</span>
              </>
            )}
          </button>

          {/* Toggle entre registro e inicio de sesión - Solo mostrar si no está en modo registro */}
          {!isRegistering && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                ¿No tienes cuenta? <span className="font-medium">Regístrate</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}