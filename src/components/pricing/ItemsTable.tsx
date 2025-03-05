"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { IconPlus, IconTrash, IconEdit, IconDots, IconFilter } from "@tabler/icons-react"
import { NewItemModal } from "./NewItemModal"
import { itemService } from "@/services/itemService"
import { toast } from "sonner"
import type { Item } from "@/types/items"
import { cn } from "@/lib/utils"
import { useBranchContext } from '@/contexts/BranchContext'
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-3"

export function ItemsTable() {
  // 1. Hooks y estado
  const { currentBranch } = useBranchContext()
  const queryClient = useQueryClient()
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
  })

  // 2. Query para obtener items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', currentBranch?.id],
    queryFn: () => {
      if (!currentBranch?.id) throw new Error('No hay una sede seleccionada')
      return itemService.getItemsByBranch(currentBranch.id)
    },
    enabled: !!currentBranch?.id,
    staleTime: 1000 * 60 * 5 // 5 minutos
  })

  // 3. Mutations
  const mutation = useMutation({
    mutationFn: async (itemData: Omit<Item, 'id'> & { id?: string }) => {
      if (!currentBranch?.id) throw new Error('No hay una sede seleccionada')
      
      if (itemData.id) {
        // Si hay ID, es una actualización
        return itemService.updateItem(itemData.id, itemData, currentBranch.id)
      } else {
        // Si no hay ID, es una creación
        return itemService.createItem(itemData, currentBranch.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', currentBranch?.id] })
      setIsNewItemModalOpen(false)
      setEditingItem(null)
      toast.success(
        editingItem ? 'Artículo actualizado correctamente' : 'Artículo creado correctamente'
      )
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al guardar el artículo')
    }
  })

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentBranch?.id) throw new Error('No hay una sede seleccionada')
      return itemService.deleteItem(id, currentBranch.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', currentBranch?.id] })
      toast.success('Artículo eliminado correctamente')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar el artículo')
    }
  })

  // 4. Handlers
  const handleNewItem = async (itemData: Omit<Item, 'id'>) => {
    try {
      await mutation.mutateAsync({
        ...itemData,
        id: editingItem?.id // Incluir el ID si estamos editando
      })
    } catch (error) {
      console.error('Error al guardar el artículo:', error)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error al eliminar el artículo:', error)
    }
  }

  // 5. Filtrado de items
  const getFilteredItems = () => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(filters.search.toLowerCase())
      const matchesType = filters.type === "all" || item.type === filters.type
      return matchesSearch && matchesType
    })
  }

  // 6. Renderizado condicional
  if (!currentBranch) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <p className="text-gray-500">Selecciona una sede para ver sus artículos</p>
        <Button 
          variant="outline"
          onClick={() => document.getElementById('branch-selector')?.click()}
        >
          Seleccionar Sede
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 7. Renderizado principal
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-medium">Lista de Artículos</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtros */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="p-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200 transition-colors"
              >
                <IconFilter className="h-4 w-4" stroke={1.5} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-sm">Buscar por nombre</h4>
                  <Input
                    placeholder="Escriba para buscar..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      search: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-sm">Tipo de artículo</h4>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      type: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="equipment">Equipamiento</SelectItem>
                      <SelectItem value="accessory">Accesorio</SelectItem>
                      <SelectItem value="consumable">Consumible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="ghost"
                    onClick={() => setFilters({ search: "", type: "all" })}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            onClick={() => setIsNewItemModalOpen(true)}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center gap-2 text-sm"
          >
            <IconPlus className="h-5 w-5" />
            <span>Nuevo Artículo</span>
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <table className="min-w-full table-fixed bg-white">
          <thead>
            <tr>
              <th className="w-1/3 px-6 py-3 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="w-1/4 px-6 py-3 border-b border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tipo
              </th>
              <th className="w-1/6 px-6 py-3 border-b border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Stock
              </th>
              <th className="w-1/6 px-6 py-3 border-b border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Depósito
              </th>
              <th className="w-[68px] px-4 py-3 border-b border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {getFilteredItems().map((item) => (
              <tr 
                key={item.id}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 border-b border-gray-200">
                  <span className="text-sm font-medium">{item.name}</span>
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-center">
                  <span className="text-sm text-gray-500">
                    {item.type === 'equipment' && 'Equipamiento'}
                    {item.type === 'accessory' && 'Accesorio'}
                    {item.type === 'consumable' && 'Consumible'}
                  </span>
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-center">
                  <span className="text-sm text-gray-500">{item.stock}</span>
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-center">
                  <span className="text-sm text-gray-500">
                    {item.requiresDeposit ? `${item.depositAmount}€` : 'No'}
                  </span>
                </td>
                <td className="px-4 py-4 border-b border-gray-200">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
                          <IconDots className="h-4 w-4 text-gray-500" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem onClick={() => {
                          setEditingItem(item)
                          setIsNewItemModalOpen(true)
                        }}>
                          <IconEdit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <IconTrash className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <NewItemModal
        isOpen={isNewItemModalOpen}
        onClose={() => {
          setIsNewItemModalOpen(false)
          setEditingItem(null)
        }}
        onSave={handleNewItem}
        onDelete={handleDeleteItem}
        editingItem={editingItem}
        mode={editingItem ? 'edit' : 'create'}
      />
    </div>
  )
} 