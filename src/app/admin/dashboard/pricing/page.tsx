"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SubscriptionsTable } from "@/components/pricing/SubscriptionsTable"
import { PackagesTable } from "@/components/pricing/PackagesTable"
import { CouponsTable } from "@/components/pricing/CouponsTable"
import { ItemsTable } from "@/components/pricing/ItemsTable"
import { useAuth } from "@/contexts/AuthContext"
import { useBranchContext } from "@/contexts/BranchContext"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function PricingPage() {
  const { isLoading: isLoadingAuth } = useAuth()
  const { isLoading: isLoadingBranch } = useBranchContext()
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
              ) : (
                <Tabs defaultValue="items" className="flex flex-col h-full">
                  <div className="flex-none mb-4">
                    <TabsList>
                      <TabsTrigger 
                        value="items"
                        className="data-[state=inactive]:text-gray-500"
                      >
                        Artículos
                      </TabsTrigger>
                      <TabsTrigger 
                        value="coupons"
                        className="data-[state=inactive]:text-gray-500"
                      >
                        Cupones
                      </TabsTrigger>
                      
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger className="opacity-60">
                            <TabsTrigger 
                              value="subscriptions"
                              className="data-[state=inactive]:text-gray-500 pointer-events-none"
                              disabled
                            >
                              Membresías
                            </TabsTrigger>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="bg-black text-white text-xs px-2 py-1 rounded"
                            sideOffset={5}
                          >
                            Próximamente
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger className="opacity-60">
                            <TabsTrigger 
                              value="packages"
                              className="data-[state=inactive]:text-gray-500 pointer-events-none"
                              disabled
                            >
                              Paquetes
                            </TabsTrigger>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="bg-black text-white text-xs px-2 py-1 rounded"
                            sideOffset={5}
                          >
                            Próximamente
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TabsList>
                  </div>

                  <TabsContent value="items" className="flex-1">
                    <div className="h-full overflow-auto scrollbar-none">
                      <ItemsTable />
                    </div>
                  </TabsContent>

                  <TabsContent value="coupons" className="flex-1">
                    <div className="h-full overflow-auto scrollbar-none">
                      <CouponsTable />
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
