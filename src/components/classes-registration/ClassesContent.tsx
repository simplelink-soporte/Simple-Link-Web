"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ClassRegistrationForm } from '@/components/classes-registration'
import { PackageStatusModal } from './shared/PackageStatusModal'
import { useUserPackages } from './hooks/useUserPackages'

interface ClassesContentProps {
  empresaId: string
}

export function ClassesContent({ empresaId }: ClassesContentProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const { activePackage, isLoading: isLoadingPackages } = useUserPackages()

  useEffect(() => {
    // Solo verificamos una vez después de que isLoading sea false
    if (!isLoading && !hasCheckedAuth) {
      setHasCheckedAuth(true)
      
      if (!user) {
        const returnUrl = encodeURIComponent(`/clases/${empresaId}`)
        router.push(`/clases/login?returnUrl=${returnUrl}`)
      }
    }
  }, [user, isLoading, router, empresaId, hasCheckedAuth])

  // Mostrar el modal cuando se detecte un paquete activo
  useEffect(() => {
    if (!isLoadingPackages && activePackage) {
      setShowPackageModal(true)
    }
  }, [isLoadingPackages, activePackage])

  // Mostrar un estado de carga mientras verificamos la autenticación
  if (isLoading || !hasCheckedAuth || isLoadingPackages) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Verificando autenticación...</div>
      </div>
    )
  }

  // Si no hay usuario después de verificar, no mostramos nada
  if (!user) {
    return null
  }

  return (
    <div 
      className="h-full flex flex-col justify-start overflow-visible"
    >
      {activePackage && (
        <PackageStatusModal
          isOpen={showPackageModal}
          onClose={() => setShowPackageModal(false)}
          activePackage={activePackage}
        />
      )}
      <ClassRegistrationForm />
    </div>
  )
} 