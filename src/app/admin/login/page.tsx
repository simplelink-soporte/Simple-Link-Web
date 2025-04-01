"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, Suspense } from 'react'
import { AdminLoginForm } from '@/components/auth/AdminLoginForm'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LoginBenefits } from '@/components/admin/LoginBenefits'
import { motion } from 'framer-motion'

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="md" />
    </div>}>
      <AdminLoginPageContent />
    </Suspense>
  )
}

function AdminLoginPageContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')

  useEffect(() => {
    if (!isLoading && user) {
      console.log('✅ Usuario autenticado, redirigiendo...')
      router.replace(returnUrl || '/admin/dashboard/bookings/reservations')
    }
  }, [user, isLoading, router, returnUrl])

  // Mostrar estado de carga mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner size="md" />
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, mostrar el formulario de login con diseño de dos columnas
  if (!user) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen w-full overflow-x-hidden bg-white">
        {/* Parte superior para móviles / Lado izquierdo para desktop */}
        <div className="hidden md:block md:w-5/12 relative">
          {/* Fondo diagonal negro - solo para desktop con animación */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-black transform -skew-x-6 origin-top-right"
              initial={{ width: "1%" }}
              animate={{ width: "100%" }}
              transition={{ 
                duration: 0.5, 
                ease: "easeOut",
                delay: 0.2
              }}
            />
          </div>
          
          {/* Contenido de beneficios - desktop */}
          <div className="relative z-10 h-full flex flex-col justify-center items-start p-12 text-white">
            <LoginBenefits />
          </div>
        </div>
        
        {/* Parte superior para móviles / Lado derecho para desktop */}
        <div className="w-full md:w-7/12 flex items-center justify-center py-8 px-4 md:px-0">
          <div className="w-full max-w-[550px]">
            <motion.div 
              className="md:border md:border-gray-200 md:rounded-lg bg-white"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.7, 
                ease: [0.25, 0.1, 0.25, 1.0],
                delay: 0.4
              }}
            >
              <AdminLoginForm />
            </motion.div>
          </div>
        </div>
        
        {/* Parte inferior para móviles - Beneficios */}
        <div className="md:hidden w-full bg-black p-8 mt-6">
          <LoginBenefits />
        </div>
      </div>
    )
  }

  // Este return nunca debería ejecutarse debido al efecto de redirección
  return null
}