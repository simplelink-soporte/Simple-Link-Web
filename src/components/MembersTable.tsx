import * as React from "react"
import { useState, useEffect } from "react"
import { IconUser, IconTrash, IconEdit, IconFilter, IconPlus, IconChevronDown, IconDots, IconChevronLeft, IconChevronRight, IconLayoutList } from "@tabler/icons-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NewMemberForm } from "@/components/NewMemberForm"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { MemberDetailsModal } from "@/components/MemberDetailsModal"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useBranchContext } from "@/contexts/BranchContext"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { memberService } from "@/services/supabase"
import { toast } from "sonner"

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  gender?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
  reservation_stats?: {
    future_reservations: number
    past_reservations: number
    cancelled_reservations: number
  }
}

// Función auxiliar para generar estadísticas aleatorias de reservas
function generateRandomStats() {
  return {
    future: Math.floor(Math.random() * 5),
    past: Math.floor(Math.random() * 30) + 5,
    cancelled: Math.floor(Math.random() * 4)
  }
}

// Datos fijos para pruebas con estadísticas incluidas
const additionalMembers: Member[] = [
  { 
    name: "Pedro González", 
    email: "pedro.gonzalez@email.com", 
    status: "Sin Plan", 
    date: "15 Jun 2023", 
    gender: "Masculino", 
    reservations: 8,
    reservationStats: {
      future: 2,
      past: 15,
      cancelled: 1
    }
  },
  { 
    name: "Sofía Pérez", 
    email: "sofia.perez@email.com", 
    status: "Plan Pro", 
    date: "22 Jul 2023", 
    gender: "Femenino", 
    reservations: 15,
    reservationStats: {
      future: 4,
      past: 28,
      cancelled: 3
    }
  },
  { 
    name: "Diego Sánchez", 
    email: "diego.sanchez@email.com", 
    status: "Plan Scale", 
    date: "30 Aug 2023", 
    gender: "Masculino", 
    reservations: 10,
    reservationStats: {
      future: 6,
      past: 28,
      cancelled: 2
    }
  },
  { 
    name: "Elena Torres", 
    email: "elena.torres@email.com", 
    status: "Sin Plan", 
    date: "05 Sep 2023", 
    gender: "Femenino", 
    reservations: 7,
    reservationStats: {
      future: 0,
      past: 7,
      cancelled: 0
    }
  },
  { 
    name: "Luis Ramírez", 
    email: "luis.ramirez@email.com", 
    status: "Plan Pro", 
    date: "12 Oct 2023", 
    gender: "Masculino", 
    reservations: 12,
    reservationStats: {
      future: 3,
      past: 20,
      cancelled: 4
    }
  },
  { 
    name: "Carmen Ruiz", 
    email: "carmen.ruiz@email.com", 
    status: "Sin Plan", 
    date: "18 Nov 2023", 
    gender: "Femenino", 
    reservations: 9,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Pablo Morales", 
    email: "pablo.morales@email.com", 
    status: "Plan Base", 
    date: "25 Dec 2023", 
    gender: "Masculino", 
    reservations: 6,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Isabel Castro", 
    email: "isabel.castro@email.com", 
    status: "Plan Pro", 
    date: "03 Jan 2024", 
    gender: "Femenino", 
    reservations: 14,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Miguel Flores", 
    email: "miguel.flores@email.com", 
    status: "Sin Plan", 
    date: "10 Feb 2024", 
    gender: "Masculino", 
    reservations: 8,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Ana Vargas", 
    email: "ana.vargas@email.com", 
    status: "Plan Base", 
    date: "15 Mar 2024", 
    gender: "Femenino", 
    reservations: 5,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Roberto Silva", 
    email: "roberto.silva@email.com", 
    status: "Plan Pro", 
    date: "22 Apr 2024", 
    gender: "Masculino", 
    reservations: 11,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Patricia Ortiz", 
    email: "patricia.ortiz@email.com", 
    status: "Sin Plan", 
    date: "01 May 2024", 
    gender: "Femenino", 
    reservations: 7,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Fernando Ríos", 
    email: "fernando.rios@email.com", 
    status: "Plan Base", 
    date: "08 Jun 2024", 
    gender: "Masculino", 
    reservations: 9,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Lucía Mendoza", 
    email: "lucia.mendoza@email.com", 
    status: "Sin Plan", 
    date: "15 Jul 2024", 
    gender: "Femenino", 
    reservations: 6,
    reservationStats: generateRandomStats()
  },
  { 
    name: "Ricardo Herrera", 
    email: "ricardo.herrera@email.com", 
    status: "Plan Scale", 
    date: "20 Aug 2024", 
    gender: "Masculino", 
    reservations: 10,
    reservationStats: generateRandomStats()
  }
].map(member => ({
  ...member,
  reservationStats: member.reservationStats || generateRandomStats()
}))

