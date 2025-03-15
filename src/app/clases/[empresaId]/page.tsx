"use client"

import { Suspense, useEffect, use } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ClassRegistrationProvider } from '@/components/classes-registration'
import { LoadingState } from '@/components/classes-registration/shared/LoadingState'

// Importación dinámica del contenido principal
const ClassesContent = dynamic(
  () => import('@/components/classes-registration/ClassesContent').then(mod => mod.ClassesContent),
  {
    ssr: false,
    loading: () => <LoadingState />
  }
)

interface ClassesPageProps {
  params: {
    empresaId: string
  }
}

export default function ClassesPage({ params }: ClassesPageProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  
  // Desenvuelve params de forma segura con tipado correcto
  const { empresaId } = use(params as any) as ClassesPageProps['params'];

  // Solo verificar sesión
  useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = `/clases/${empresaId}`
      const loginUrl = `/clases/login?returnUrl=${encodeURIComponent(currentPath)}`
      console.log('Redirigiendo a login:', loginUrl)
      router.push(loginUrl)
    }
  }, [user, isLoading, router, empresaId])

  // Bloqueo de scroll global a nivel de página
  useEffect(() => {
    // Deshabilitamos el scroll global para toda la página
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // Restauramos el scroll cuando se desmonte el componente
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Efecto para aplicar estilo al body que evite el scroll
  useEffect(() => {
    // Deshabilitar scroll en el body y html
    document.body.style.height = '100%';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    // Limpiar al desmontar el componente
    return () => {
      document.body.style.height = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  // Mostrar loading mientras se valida la autenticación
  if (isLoading) {
    return <LoadingState message="Preparando sesión..." />
  }

  // Si no hay usuario, no mostrar nada (la redirección se manejará en el useEffect)
  if (!user) {
    return null
  }

  return (
    <ClassRegistrationProvider empresaId={empresaId}>
      <Suspense fallback={<LoadingState />}>
        <ClassesContent empresaId={empresaId} />
      </Suspense>
    </ClassRegistrationProvider>
  )
} 