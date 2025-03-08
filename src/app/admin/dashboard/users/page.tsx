"use client"

import { MembersTable } from "@/components/usersSection/MembersTable"
import { useAuth } from "@/contexts/AuthContext"
import { useBranchContext } from "@/contexts/BranchContext"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/store/appStore"

export default function UsersPage() {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const { currentBranch, isLoading: isLoadingBranch } = useBranchContext()
  const router = useRouter()
  const { currentBranch: appStoreBranch } = useAppStore()

  // Estado de carga general
  const isLoading = isLoadingAuth || isLoadingBranch

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      <main className="absolute inset-0 lg:left-[240px]">
        <div className="absolute inset-[8px]">
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] w-full h-full overflow-auto scrollbar-none">
            <div className="px-6 py-4">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                    <p className="text-sm text-gray-500">Cargando...</p>
                  </div>
                </div>
              ) : !user ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-gray-500">No hay sesión activa</p>
                  </div>
                </div>
              ) : !currentBranch ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-gray-500">No hay una sede seleccionada</p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-auto scrollbar-none">
                  <MembersTable />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
