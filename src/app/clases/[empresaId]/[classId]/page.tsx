"use client"

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ClassRegistrationProvider, ClassRegistrationForm } from '@/components/classes-registration'
import { LoadingState } from '@/components/classes-registration/shared/LoadingState'
import { cn } from '@/lib/utils'

interface Props {
  params: {
    empresaId: string
    classId: string
  }
}

export default function ClassRegistrationPage({ params }: Props) {
  const router = useRouter()
  const { user, isLoading: isLoadingAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  
  // Desenvolver params de forma segura con tipado
  const { empresaId, classId } = use(params as any) as Props['params'];

  // Efecto para manejar la autenticación y el estado inicial
  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user) {
        // Si no hay usuario, redirigir al login con returnUrl
        const currentPath = `/clases/${empresaId}/${classId}`
        const loginUrl = `/clases/login?returnUrl=${encodeURIComponent(currentPath)}`
        router.push(loginUrl)
      } else {
        // Si hay usuario, permitir la carga del contenido
        setIsLoading(false)
      }
    }
  }, [user, isLoadingAuth, router, empresaId, classId])

  // Estado de carga
  if (isLoading || isLoadingAuth) {
    return <LoadingState message="Preparando sesión..." />
  }

  // Si no hay usuario, no mostrar nada (la redirección se manejará en el useEffect)
  if (!user) {
    return null
  }

  return (
    <div className={cn(
      "h-screen w-full",
      "bg-white",
      "flex flex-col",
      "py-12",
      "overflow-hidden"
    )}>
      <ClassRegistrationProvider empresaId={empresaId}>
        <ClassRegistrationForm selectedClassId={classId} />
      </ClassRegistrationProvider>
    </div>
  )
} 