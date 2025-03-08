"use client"

import { ItemsTable } from "@/components/pricing/ItemsTable"
import { useAuth } from "@/contexts/AuthContext"
import { useBranchContext } from "@/contexts/BranchContext"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Suspense, useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

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

// Componente principal de la página
export default function ArticlesPage() {
  const { isLoading: isLoadingAuth, user } = useAuth()
  const { isLoading: isLoadingBranch, currentBranch } = useBranchContext()
  const queryClient = useQueryClient()
  
  // Usamos useEffect para garantizar que se actualice la UI cuando el contexto de sede esté listo
  const [isReady, setIsReady] = useState(false)
  
  useEffect(() => {
    if (!isLoadingBranch && currentBranch) {
      // Invalidamos la consulta de items para forzar una recarga fresca al montar
      queryClient.invalidateQueries({ queryKey: ['items', currentBranch.id] })
      setIsReady(true)
    }
  }, [isLoadingBranch, currentBranch, queryClient])
  
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
              <div className="p-6">
                <Suspense fallback={<LoadingState />}>
                  {/* 
                    Usando isReady para asegurar que el componente solo se monte 
                    cuando el contexto de sede esté completamente inicializado
                  */}
                  {isReady && (
                    <ItemsTable key={`items-${currentBranch.id}-${Date.now()}`} />
                  )}
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 