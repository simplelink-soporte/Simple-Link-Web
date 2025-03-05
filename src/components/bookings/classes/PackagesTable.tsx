"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePackages } from "../hooks/usePackages"
import type { Database } from "@/types/supabase"
import { IconEye, IconEyeOff } from "@tabler/icons-react"
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
      <div className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-center py-10">
          <p className="text-gray-500">Cargando paquetes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-center py-10">
          <p className="text-red-500">Error al cargar los paquetes: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8">
      {/* Header de Paquetes - Actualizado */}
      <div className="space-y-6 bg-transparent p-4 rounded-lg shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-md font-medium text-gray-800">Lista de Paquetes</h3>
              </div>
              <Button 
                onClick={() => setIsNewPackageModalOpen(true)}
                variant="outline"
                className="px-4 py-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200"
              >
                Crear Paquete
              </Button>
            </div>
            <p className="text-xs text-gray-600">Administra los paquetes de sesiones para tus clientes y crea planes de suscripción a clases para una mejor experiencia.</p>
          </div>
        </div>

        {/* Lista de Paquetes */}
        <div className="space-y-3">
          {packages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No hay paquetes registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((packageItem) => (
                <div
                  key={packageItem.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg",
                    "bg-white hover:bg-gray-50",
                    "border border-gray-200 hover:border-gray-300",
                    "transition-all duration-200",
                    "cursor-pointer",
                    packageItem.status === 'inactive' && "opacity-60"
                  )}
                  onClick={() => handlePackageClick(packageItem)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-md font-medium text-gray-800">
                        {packageItem.name}
                      </h4>
                      {packageItem.tag && (
                        <span className="text-xs text-blue-800">
                          {packageItem.tag}
                        </span>
                      )}
                      {packageItem.status === 'inactive' && (
                        <span className="text-xs text-gray-500">(Oculto)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
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