const initialMembers: Member[] = [
  { 
    name: "Ana García", 
    email: "ana.garcia@email.com", 
    status: "Plan Base", 
    date: "15 Jan 2023",
    gender: "Femenino",
    membershipDetails: {
      startDate: "15 Jan 2023",
      price: 29.99,
      lastPayment: "15 May 2024",
      nextPayment: "15 Jun 2024"
    },
    reservationStats: {
      future: 3,
      past: 15,
      cancelled: 1
    }
  },
  { 
    name: "Carlos Rodríguez", 
    email: "carlos.rodriguez@email.com", 
    status: "Sin Plan", 
    date: "20 Feb 2023", 
    gender: "Masculino",
    reservationStats: {
      future: 0,
      past: 8,
      cancelled: 2
    }
  },
  { 
    name: "María López", 
    email: "maria.lopez@email.com", 
    status: "Plan Scale", 
    date: "10 Mar 2023", 
    gender: "Femenino",
    membershipDetails: {
      startDate: "10 Mar 2023",
      price: 59.99,
      lastPayment: "10 May 2024",
      nextPayment: "10 Jun 2024"
    },
    reservationStats: {
      future: 5,
      past: 25,
      cancelled: 3
    }
  },
  { 
    name: "Juan Martínez", 
    email: "juan.martinez@email.com", 
    status: "Sin Plan", 
    date: "05 Apr 2023", 
    gender: "Masculino",
    reservationStats: {
      future: 1,
      past: 0,
      cancelled: 0
    }
  },
  { 
    name: "Laura Fernández", 
    email: "laura.fernandez@email.com", 
    status: "Plan Pro", 
    date: "01 May 2023", 
    gender: "Femenino",
    reservationStats: {
      future: 4,
      past: 32,
      cancelled: 5
    }
  },
]

// Combinar los arrays asegurando que todos tengan reservationStats
const allMembers = [...initialMembers, ...additionalMembers].map(member => ({
  ...member,
  reservationStats: member.reservationStats || {
    future: Math.floor(Math.random() * 5),
    past: Math.floor(Math.random() * 30) + 5,
    cancelled: Math.floor(Math.random() * 4)
  }
}))

// Definir la configuración de columnas disponibles
interface ColumnConfig {
  id: keyof typeof columnVisibility
  title: string
  isVisible: boolean
}

