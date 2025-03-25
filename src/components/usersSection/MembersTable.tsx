"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { IconUser, IconTrash, IconEdit, IconFilter, IconPlus, IconChevronDown, IconDots, IconChevronLeft, IconChevronRight, IconInfoCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useUsers, UserWithPackage } from "./hooks/useUsers"
import { toast } from "sonner"
import { NewMemberForm } from "./modals/NewMemberForm"
import { MemberDetailsModal } from "./modals/MemberDetailsModal"
import type { Usuario } from "./types"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

interface ColumnConfig {
  id: keyof typeof DEFAULT_COLUMN_VISIBILITY
  title: string
  isVisible: boolean
}

const DEFAULT_COLUMN_VISIBILITY = {
  name: true,
  email: true,
  date: true,
  phone: true,
  city: true,
  package: true
} as const

// Función para formatear la fecha
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: es })
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return 'Fecha no válida'
  }
}

export function MembersTable() {
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Usuario | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  
  // Estado para la visibilidad de columnas
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_COLUMN_VISIBILITY)

  // Estados para filtros y paginación
  const [filters, setFilters] = useState({
    search: "",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const { users, isLoading, error } = useUsers()

  // Función para filtrar usuarios
  const getFilteredUsers = () => {
    let filtered = [...users]
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(user => 
        user.nombre.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.telefono?.toLowerCase() || '').includes(searchLower) ||
        (user.ciudad?.toLowerCase() || '').includes(searchLower)
      )
    }

    return filtered
  }

  // Función para obtener usuarios de la página actual
  const getCurrentPageUsers = () => {
    const filteredUsers = getFilteredUsers()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredUsers.slice(startIndex, endIndex)
  }

  // Calcular número total de páginas
  const totalPages = Math.ceil(getFilteredUsers().length / itemsPerPage)

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Configuración de columnas disponibles
  const availableColumns: ColumnConfig[] = [
    { id: 'name', title: 'Nombre', isVisible: columnVisibility.name },
    { id: 'email', title: 'Email', isVisible: columnVisibility.email },
    { id: 'phone', title: 'Teléfono', isVisible: columnVisibility.phone },
    { id: 'city', title: 'Ciudad', isVisible: columnVisibility.city },
    { id: 'date', title: 'Fecha de Registro', isVisible: columnVisibility.date },
    { id: 'package', title: 'Paquete', isVisible: columnVisibility.package }
  ]

  // Función para manejar el clic en una fila
  const handleRowClick = (user: Usuario) => {
    setSelectedMember(user)
    setIsDetailsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <h3 className="text-md font-medium text-gray-800">Lista de Miembros</h3>
            <p className="text-sm text-gray-600">
              Administra los usuarios registrados en tu plataforma.
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircle className="inline-block ml-1 cursor-help" size={16} stroke={1.5} />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px]">
                    <p>Los usuarios son agregados automáticamente a esta lista cuando acceden por primera vez al enlace de reservas de su club.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando usuarios...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <h3 className="text-md font-medium text-gray-800">Lista de Miembros</h3>
            <p className="text-sm text-gray-600">
              Administra los usuarios registrados en tu plataforma.
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircle className="inline-block ml-1 cursor-help" size={16} stroke={1.5} />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px]">
                    <p>Los usuarios son agregados automáticamente a esta lista cuando acceden por primera vez al enlace de reservas de su club.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error.message}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <h3 className="text-md font-medium text-gray-800">Lista de Miembros</h3>
          <p className="text-sm text-gray-600">
            Administra los usuarios registrados en tu plataforma.
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle className="inline-block ml-1 cursor-help" size={16} stroke={1.5} />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">
                  <p>Los usuarios son agregados automáticamente a esta lista cuando acceden por primera vez al enlace de reservas de su club.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón de Filtros con Popover */}
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
              <div className="space-y-4 p-2">
                {/* Búsqueda */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Buscar miembro
                  </label>
                  <Input
                    placeholder="Nombre, email, teléfono o ciudad..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      search: e.target.value
                    }))}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg",
                      "border border-gray-200 bg-white",
                      "focus:outline-none focus:border-gray-300",
                      "transition-colors duration-200",
                      "placeholder:text-gray-400",
                      "text-sm",
                      "focus-visible:ring-0 focus-visible:ring-offset-0",
                      "focus:ring-0 focus:ring-offset-0",
                      "focus-visible:border-gray-300",
                      "focus:border-gray-300",
                      "ring-0"
                    )}
                  />
                </div>

                {/* Botón para limpiar filtros */}
                <div className="flex justify-end pt-2 border-t">
                  <button
                    onClick={() => setFilters({
                      search: ""
                    })}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Botón de Columnas con texto */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-4 py-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200 flex items-center gap-2">
                <span className="text-sm text-gray-600">Columnas</span>
                <IconChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              {availableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={columnVisibility[column.id]}
                  onCheckedChange={(value) => {
                    setColumnVisibility(prev => ({
                      ...prev,
                      [column.id]: value
                    }))
                  }}
                >
                  {column.title}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        {getCurrentPageUsers().length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-gray-50/25 rounded-lg border border-dashed border-gray-100/75">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <img 
                src="/images/Miroodles - No credits.png" 
                alt="No hay usuarios" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <p className="text-sm text-gray-500">No hay usuarios disponibles</p>
            <p className="text-xs text-gray-400 max-w-md text-center mt-1 px-4">
              Comparte el link de reservas o clases con tus clientes para que puedan registrarse y aparezcan en esta lista.
            </p>
          </div>
        ) : (
          <table className="min-w-full table-fixed bg-white">
            <thead>
              <tr>
                {columnVisibility.name && (
                  <th className="w-[25%] px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nombre
                  </th>
                )}
                {columnVisibility.email && (
                  <th className="w-[25%] px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                )}
                {columnVisibility.phone && (
                  <th className="w-[15%] px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Teléfono
                  </th>
                )}
                {columnVisibility.city && (
                  <th className="w-[15%] px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ciudad
                  </th>
                )}
                {columnVisibility.date && (
                  <th className="w-[15%] px-6 py-3 border-b border-gray-200 bg-white text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha de Registro
                  </th>
                )}
                {columnVisibility.package && (
                  <th className="w-[10%] px-6 py-3 border-b border-gray-200 bg-white text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Paquete
                  </th>
                )}
                <th className="w-[5%] px-4 py-3 border-b border-gray-200 bg-white"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : getCurrentPageUsers().length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                getCurrentPageUsers().map((user: UserWithPackage) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(user)}
                  >
                    {columnVisibility.name && (
                      <td className="px-6 py-4 border-b border-gray-200 text-sm h-16">
                        <div className="flex items-center h-full">
                          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                            <IconUser className="h-5 w-5 text-gray-500" />
                          </div>
                          <span className="truncate text-sm">
                            {user.nombre}
                          </span>
                        </div>
                      </td>
                    )}
                    {columnVisibility.email && (
                      <td className="px-6 py-4 border-b border-gray-200 text-sm text-gray-500 h-16 align-middle">
                        <span className="truncate block text-sm">{user.email}</span>
                      </td>
                    )}
                    {columnVisibility.phone && (
                      <td className="px-6 py-4 border-b border-gray-200 text-sm text-gray-500 h-16 align-middle">
                        <span className="truncate block text-sm">{user.telefono || '-'}</span>
                      </td>
                    )}
                    {columnVisibility.city && (
                      <td className="px-6 py-4 border-b border-gray-200 text-sm text-gray-500 h-16 align-middle">
                        <span className="truncate block text-sm">{user.ciudad || '-'}</span>
                      </td>
                    )}
                    {columnVisibility.date && (
                      <td className="px-6 py-4 border-b border-gray-200 text-sm text-gray-500 h-16 align-middle text-center">
                        <span className="truncate block">
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                    )}
                    {columnVisibility.package && (
                      <td className="px-6 py-4 border-b border-gray-200 text-sm h-16 align-middle text-center">
                        <span className="text-sm text-gray-500">
                          {user.hasActivePackage ? 'Sí' : 'No'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-4 border-b border-gray-200 text-sm h-16">
                      <div className="flex space-x-2 items-center justify-center h-full">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="focus:outline-none">
                            <div className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                              <IconDots className="h-4 w-4 text-gray-500" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem className="text-sm cursor-pointer">
                              <IconEdit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-gray-500">
          {getFilteredUsers().length === 0 ? (
            "No se encontraron usuarios"
          ) : (
            `${((currentPage - 1) * itemsPerPage) + 1} - ${Math.min(currentPage * itemsPerPage, getFilteredUsers().length)} de ${getFilteredUsers().length} usuarios`
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Página {currentPage} de {totalPages}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <NewMemberForm 
        isOpen={isNewMemberOpen}
        onClose={() => setIsNewMemberOpen(false)}
      />

      <MemberDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        member={selectedMember}
      />
    </div>
  )
}
