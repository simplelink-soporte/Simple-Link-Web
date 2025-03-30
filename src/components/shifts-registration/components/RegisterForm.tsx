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
  IconX,
  IconBrandGoogle
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { supabase } from '@/lib/supabase'

interface RegisterFormProps {
  onSuccess: () => void
  onCancel: () => void
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

export function RegisterForm({ onSuccess, onCancel }: RegisterFormProps) {
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
      console.log('Iniciando registro con Google desde RegisterForm de reservas')
      
      // Guardar que estamos en el flujo de registro, no de login
      localStorage.setItem('reservas_auth_action', 'register')
      
      // También guardar la marca de tiempo para verificar la frescura de los datos
      localStorage.setItem('reservas_auth_timestamp', Date.now().toString())
      
      // Obtener la URL actual para usarla en el returnUrl
      let currentReturnUrl = '/reservas'
      
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
        // Intentar extraer el slug de la URL actual
        const pathSegments = window.location.pathname.split('/')
        if (pathSegments.length >= 3 && pathSegments[1] === 'reservas') {
          const possibleSlug = pathSegments[2]
          if (possibleSlug && possibleSlug !== 'login' && possibleSlug !== 'auth') {
            currentReturnUrl = `/reservas/${possibleSlug}`
            console.log('URL de retorno construida a partir de la URL actual:', currentReturnUrl)
          }
        }
      }
      
      // Asegurarse de que la URL comience con /reservas/
      if (!currentReturnUrl.startsWith('/reservas/') && currentReturnUrl !== '/reservas') {
        console.log('URL de retorno no comienza con /reservas/, prefijando')
        currentReturnUrl = `/reservas/${currentReturnUrl.replace(/^\//, '')}`
      }
      
      // Guardar el returnUrl en localStorage para recuperarlo después de la autenticación
      console.log('Guardando returnUrl en localStorage:', currentReturnUrl)
      localStorage.setItem('reservas_auth_return_url', currentReturnUrl)
      
      // Mostrar mensaje de redirección
      toast.info('Redirigiendo a Google para autenticación...')
      
      // Redirigir a la página de autenticación de Google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/reservas/auth/callback?action=register&client_type=reservas`,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsLoading(true)
      
      // Validar que todos los campos estén completos
      if (!formData.email || !formData.password || !formData.nombre) {
        throw new Error('Por favor completa todos los campos requeridos')
      }
      
      // Validar requisitos de contraseña
      if (!validatePasswordRequirements(formData.password)) {
        throw new Error('La contraseña no cumple con los requisitos')
      }
      
      // Crear el cliente de Supabase
      const supabase = createClientComponentClient<Database>()
      
      // Registrar al usuario
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.nombre,
            phone: formData.telefono || undefined
          }
        }
      })
      
      if (error) throw error
      
      if (!data.user) {
        throw new Error('No se pudo crear la cuenta')
      }
      
      // Verificar si el usuario ya existía
      if (data.user.identities?.length === 0) {
        throw new Error('Este email ya está registrado. Por favor inicia sesión.')
      }
      
      toast.success('Cuenta creada exitosamente. Por favor verifica tu email para confirmar tu cuenta.')
      
      // Llamar al callback de éxito
      onSuccess()
      
    } catch (error: any) {
      console.error('Error en registro:', error)
      
      // Manejar errores específicos
      if (error.message.includes('already registered')) {
        toast.error('Este email ya está registrado. Por favor inicia sesión.')
      } else {
        toast.error(error.message || 'Error al crear la cuenta')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <IconArrowLeft className="h-4 w-4 mr-1" />
          Volver a inicio de sesión
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Crear cuenta</h2>
        <p className="text-sm text-gray-500">Completa el formulario para registrarte</p>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconUser className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                disabled={isLoading}
                className={cn(
                  "block w-full pl-9 pr-3 py-2 text-sm rounded-md",
                  "bg-white border border-gray-200",
                  "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "placeholder:text-gray-400"
                )}
                placeholder="Tu nombre completo"
                required
              />
            </div>
          </div>
          
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconMail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className={cn(
                  "block w-full pl-9 pr-3 py-2 text-sm rounded-md",
                  "bg-white border border-gray-200",
                  "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "placeholder:text-gray-400"
                )}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>
          
          {/* Teléfono */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconPhone className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                disabled={isLoading}
                className={cn(
                  "block w-full pl-9 pr-3 py-2 text-sm rounded-md",
                  "bg-white border border-gray-200",
                  "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "placeholder:text-gray-400"
                )}
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>
          
          {/* Contraseña */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconLock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                className={cn(
                  "block w-full pl-9 pr-9 py-2 text-sm rounded-md",
                  "bg-white border border-gray-200",
                  "focus:ring-1 focus:ring-gray-200 focus:border-gray-400",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "placeholder:text-gray-400"
                )}
                placeholder="••••••"
                required
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
            
            {/* Requisitos de contraseña */}
            <div className="mt-2 space-y-2">
              {PASSWORD_REQUIREMENTS.map((req, index) => (
                <div key={index} className="flex items-center text-xs">
                  {formData.password && req.validator(formData.password) ? (
                    <IconCheck className="h-3 w-3 text-green-500 mr-1.5" />
                  ) : (
                    <IconX className="h-3 w-3 text-gray-400 mr-1.5" />
                  )}
                  <span className={cn(
                    formData.password && req.validator(formData.password) 
                      ? "text-green-600" 
                      : "text-gray-500"
                  )}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
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
              'Crear cuenta'
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
                Registrarse con Google
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
