"use client"

import { ClassesTable } from "@/components/bookings/classes/ClassesTable"
import { PackagesTable } from "@/components/bookings/classes/PackagesTable"
import { ViewSelector } from "@/components/bookings/classes/components/ViewSelector"
import { useAuth } from "@/contexts/AuthContext"
import { useBranchContext } from "@/contexts/BranchContext"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Suspense, useState, useEffect } from "react"
import { BetaFeaturesNotification } from "@/components/ui/beta-features-toast"
import { useLocalStorage } from "@/hooks/useLocalStorage"

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

function NoSessionState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-500">No hay sesión activa</p>
      </div>
    </div>
  )
}

function NoBranchState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-500">No hay una sede seleccionada</p>
      </div>
    </div>
  )
}

export default function ClassesPage() {
  const { isLoading: isLoadingAuth, user } = useAuth()
  const { isLoading: isLoadingBranch, currentBranch } = useBranchContext()
  const [currentView, setCurrentView] = useState<'classes' | 'packages'>('classes')
  
  // Estado para controlar la visualización del toast beta
  const [hasDismissedBetaNotice, setHasDismissedBetaNotice] = useLocalStorage<boolean>('dismissed-classes-beta-notice', false)
  const [showBetaNotice, setShowBetaNotice] = useState(!hasDismissedBetaNotice)
  
  const isLoading = isLoadingAuth || isLoadingBranch

  // Manejar el cierre del toast y guardar la preferencia
  const handleCloseBetaNotice = () => {
    setShowBetaNotice(false)
    setHasDismissedBetaNotice(true)
  }

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
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
                <div className="flex items-start mb-6">
                  <div className="w-48">
                    <ViewSelector 
                      value={currentView} 
                      onValueChange={setCurrentView} 
                    />
                  </div>
                </div>
                <Suspense fallback={<LoadingState />}>
                  {currentView === 'classes' ? (
                    <ClassesTable key={`classes-${currentBranch.id}`} />
                  ) : (
                    <PackagesTable key={`packages-${currentBranch.id}`} />
                  )}
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Notificación de característica Beta */}
      <BetaFeaturesNotification
        show={showBetaNotice}
        featureName="Clases"
        onClose={handleCloseBetaNotice}
      />
    </div>
  )
} 