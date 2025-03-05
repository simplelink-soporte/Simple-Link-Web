"use client"

import { useEffect, Suspense } from 'react'
import { CompanySettings } from "@/components/settings/CompanySettings"
import { BranchSettings } from "@/components/settings/BranchSettings"
import { BillingSettings } from "@/components/settings/BillingSettings"
import { MembersSettings } from "@/components/settings/MembersSettings"
import { UserSettings } from "@/components/settings/UserSettings"
import { useAuth } from "@/contexts/AuthContext"
import { useBranchContext } from '@/contexts/BranchContext'
import { useSearchParams } from 'next/navigation'

const SETTINGS_COMPONENTS = {
  company: CompanySettings,
  branches: BranchSettings,
  integrations: BillingSettings,
  members: MembersSettings,
  user: UserSettings
} as const

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SettingsPageContent />
    </Suspense>
  )
}

function SettingsPageContent() {
  const { isLoading: isLoadingAuth } = useAuth()
  const { isLoading: isLoadingBranch } = useBranchContext()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'company'
  
  const isLoading = isLoadingAuth || isLoadingBranch

  // Obtener el componente activo
  const ActiveComponent = SETTINGS_COMPONENTS[activeTab as keyof typeof SETTINGS_COMPONENTS] || CompanySettings

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      <main className="absolute inset-0 lg:left-[240px]">
        <div className="absolute inset-[8px]">
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] w-full h-full overflow-auto scrollbar-none">
            <div className="p-6">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                    <p className="text-sm text-gray-500">Cargando...</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-[1200px]">
                  <ActiveComponent />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 