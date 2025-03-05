"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Branch, BranchFormData } from "@/types/branch"
import { branchService } from "@/services/branchService"
import useOrganization from "@/hooks/useOrganization"
import { NewBranchModal } from "./NewBranchModal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { IconPlus, IconTrash, IconEdit, IconMapPin, IconPhone, IconUser, IconLoader, IconRefresh } from "@tabler/icons-react"
import { toast } from "@/components/ui/use-toast"
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { EditBranchModal } from "./EditBranchModal"

export function BranchSettings() {
  const { organization } = useOrganization()
  const [isNewBranchModalOpen, setIsNewBranchModalOpen] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null)
  const queryClient = useQueryClient()

  // Usar React Query para manejar el estado y caché de las sedes
  const { 
    data: branches = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['branches', organization?.id],
    queryFn: async () => {
      if (!organization?.id) throw new Error('No hay organización seleccionada')
      const res = await branchService.getBranches(organization.id)
      return res.data || []
    },
    enabled: !!organization?.id
  })

  // Mutación para crear sedes
  const createBranchMutation = useMutation({
    mutationFn: (formData: BranchFormData) => 
      branchService.createBranch(formData, organization?.id!),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.setQueryData(['branches', organization?.id], 
          (old: Branch[] = []) => [response.data!, ...old]
        )
        setIsNewBranchModalOpen(false)
        toast({
          title: "Éxito",
          description: "La sede se ha creado correctamente",
        })
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear sede",
        description: error.message || "No se pudo crear la sede",
        variant: "destructive",
      })
    }
  })

  // Mutación para eliminar sedes
  const deleteBranchMutation = useMutation({
    mutationFn: (branchId: string) => 
      branchService.deleteBranch(branchId),
    onMutate: async (branchId) => {
      await queryClient.cancelQueries(['branches', organization?.id])
      const previousBranches = queryClient.getQueryData(['branches', organization?.id])
      queryClient.setQueryData(['branches', organization?.id], 
        (old: Branch[] = []) => old.filter(b => b.id !== branchId)
      )
      return { previousBranches }
    },
    onSuccess: () => {
      toast({
        title: "Sede eliminada",
        description: "La sede se ha eliminado correctamente",
      })
      setBranchToDelete(null)
    },
    onError: (error: any, _, context) => {
      queryClient.setQueryData(['branches', organization?.id], context?.previousBranches)
      toast({
        title: "Error al eliminar sede",
        description: error.message || "No se pudo eliminar la sede",
        variant: "destructive",
      })
    }
  })

  // Mutación para actualizar sedes
  const updateBranchMutation = useMutation({
    mutationFn: async ({ branchId, formData }: { branchId: string, formData: BranchFormData }) => {
      if (!organization?.id) throw new Error('No hay organización seleccionada')
      console.log('🔄 Iniciando mutación de actualización:', { branchId, formData })
      
      // Validar datos antes de enviar
      if (!formData.name || !formData.address || !formData.phone) {
        throw new Error('Faltan campos requeridos')
      }

      const result = await branchService.updateBranch(branchId, formData, organization.id)
      console.log('📥 Respuesta del servidor:', result)

      if (result.error) {
        console.error('❌ Error del servidor:', result.error)
        throw new Error(result.error.message || 'Error al actualizar la sede')
      }

      if (!result.data) {
        throw new Error('No se recibieron datos de la actualización')
      }

      return result.data
    },
    onMutate: async ({ branchId, formData }) => {
      await queryClient.cancelQueries({ queryKey: ['branches', organization?.id] })
      const previousBranches = queryClient.getQueryData(['branches', organization?.id])
      
      // Actualización optimista
      queryClient.setQueryData(['branches', organization?.id], (old: Branch[] = []) => 
        old.map(b => b.id === branchId ? { ...b, ...formData } : b)
      )
      
      return { previousBranches }
    },
    onSuccess: (data) => {
      console.log('✅ Sede actualizada exitosamente:', data)
      queryClient.invalidateQueries({ queryKey: ['branches', organization?.id] })
      setBranchToEdit(null)
      toast({
        title: "Éxito",
        description: "La sede se ha actualizado correctamente",
      })
    },
    onError: (error: any, _, context) => {
      console.error('❌ Error al actualizar sede:', error)
      // Revertir a los datos anteriores
      if (context?.previousBranches) {
        queryClient.setQueryData(['branches', organization?.id], context.previousBranches)
      }
      toast({
        title: "Error al actualizar sede",
        description: error.message || "No se pudo actualizar la sede",
        variant: "destructive",
      })
    }
  })

  const handleUpdateBranch = async (branchId: string, formData: BranchFormData) => {
    try {
      console.log('📝 Iniciando actualización de sede:', { branchId, formData })
      await updateBranchMutation.mutateAsync({ branchId, formData })
    } catch (error) {
      console.error('❌ Error en handleUpdateBranch:', error)
    }
  }

  // Memoizar el renderizado de las tarjetas para evitar re-renders innecesarios
  const renderBranchCards = useMemo(() => {
    if (branches.length === 0 && !isLoading) {
      return (
        <div className="col-span-2 text-center py-8 text-gray-500">
          No hay sedes registradas
        </div>
      )
    }

    return branches.map((branch) => (
      <div
        key={branch.id}
        className="group relative p-6 border border-gray-200 rounded-lg bg-white hover:border-black transition-all duration-200"
      >
        {/* Encabezado de la tarjeta */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-medium">{branch.name}</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                branch.is_active 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}>
                {branch.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-900"
              onClick={() => setBranchToEdit(branch)}
            >
              <IconEdit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-red-600"
              onClick={() => setBranchToDelete(branch)}
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Información de la sucursal */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <IconMapPin className="h-4 w-4 flex-shrink-0" />
            <span>{branch.address || 'Sin dirección'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <IconPhone className="h-4 w-4 flex-shrink-0" />
            <span>{branch.phone || 'Sin teléfono'}</span>
          </div>
          {branch.manager_id && (
            <div className="flex items-center gap-2 text-gray-600">
              <IconUser className="h-4 w-4 flex-shrink-0" />
              <span>{branch.manager_id}</span>
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Estado</span>
            <span className="text-sm font-medium">
              {branch.is_active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>
      </div>
    ))
  }, [branches, isLoading])

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado con botones */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-medium">Lista de Sedes</h3>
          {isLoading && <IconLoader className="h-4 w-4 animate-spin" />}
          {!isLoading && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8 text-gray-500 hover:text-gray-900"
            >
              <IconRefresh className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button 
          onClick={() => setIsNewBranchModalOpen(true)}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center gap-2 text-sm shadow-sm transition-all duration-200"
        >
          <IconPlus className="h-5 w-5" />
          <span>Nueva Sede</span>
        </Button>
      </div>

      {/* Lista de sucursales */}
      <div className="grid gap-4 md:grid-cols-2">
        {renderBranchCards}
      </div>

      {/* Modales */}
      <NewBranchModal 
        isOpen={isNewBranchModalOpen}
        onClose={() => setIsNewBranchModalOpen(false)}
        onSave={(formData) => createBranchMutation.mutate(formData)}
      />

      <ConfirmDialog
        isOpen={!!branchToDelete}
        onClose={() => setBranchToDelete(null)}
        onConfirm={() => branchToDelete && deleteBranchMutation.mutate(branchToDelete.id)}
        title="Eliminar sede"
        description={`¿Estás seguro de que deseas eliminar la sede "${branchToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <EditBranchModal 
        branch={branchToEdit}
        isOpen={!!branchToEdit}
        onClose={() => setBranchToEdit(null)}
        onSave={handleUpdateBranch}
      />
    </div>
  )
} 