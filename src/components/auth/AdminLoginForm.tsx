"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { IconMail, IconLock, IconLoader2, IconBrandGoogle } from '@tabler/icons-react'
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
  const { signIn, signInWithGoogle, signOut } = useAuth()
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
    
    if (error === 'unauthorized') {
      toast.error('No tienes permisos de administrador para acceder a esta sección')
    } else if (error === 'callback') {
      toast.error('Error al procesar la autenticación con Google')
    }
  }, [])

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
      toast.success('Inicio de sesión exitoso')
      router.replace('/admin/dashboard/bookings/reservations')
    } catch (error: any) {
      console.error('Error en login:', error)
      const errorMessage = error.message === 'Invalid login credentials'
        ? 'Credenciales inválidas'
        : error.message || 'Error al iniciar sesión'
        
      setFormError('root', { 
        type: 'manual',
        message: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      console.log('Iniciando autenticación con Google desde AdminLoginForm')
      
      // Obtener la URL actual para usarla en el returnUrl
      const currentUrl = window.location.href
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/admin/dashboard/bookings/reservations'
      
      // Guardar el returnUrl en localStorage para recuperarlo después de la autenticación
      localStorage.setItem('auth_return_url', returnUrl)
      
      console.log('Guardando returnUrl para después de la autenticación:', returnUrl)
      
      await signInWithGoogle()
      // La redirección y verificación se manejan en el callback
    } catch (error: any) {
      const errorMessage = error.message || 'Error al iniciar sesión con Google'
      toast.error(errorMessage)
      console.error('Error en inicio de sesión con Google:', error)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm">
        {/* Encabezado */}
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-gray-900">
            SimpleLink - Panel Administrativo 
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Link de contacto para acceso administrativo */}
        <button
          type="button"
          onClick={() => toast.info('Por favor, contacta con el equipo de soporte para solicitar acceso administrativo')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 mb-8"
        >
          ¿Necesitas acceso administrativo? <span className="text-gray-900 font-medium">Contacta con soporte</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
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
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className={cn(
                    "block w-full pl-9 pr-3 py-2 text-sm rounded-md",
                    "bg-white border border-gray-200",
                    "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "placeholder:text-gray-400",
                    errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                  placeholder="••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
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
                <span>Continuar con Google</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
} 