// Actualizar la función para mostrar el nombre completo y traducir el género
const formatGender = (gender: string | undefined) => {
  const genderMap = {
    'male': 'Hombre',
    'female': 'Mujer',
    'not_specified': 'Prefiero no decirlo'
  }
  return gender ? genderMap[gender as keyof typeof genderMap] || gender : '-'
}

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
  const { currentBranch } = useBranchContext()
  const queryClient = useQueryClient()
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  
  // Agregar estado para la visibilidad de columnas
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    email: true,
    reservations: true,
    date: true,
    status: true
  })

  // Estados para filtros y paginación
  const [filters, setFilters] = useState({
    search: "",
    sortByReservations: false
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Query para obtener miembros
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => memberService.getMembers(),
    enabled: true
  })

  // Función para filtrar miembros
  const getFilteredMembers = () => {
    let filtered = [...members]
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(member => 
        member.first_name.toLowerCase().includes(searchLower) ||
        member.last_name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }

  // Función para obtener miembros de la página actual
  const getCurrentPageMembers = () => {
    const filteredMembers = getFilteredMembers()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredMembers.slice(startIndex, endIndex)
  }

  // Calcular número total de páginas
  const totalPages = Math.ceil(getFilteredMembers().length / itemsPerPage)

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Mutation para eliminar miembro
  const deleteMutation = useMutation({
    mutationFn: (id: string) => memberService.deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['members', currentBranch?.id])
      toast.success('Miembro eliminado correctamente')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar el miembro')
    }
  })

  // Configuración de columnas disponibles
  const availableColumns: ColumnConfig[] = [
    { id: 'name', title: 'Nombre', isVisible: columnVisibility.name },
    { id: 'email', title: 'Email', isVisible: columnVisibility.email },
    { id: 'reservations', title: 'Reservaciones', isVisible: columnVisibility.reservations },
    { id: 'date', title: 'Fecha', isVisible: columnVisibility.date },
    { id: 'status', title: 'Estado', isVisible: columnVisibility.status }
  ]

  // Función para manejar el clic en una fila
  const handleRowClick = (member: Member) => {
    setSelectedMember(member)
    setIsDetailsModalOpen(true)
  }

  // Función para obtener la clase CSS según el tipo de plan
  const getPlanStatusStyle = (status: string): string => {
    const styles = {
      'Sin Plan': 'bg-gray-100 text-gray-600',
      'Plan Base': 'bg-blue-50 text-blue-700',
      'Plan Pro': 'bg-purple-50 text-purple-700',
      'Plan Scale': 'bg-green-50 text-green-700'
    }
    return `${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-600'} px-3 py-1 rounded-full text-sm font-medium`
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-medium">Lista de Miembros</h3>
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
                    placeholder="Nombre o email..."
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

                {/* Opción de ordenar por reservaciones */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <label className="text-sm text-gray-600">
                    Ordenar por más reservaciones
                  </label>
                  <Switch
                    checked={filters.sortByReservations}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({
                        ...prev,
                        sortByReservations: checked
                      }))
                    }
                  />
                </div>

                {/* Botón para limpiar filtros */}
                <div className="flex justify-end pt-2 border-t">
                  <button
                    onClick={() => setFilters({
                      search: "",
                      sortByReservations: false
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

          {/* Botón de Nuevo Usuario */}
          <button 
            onClick={() => setIsNewMemberOpen(true)}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center gap-2 text-sm shadow-sm transition-all duration-200"
          >
            <IconPlus className="h-5 w-5" />
            <span className="font-medium">Nuevo Usuario</span>
          </button>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="min-w-full table-fixed bg-white">
          <thead>
            <tr>
              {columnVisibility.name && (
                <th className="w-[30%] px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre
                </th>
              )}
              {columnVisibility.email && (
                <th className="w-[30%] px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
              )}
              {columnVisibility.reservations && (
                <th className="w-[15%] px-6 py-3 border-b border-gray-200 bg-white text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Reservaciones
                </th>
              )}
              {columnVisibility.date && (
                <th className="w-[15%] px-6 py-3 border-b border-gray-200 bg-white text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Fecha de Registro
                </th>
              )}
              <th className="w-[10%] px-4 py-3 border-b border-gray-200 bg-white"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {getCurrentPageMembers().map((member, index) => (
              <tr 
                key={member.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(member)}
              >
                {columnVisibility.name && (
                  <td className="px-6 py-4 border-b border-gray-200 text-sm h-16">
                    <div className="flex items-center h-full">
                      <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                        <IconUser className="h-5 w-5 text-gray-500" />
                      </div>
                      <span className="truncate text-sm">
                        {`${member.first_name} ${member.last_name}`}
                      </span>
                    </div>
                  </td>
                )}
                {columnVisibility.email && (
                  <td className="px-6 py-4 border-b border-gray-200 text-sm text-gray-500 h-16 align-middle">
                    <span className="truncate block text-sm">{member.email}</span>
                  </td>
                )}
                {columnVisibility.reservations && (
                  <td className="px-6 py-4 border-b border-gray-200 text-sm h-16 align-middle text-center">
                    <span className="text-gray-500">
                      {member.reservations || 0}
                    </span>
                  </td>
                )}
                {columnVisibility.date && (
                  <td className="px-6 py-4 border-b border-gray-200 text-sm text-gray-500 h-16 align-middle text-center">
                    <span className="truncate block">
                      {formatDate(member.created_at)}
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
                        <DropdownMenuItem 
                          className="text-sm cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
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

      {/* Paginación */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-gray-500">
          {getFilteredMembers().length === 0 ? (
            "No se encontraron miembros"
          ) : (
            `${((currentPage - 1) * itemsPerPage) + 1} - ${Math.min(currentPage * itemsPerPage, getFilteredMembers().length)} de ${getFilteredMembers().length} miembros`
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

