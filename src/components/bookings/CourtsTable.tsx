"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { IconPlus } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NewCourtModal } from "./NewCourtModal"
import { courtService } from "@/services/courtService"
import { useBranches } from "@/hooks/useBranches"
import { toast } from "sonner"
import type { Court } from "@/types/court"
import { cn } from "@/lib/utils"
import { useCourts } from "@/hooks/useCourts"
import Image from "next/image"

const getCourtDescription = (court: Court) => {
  const descriptions: string[] = []

  // Añadimos el tipo de pista
  const typeMap = {
    indoor: 'Interior',
    outdoor: 'Exterior',
    covered: 'Cubierta'
  }
  descriptions.push(typeMap[court.court_type])

  // Añadimos el tipo de superficie
  const surfaceMap = {
    crystal: 'Cristal',
    synthetic: 'Sintética',
    clay: 'Tierra',
    grass: 'Césped',
    rubber: 'Goma',
    concrete: 'Cemento',
    panoramic: 'Cristal Premium'
  }
  descriptions.push(surfaceMap[court.surface as keyof typeof surfaceMap] || court.surface)

  return descriptions.join(' • ')
}

export function CourtsTable() {
  const { currentBranch } = useBranches()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isNewCourtModalOpen, setIsNewCourtModalOpen] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | undefined>()
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Query optimizada
  const courtsQuery = useCourts({ 
    branchId: currentBranch?.id,
    onlyActive: false // Todas las canchas
  })

  const handleNewCourt = async (courtData: Omit<Court, 'id'>) => {
    setIsLoading(true)
    try {
      if (editingCourt) {
        const { error } = await courtService.updateCourt(editingCourt.id, {
          ...courtData,
          branch_id: currentBranch.id
        })
        if (error) throw error
        toast.success('Pista actualizada exitosamente')
      } else {
        const { error } = await courtService.createCourt({
          ...courtData,
          branch_id: currentBranch.id
        })
        if (error) throw error
        toast.success('Pista creada exitosamente')
      }
      setIsNewCourtModalOpen(false)
      setEditingCourt(undefined)
      courtsQuery.refetch()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar la pista')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (courtId: string, newStatus: boolean) => {
    try {
      const { error } = await courtService.updateCourtStatus(courtId, newStatus)
      
      if (error) throw error

      // Invalidar todas las queries de canchas para esta sede
      await queryClient.invalidateQueries({
        queryKey: ['courts', currentBranch?.id]
      })

      toast.success(`Pista ${newStatus ? 'activada' : 'suspendida'} exitosamente`)
      setPopoverOpen(prev => ({ ...prev, [courtId]: false }))
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el estado de la pista')
    }
  }

  const handleDeleteCourt = async (courtId: string) => {
    if (!currentBranch?.id) {
      toast.error('No hay una sede seleccionada')
      return
    }

    try {
      const { error } = await courtService.deleteCourt(courtId)
      if (error) throw error

      toast.success('Pista eliminada exitosamente')
      queryClient.invalidateQueries({
        queryKey: ['courts', currentBranch.id]
      })
      setIsNewCourtModalOpen(false)
      setEditingCourt(undefined)
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la pista')
    }
  }

  const handleCourtClick = (court: Court) => {
    setEditingCourt(court)
    setIsNewCourtModalOpen(true)
  }

  // Renderizado condicional mejorado
  if (!currentBranch) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Selecciona una sede para ver sus pistas</p>
      </div>
    )
  }

  if (courtsQuery.isLoading) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Cargando pistas...</p>
      </div>
    )
  }

  if (courtsQuery.isError) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Error al cargar las pistas</p>
      </div>
    )
  }

  const courts = courtsQuery.data || []

  return (
    <div className="w-full space-y-8 bg-transparent px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h3 className="text-md font-medium text-gray-800">Lista de Pistas</h3>
          <p className="text-sm text-gray-600">Administra las pistas disponibles para tus clientes.</p>
        </div>

        {/* Buscador alineado a la derecha */}
        <input
          type="text"
          placeholder="Buscar pistas..."
          className="border border-gray-200 rounded-md p-2 ml-2 text-xs opacity-80 focus:outline-none focus:ring-0"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista de Pistas - Asegurarse de que esté dentro del flujo normal */}
      <div className="grid grid-cols-1">
        {courts.length === 0 ? (
          <div className="text-left">
            <p className="text-gray-500">No hay pistas registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courts.filter(court => court.name.toLowerCase().includes(searchTerm.toLowerCase())).map((court) => (
              <div
                key={court.id}
                onClick={() => handleCourtClick(court)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border bg-white",
                  "hover:bg-gray-50 transition-colors cursor-pointer",
                  "border-gray-200"
                )}
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-800">{court.name}</h4>
                  <p className="text-xs text-gray-600">
                    {getCourtDescription(court)}
                  </p>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <span className="text-sm text-gray-500 mr-2 font-light">
                    {court.is_active ? 'Activa' : 'Suspendida'}
                  </span>
                  <Popover 
                    open={popoverOpen[court.id]} 
                    onOpenChange={(open) => {
                      if (!open) setPopoverOpen(prev => ({ ...prev, [court.id]: false }))
                    }}
                  >
                    <PopoverTrigger asChild>
                      <div>
                        <Switch
                          checked={court.is_active}
                          onCheckedChange={() => {
                            setPopoverOpen(prev => ({ ...prev, [court.id]: true }))
                          }}
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="end">
                      <div className="text-sm">
                        <p>¿Desea {court.is_active ? 'suspender' : 'activar'} esta pista?</p>
                        <div className="flex justify-end gap-2 mt-2">
                          <button 
                            className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                            onClick={() => handleStatusChange(court.id, !court.is_active)}
                          >
                            Sí
                          </button>
                          <button 
                            className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                            onClick={() => setPopoverOpen(prev => ({ ...prev, [court.id]: false }))}
                          >
                            No
                          </button>
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

      <div className="text-center">
        <Button 
          onClick={() => setIsNewCourtModalOpen(true)}
          disabled={isLoading}
          className="text-sm text-gray-600 font-light"
        >
          Agregar Nueva Pista
        </Button>
      </div>

      {/* Modal */}
      <NewCourtModal
        isOpen={isNewCourtModalOpen}
        onClose={() => {
          setIsNewCourtModalOpen(false)
          setEditingCourt(undefined)
        }}
        onSave={handleNewCourt}
        onDelete={handleDeleteCourt}
        editingCourt={editingCourt}
        mode={editingCourt ? 'edit' : 'create'}
        isLoading={isLoading}
      />
    </div>
  )
} 