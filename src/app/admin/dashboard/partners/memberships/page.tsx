"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useBranchContext } from "@/contexts/BranchContext"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Suspense } from "react"

// Componente para el estado de carga
function LoadingState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <LoadingSpinner size="md" />
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    </div>
  )
}

// Componente para cuando no hay sesión activa
function NoSessionState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-500">No hay sesión activa</p>
      </div>
    </div>
  )
}

// Componente para cuando no hay sucursal seleccionada
function NoBranchState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-500">No hay una sede seleccionada</p>
      </div>
    </div>
  )
}

// Componente para mostrar que está en desarrollo
function UnderDevelopmentState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-blue-50 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-900">Funcionalidad en desarrollo</h3>
        <p className="text-gray-500 max-w-md text-center">
          La sección de gestión de membresías está actualmente en desarrollo.
          Pronto estará disponible con todas las funcionalidades para administrar socios y sus membresías.
        </p>
      </div>
    </div>
  )
}

// Componente principal de la página
export default function MembershipsPage() {
  const { isLoading: isLoadingAuth, user } = useAuth()
  const { isLoading: isLoadingBranch, currentBranch } = useBranchContext()
  
  const isLoading = isLoadingAuth || isLoadingBranch

  return (
    <div className="fixed inset-0 overflow-hidden">
      <main className="absolute inset-0 lg:left-[240px]">
        <div className="absolute inset-[8px]">
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] w-full h-full overflow-auto scrollbar-none">
            {isLoading ? (
              <LoadingState />
            ) : !user ? (
              <NoSessionState />
            ) : !currentBranch ? (
              <NoBranchState />
            ) : (
              <UnderDevelopmentState />
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 