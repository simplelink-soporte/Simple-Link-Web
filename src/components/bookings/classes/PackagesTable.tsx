"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePackages } from "../hooks/usePackages"
import type { Database } from "@/types/supabase"
import { IconEye, IconEyeOff, IconPlus, IconPackage } from "@tabler/icons-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { NewPackageModal } from "../components/NewPackageModal/NewPackageModal"
import { EditPackageModal } from "../components/NewPackageModal/EditPackageModal"
import { createSupabaseClient } from '@/lib/supabase'
import Image from "next/image"

const supabase = createSupabaseClient()

type Package = Database['public']['Tables']['packages']['Row']
type PackageStatus = 'active' | 'inactive' | 'archived'

export function PackagesTable() {
  const [isNewPackageModalOpen, setIsNewPackageModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({})
  
  const { 
    data: packages = [], 
    isLoading, 
    error,
    refetch: refetchPackages 
  } = usePackages({
    enabled: true
  })

  const updatePackageStatus = async (packageId: string, newStatus: PackageStatus) => {
    try {
      const { error } = await supabase
        .from('packages')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', packageId)

      if (error) throw error

      toast.success(
        newStatus === 'active' 
          ? 'Paquete visible para los usuarios'
          : 'Paquete oculto para los usuarios'
      )

      await refetchPackages()
    } catch (error: any) {
      console.error('Error al actualizar el estado del paquete:', error)
      toast.error('Error al actualizar el paquete')
      throw error
    }
  }

  const handlePackageClick = (packageItem: Package) => {
    setEditingPackage(packageItem)
  }

  // Renderizado condicional para estados de carga y error
  if (isLoading) {
    return (
      <div className="w-full p-6 bg-transparent rounded-xl">
        <div className="text-center py-10">
          <p className="text-gray-500">Cargando paquetes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-transparent rounded-xl">
        <div className="text-center py-10">
          <p className="text-red-500">Error al cargar los paquetes: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header de Paquetes - Actualizado */}
      <div className="space-y-5 bg-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h3 className="text-sm font-medium text-gray-900">Lista de Paquetes</h3>
            <p className="text-xs text-gray-500">Administra los paquetes de sesiones para tus clientes y crea planes de suscripción a clases para una mejor experiencia.</p>
          </div>
          <Button 
            onClick={() => setIsNewPackageModalOpen(true)}
            variant="outline"
            size="sm"
            className="px-3 py-1.5 h-8 bg-white border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            <IconPlus className="h-3.5 w-3.5 mr-1.5" />
            Crear Paquete
          </Button>
        </div>

        {/* Lista de Paquetes */}
        <div className="space-y-2 mt-4">
          {packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-gray-50/25 rounded-lg border border-dashed border-gray-100/75">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <Image 
                  src="/images/Miroodles - Sticker 5.png"
                  width={32}
                  height={32}
                  alt="No hay paquetes"
                  className="object-contain"
                />
              </div>
              <p className="text-sm text-gray-500">No hay paquetes registrados</p>
              <Button 
                onClick={() => setIsNewPackageModalOpen(true)}
                variant="outline"
                size="sm"
                className="mt-3 px-3 py-1.5 h-8 text-xs bg-white border-gray-200"
              >
                <IconPackage className="h-3.5 w-3.5 mr-1.5" />
                Crear tu primer paquete
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {packages.map((packageItem) => (
                <div
                  key={packageItem.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-md",
                    "bg-white hover:bg-gray-50/80",
                    "border border-gray-50 hover:border-gray-100",
                    "transition-all duration-200",
                    "relative overflow-hidden",
                    packageItem.status === 'inactive' && "opacity-85"
                  )}
                  onClick={() => handlePackageClick(packageItem)}
                >
                  {/* Indicador visual de estado (barra lateral) */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-[4px]",
                    packageItem.status === 'active' 
                      ? "bg-blue-500/60"
                      : "bg-gray-300/60"
                  )} />
                  
                  <div className="space-y-1 pl-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {packageItem.name}
                      </h4>
                      {packageItem.tag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {packageItem.tag}
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        packageItem.status === 'active'
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-gray-50 text-gray-600 border border-gray-100"
                      )}>
                        {packageItem.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {packageItem.class_count} {packageItem.class_count === 1 ? 'sesión' : 'sesiones'} • 
                      Expira en {packageItem.expiration_days} días • 
                      ${packageItem.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                    <Popover 
                      open={popoverOpen[packageItem.id]} 
                      onOpenChange={(open) => {
                        setPopoverOpen(prev => ({ ...prev, [packageItem.id]: open }))
                      }}
                    >
                      <PopoverTrigger asChild>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "p-1.5 rounded-md transition-colors",
                                  packageItem.status === 'active'
                                    ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                )}
                              >
                                {packageItem.status === 'active' ? (
                                  <IconEye className="w-4 h-4" />
                                ) : (
                                  <IconEyeOff className="w-4 h-4" />
                                )}
                                <span className="sr-only">
                                  {packageItem.status === 'active' ? 'Ocultar paquete' : 'Mostrar paquete'}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p className="text-xs">
                                {packageItem.status === 'active' ? 'Ocultar paquete' : 'Mostrar paquete'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </PopoverTrigger>
                      
                      <PopoverContent className="w-auto p-3" align="end">
                        <div className="text-sm">
                          <p>¿Desea {packageItem.status === 'active' ? 'ocultar' : 'mostrar'} este paquete?</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {packageItem.status === 'active' 
                              ? 'El paquete no será visible para nuevos usuarios.' 
                              : 'El paquete volverá a estar visible para los usuarios.'
                            }
                          </p>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await updatePackageStatus(
                                    packageItem.id, 
                                    packageItem.status === 'active' ? 'inactive' : 'active'
                                  )
                                  setPopoverOpen(prev => ({ ...prev, [packageItem.id]: false }))
                                } catch (error: any) {
                                  // El error ya es manejado por updatePackageStatus
                                }
                              }}
                            >
                              Confirmar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPopoverOpen(prev => ({ ...prev, [packageItem.id]: false }))}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <NewPackageModal
        isOpen={isNewPackageModalOpen}
        onClose={() => {
          setIsNewPackageModalOpen(false)
          refetchPackages()
        }}
      />

      {editingPackage && (
        <EditPackageModal
          isOpen={!!editingPackage}
          onClose={() => setEditingPackage(null)}
          packageData={editingPackage}
          onSuccess={() => {
            setEditingPackage(null)
            refetchPackages()
          }}
        />
      )}
    </div>
  )
}
