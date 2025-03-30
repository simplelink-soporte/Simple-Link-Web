"use client"

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  IconArrowLeft, 
  IconMail, 
  IconLock, 
  IconUser, 
  IconPhone, 
  IconLoader2,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconX
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import { StepHeader } from '../shared/StepSection'
import type { Database } from '@/types/supabase'
import { supabase } from '@/lib/supabase'

interface RegisterFormProps {
  onBack: () => void
  onSuccess: () => void
}

interface RegisterFormData {
  email: string
  password: string
  nombre: string
  telefono: string
}

interface PasswordRequirement {
  text: string
  validator: (password: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    text: "Al menos 6 caracteres",
    validator: (password) => password.length >= 6
  },
  {
    text: "Al menos una letra",
    validator: (password) => /[a-zA-Z]/.test(password)
  },
  {
    text: "Al menos un número",
    validator: (password) => /[0-9]/.test(password)
  }
]

export function RegisterForm({ onBack, onSuccess }: RegisterFormProps) {
  const { empresaId, dispatch } = useClassRegistration()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    nombre: '',
    telefono: ''
  })

  // Función para validar los requisitos de la contraseña
  const validatePasswordRequirements = useCallback((password: string) => {
    return PASSWORD_REQUIREMENTS.every(req => req.validator(password))
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      console.log('Iniciando registro con Google desde RegisterForm')
      
      // Guardar que estamos en el flujo de registro, no de login
      localStorage.setItem('classes_auth_action', 'register')
      
      // También guardar la marca de tiempo para verificar la frescura de los datos
      localStorage.setItem('classes_auth_timestamp', Date.now().toString())
      
      // Obtener la URL actual para usarla en el returnUrl
      // En lugar de usar window.location.pathname, intentamos obtener la URL original
      // de donde vino el usuario, que debería estar en la URL actual como parámetro
      let currentReturnUrl = '/clases'
      
      // Intentar obtener la URL de retorno de la URL actual
      const urlParams = new URLSearchParams(window.location.search)
      const urlReturnParam = urlParams.get('returnUrl')
      
      if (urlReturnParam) {
        try {
          // Si hay un parámetro returnUrl en la URL, usarlo
          currentReturnUrl = decodeURIComponent(urlReturnParam)
          console.log('URL de retorno obtenida de parámetro URL:', currentReturnUrl)
        } catch (e) {
          console.error('Error al decodificar returnUrl de parámetros:', e)
        }
      } else {
        // Si no hay parámetro, usar la URL de la empresa si está disponible
        if (empresaId) {
          // Construir una URL basada en el ID de la empresa
          currentReturnUrl = `/clases/${empresaId}`
          console.log('URL de retorno construida con empresaId:', currentReturnUrl)
        } else {
          console.log('No se encontró returnUrl en parámetros ni empresaId, usando /clases como fallback')
        }
      }
      
      // Asegurarse de que la URL comience con /clases/
      if (!currentReturnUrl.startsWith('/clases/') && currentReturnUrl !== '/clases') {
        console.log('URL de retorno no comienza con /clases/, prefijando')
        currentReturnUrl = `/clases/${currentReturnUrl.replace(/^\//, '')}`
      }
      
      // Guardar el returnUrl en localStorage para recuperarlo después de la autenticación
      console.log('Guardando returnUrl en localStorage:', currentReturnUrl)
      localStorage.setItem('classes_auth_return_url', currentReturnUrl)
      
      // Mostrar mensaje de redirección
      toast.info('Redirigiendo a Google para autenticación...')
      
      // Redirigir a la página de autenticación de Google
      const supabase = createClientComponentClient<Database>()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/clases/auth/callback?action=register&client_type=classes`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      
      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('Error al iniciar autenticación con Google:', error)
      toast.error(error.message || 'Error al conectar con Google')
      setIsGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId) {
      toast.error('No se encontró la información de la organización')
      return
    }

    // Validar contraseña antes de enviar
    if (!validatePasswordRequirements(formData.password)) {
      toast.error('La contraseña no cumple con los requisitos mínimos')
      return
    }

    setIsLoading(true)
    const supabase = createClientComponentClient<Database>()

    try {
      // 1. Registrar usuario en Auth con los campos correctos
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.nombre,
            phone: formData.telefono,
            nombre_original: formData.nombre,
            telefono_original: formData.telefono
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signUpError) {
        throw new Error(signUpError.message)
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario')
      }

      // 2. Crear vinculación entre usuario y empresa
      const { error: linkError } = await supabase
        .from('vinculaciones')
        .insert({
          user_id: authData.user.id,
          empresa_id: empresaId,
          estado: 'activo',
          metadata: {
            created_through: 'class_registration'
          }
        })

      if (linkError) {
        throw new Error('Error al vincular usuario con la empresa')
      }

      dispatch({ type: 'SET_AUTH_STATUS', payload: { isAuthenticated: true, isGuest: false } })
      toast.success('Cuenta creada exitosamente. Por favor, verifica tu correo electrónico.')
      onSuccess()
    } catch (error: any) {
      console.error('Error al registrar usuario:', error)
      
      if (error.message.includes('duplicate key')) {
        toast.error('Ya existe una cuenta con este correo electrónico')
      } else {
        toast.error(error.message || 'Error al crear la cuenta. Por favor, intenta de nuevo.')
      }
      
      dispatch({ type: 'SET_ERROR', payload: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  // Renderizar los requisitos de la contraseña
  const renderPasswordRequirements = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ 
        opacity: formData.password ? 1 : 0,
        height: formData.password ? 'auto' : 0
      }}
      transition={{ duration: 0.2 }}
      className="space-y-2 mt-2 text-sm"
    >
      {PASSWORD_REQUIREMENTS.map((requirement, index) => {
        const isValid = requirement.validator(formData.password)
        return (
          <div 
            key={index}
            className={cn(
              "flex items-center gap-2",
              "text-gray-500",
              isValid && "text-green-600"
            )}
          >
            {isValid ? (
              <IconCheck className="w-4 h-4 text-green-600" />
            ) : (
              <IconX className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-xs">{requirement.text}</span>
          </div>
        )
      })}
    </motion.div>
  )

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center gap-1"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
      </div>

      <StepHeader 
        title="Crear cuenta"
        subtitle="Regístrate para continuar"
        className="mb-8"
      />

      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre completo */}
            <div className="space-y-1.5">
              <label htmlFor="nombre" className="text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconUser className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className={cn(
                    "block w-full pl-9 pr-3 py-2 text-sm rounded-md",
                    "bg-white border border-gray-200",
                    "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "placeholder:text-gray-400"
                  )}
                  placeholder="Tu nombre"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconMail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={cn(
                    "block w-full pl-9 pr-3 py-2 text-sm rounded-md",
                    "bg-white border border-gray-200",
                    "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "placeholder:text-gray-400"
                  )}
                  placeholder="correo@ejemplo.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label htmlFor="telefono" className="text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconPhone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  className={cn(
                    "block w-full pl-9 pr-3 py-2 text-sm rounded-md",
                    "bg-white border border-gray-200",
                    "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "placeholder:text-gray-400"
                  )}
                  placeholder="+1234567890"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Campo de contraseña mejorado */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconLock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={cn(
                    "block w-full pl-9 pr-12 py-2 text-sm rounded-md",
                    "bg-white border border-gray-200",
                    "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "placeholder:text-gray-400",
                    "transition-colors duration-200"
                  )}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    "absolute inset-y-0 right-0 pr-3",
                    "flex items-center",
                    "text-gray-400 hover:text-gray-600",
                    "transition-colors duration-200"
                  )}
                >
                  {showPassword ? (
                    <IconEyeOff className="h-4 w-4" />
                  ) : (
                    <IconEye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {renderPasswordRequirements()}
            </div>

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
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <span>Crear cuenta</span>
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

          {/* Botón de Google - Ahora habilitado */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
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
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continuar con Google</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </>
  )
} 