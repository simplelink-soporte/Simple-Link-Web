"use client"

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { IconMail, IconLock, IconLoader2 } from '@tabler/icons-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createSupabaseClient } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onLoginSuccess?: () => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginFormContent onLoginSuccess={onLoginSuccess} />
    </Suspense>
  )
}

function LoginFormContent({ onLoginSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'register'>('login')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  
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
      const supabase = createSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (error) throw error

      toast.success('Inicio de sesión exitoso')
      
      if (redirectTo) {
        const decodedUrl = decodeURIComponent(redirectTo)
        router.replace(decodedUrl)
      } else {
        onLoginSuccess?.()
        router.replace('/')
      }
    } catch (error: any) {
      console.error('Error en inicio de sesión:', error)
      toast.error(error.message || 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    toast.info('Funcionalidad en desarrollo')
  }

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Link de registro */}
        <button
          type="button"
          onClick={() => router.push('/register')}
          className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 mb-8 text-center"
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
              onClick={() => toast.info('Funcionalidad en desarrollo')}
              className={cn(
                "w-full flex items-center justify-center gap-2",
                "px-4 py-2 rounded-md",
                "bg-white text-gray-700 border border-gray-200",
                "text-sm font-medium",
                "hover:bg-gray-50",
                "focus:outline-none focus:ring-2 focus:ring-gray-200",
                "transition-colors duration-200"
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continuar con Google</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
} 