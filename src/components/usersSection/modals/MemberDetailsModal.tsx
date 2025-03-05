import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark, IconChevronDown, IconUser, IconCreditCard, IconCalendar, IconTicket, IconId, IconEdit } from "@tabler/icons-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectProvider } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { CancelMembershipModal } from "@/components/usersSection/modals/CancelMembershipModal"
import { PauseMembershipModal } from "@/components/usersSection/modals/PauseMembershipModal"
import { cn } from "@/lib/utils"
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { ReservationHistoryModal } from "@/components/ReservationHistoryModal"
import { toast } from "sonner"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useQueryClient } from '@tanstack/react-query'
import type { Usuario } from '../types'
import { useAuth } from '@/contexts/AuthContext'
import { useAppStore } from '@/store/appStore'
import { useUserPackageDetails } from '../hooks/useUserPackageDetails'
import type { UserPackageWithDetails } from '../hooks/useUserPackageDetails'
import { Modal } from "@/components/ui/modal"

interface MemberDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  member: Usuario | null
}

interface AccordionItemProps {
  title: string
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
}

// Agregar esta interfaz junto con las otras interfaces al inicio del archivo
interface ReservationStats {
  future: number;
  past: number;
  cancelled: number;
}

interface MembershipDetails {
  cancelDate?: Date;
  [key: string]: any;
}

const AccordionItem = ({ title, children, isOpen, onToggle }: AccordionItemProps) => {
  return (
    <div className="border-b">
      <button
        className="w-full py-4 flex items-center justify-between text-left"
        onClick={onToggle}
      >
        <span className="font-medium">{title}</span>
        <IconChevronDown
          className={`h-5 w-5 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
          marginBottom: isOpen ? 16 : 0
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut"
        }}
        className="overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  )
}

// Función para traducir el género
const formatGender = (gender: string | null | undefined) => {
  const genderMap = {
    'masculino': 'Hombre',
    'femenino': 'Mujer',
    'otro': 'Prefiero no decirlo'
  }
  return gender ? genderMap[gender as keyof typeof genderMap] || gender : '-'
}

// Función para formatear la fecha
const formatDate = (dateString: string) => {
  try {
    // Usamos el tipo any temporalmente para evitar el error de tipado
    const locale = es as any
    return format(new Date(dateString), 'dd MMM yyyy', { locale })
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return 'Fecha no válida'
  }
}

export function MemberDetailsModal({ isOpen, onClose, member }: MemberDetailsModalProps) {
  const supabase = createClientComponentClient<Database>()
  const queryClient = useQueryClient()
  const { empresa } = useAppStore()
  const [openSection, setOpenSection] = useState<string>("")
  const [selectedPlan, setSelectedPlan] = useState(member?.estado || "")
  const [isGenderSelectOpen, setIsGenderSelectOpen] = useState(false)
  const [selectedGender, setSelectedGender] = useState(member?.genero || "")
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({
    nombre: false,
    telefono: false,
    genero: false,
    notas: false
  })
  const [formData, setFormData] = useState({
    nombre: member?.nombre || "",
    email: member?.email || "",
    genero: formatGender(member?.genero),
    telefono: member?.telefono || "",
    notas: member?.metadata?.notas || ""
  })

  // Estado para controlar el popup de confirmación
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({
    nombre: false,
    telefono: false,
    genero: false,
    notas: false
  })

  // Estado para controlar el menú de opciones de género
  const [genderMenuOpen, setGenderMenuOpen] = useState(false)

  // Agregar estados para el manejo del plan
  const [planMenuOpen, setPlanMenuOpen] = useState(false)

  // Agregar estado para el modal de cancelación
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  // Agregar estado para el modal de pausa
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false)

  // Agregar estado para controlar el estado de la membresía
  const [membershipStatus, setMembershipStatus] = useState<{
    status: string;
    isPaused: boolean;
  }>({
    status: member?.estado || "",
    isPaused: member?.metadata?.isPaused || false
  })

  const [membershipDetails, setMembershipDetails] = useState(member?.metadata?.membershipDetails || null)

  // Agregar estado para controlar el modal de historial de reservaciones
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  // Obtener detalles de paquetes
  const { 
    data: packageDetailsResponse,
    isLoading: isLoadingPackagesDetails,
    deletePackage
  } = useUserPackageDetails({
    userId: member?.id || '',
    empresaId: empresa?.id || ''
  })

  // Agregar función para manejar la cancelación
  const handleCancelMembership = (reason: string, cancelDate: Date) => {
    setMembershipDetails((prev: MembershipDetails | null) => ({
      ...prev!,
      cancelDate: cancelDate
    }))
    console.log('Membresía cancelada:', { reason, cancelDate })
  }

  // Función para manejar la apertura del popup de confirmación
  const handlePopoverOpen = (field: string) => {
    setPopoverOpen(prev => ({
      ...prev,
      [field]: true
    }))
  }

  // Función para manejar el cierre del popup de confirmación
  const handlePopoverClose = (field: string) => {
    setPopoverOpen(prev => ({
      ...prev,
      [field]: false
    }))
  }

  // Función para manejar la selección de género
  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender)
    handleInputChange('genero', gender)
    setGenderMenuOpen(false)
    handlePopoverClose('genero')
    setEditableFields(prev => ({
      ...prev,
      genero: false
    }))
  }

  // Función para manejar la confirmación de edición
  const handleEditConfirm = (field: string) => {
    handleEditRequest(field)
    handlePopoverClose(field)
    if (field === 'genero') {
      setGenderMenuOpen(true)
    }
  }

  // Agregamos un useEffect para resetear openSection cuando el modal se cierre
  useEffect(() => {
    if (!isOpen) {
      setOpenSection("")
    }
  }, [isOpen])

  // Modificamos el useEffect existente para también resetear openSection cuando cambia el miembro
  useEffect(() => {
    if (member) {
      setFormData({
        nombre: member.nombre || '',
        email: member.email,
        genero: formatGender(member.genero),
        telefono: member.telefono || '',
        notas: member.metadata?.notas || ''
      })
      setSelectedGender(formatGender(member.genero))
      setSelectedPlan(member.estado)
      setOpenSection("")
    }
  }, [member])

  const handleEditRequest = (field: string) => {
    setEditableFields(prev => ({
      ...prev,
      [field]: true
    }))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Función mejorada para manejar la apertura/cierre de secciones
  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? "" : section)
  }

  // Función para cerrar el popup
  const handleClosePopup = (field: string) => {
    setEditableFields(prev => ({
      ...prev,
      [field]: false
    }))
  }

  // Función para manejar la selección del plan
  const handlePlanSelect = (plan: string) => {
    setSelectedPlan(plan)
    setPlanMenuOpen(false)
    handlePopoverClose('plan')
    setEditableFields(prev => ({
      ...prev,
      plan: false
    }))
  }

  const handlePauseMembership = (reason: string, pauseDate: Date) => {
    setMembershipStatus(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }))
    // Aquí puedes agregar la lógica para pausar/reactivar la membresía
    console.log('Membresía pausada/reactivada:', { reason, pauseDate })
  }

  // Función para guardar los cambios
  const handleSaveChanges = async () => {
    if (!member) return

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: formData.nombre,
          telefono: formData.telefono,
          genero: formData.genero === 'Prefiero no decirlo' ? 'otro' : formData.genero.toLowerCase(),
          metadata: {
            ...member.metadata,
            notas: formData.notas
          }
        })
        .eq('id', member.id)

      if (error) throw error

      // Invalidar la caché para recargar los datos
      queryClient.invalidateQueries({ queryKey: ['users'] })
      
      toast.success('Cambios guardados correctamente')
      onClose()
    } catch (error) {
      console.error('Error al guardar cambios:', error)
      toast.error('Error al guardar los cambios')
    }
  }

  if (!member) return null

  return (
    <SelectProvider>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        className="w-[500px]"
      >
        <div className="h-full flex flex-col">
          {/* Encabezado */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Detalles del Miembro</h2>
            <p className="text-sm text-gray-500 mt-1">Información completa del miembro</p>
          </div>

          {/* Contenido Principal */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
              {/* Sección de Detalles */}
              <div className="space-y-6">
                {/* Nombre */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nombre
                    </label>
                    <Popover open={popoverOpen.nombre} onOpenChange={(open) => {
                      if (!editableFields.nombre) {
                        setPopoverOpen(prev => ({ ...prev, nombre: open }))
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <input
                          type="text"
                          className={cn(
                            "w-full px-3 py-2 rounded-lg",
                            "border border-gray-200 bg-white",
                            "focus:outline-none focus:border-gray-300",
                            "transition-colors duration-200",
                            "placeholder:text-gray-400",
                            "text-sm",
                            editableFields.nombre ? "text-gray-900" : "text-gray-500"
                          )}
                          value={formData.nombre}
                          onChange={(e) => handleInputChange('nombre', e.target.value)}
                          readOnly={!editableFields.nombre}
                          placeholder="Ingrese el nombre"
                        />
                      </PopoverTrigger>
                      {!editableFields.nombre && (
                        <PopoverContent className="w-auto p-3">
                          <div className="text-sm">
                            <p>¿Desea modificar este campo?</p>
                            <div className="flex justify-end gap-2 mt-2">
                              <button 
                                className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                onClick={() => {
                                  handleEditRequest('nombre')
                                  handlePopoverClose('nombre')
                                }}
                              >
                                Sí
                              </button>
                              <button 
                                className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                                onClick={() => handlePopoverClose('nombre')}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  </div>

                {/* Email (no editable) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg",
                      "border border-gray-200 bg-gray-50",
                      "text-gray-500",
                      "text-sm"
                    )}
                    value={formData.email}
                    readOnly
                  />
                </div>

                {/* Teléfono */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Número de teléfono
                    </label>
                    <Popover open={popoverOpen.telefono} onOpenChange={(open) => {
                      if (!editableFields.telefono) {
                        setPopoverOpen(prev => ({ ...prev, telefono: open }))
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <input
                          type="tel"
                          className={cn(
                            "w-full px-3 py-2 rounded-lg",
                            "border border-gray-200 bg-white",
                            "focus:outline-none focus:border-gray-300",
                            "transition-colors duration-200",
                            "placeholder:text-gray-400",
                            "text-sm",
                            editableFields.telefono ? "text-gray-900" : "text-gray-500"
                          )}
                          value={formData.telefono}
                          onChange={(e) => handleInputChange('telefono', e.target.value)}
                          readOnly={!editableFields.telefono}
                          placeholder="Ingrese el número de teléfono"
                        />
                      </PopoverTrigger>
                      {!editableFields.telefono && (
                        <PopoverContent className="w-auto p-3">
                          <div className="text-sm">
                            <p>¿Desea modificar este campo?</p>
                            <div className="flex justify-end gap-2 mt-2">
                              <button 
                                className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                onClick={() => {
                                  handleEditRequest('telefono')
                                  handlePopoverClose('telefono')
                                }}
                              >
                                Sí
                              </button>
                              <button 
                                className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                                onClick={() => handlePopoverClose('telefono')}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                </div>

                {/* Género */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Género
                  </label>
                  <Popover open={popoverOpen.genero} onOpenChange={(open) => {
                    if (!editableFields.genero) {
                      setPopoverOpen(prev => ({ ...prev, genero: open }))
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <div 
                        className={cn(
                          "w-full px-3 py-2 rounded-lg",
                          "border border-gray-200 bg-white",
                          "focus-within:border-gray-300",
                          "transition-colors duration-200",
                          "cursor-pointer"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-sm",
                            editableFields.genero ? "text-gray-900" : "text-gray-500"
                          )}>
                            {selectedGender || "Seleccione el género"}
                          </span>
                          <IconChevronDown className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </PopoverTrigger>
                    {!editableFields.genero && (
                      <PopoverContent className="w-auto p-3">
                        <div className="text-sm">
                          <p>¿Desea modificar este campo?</p>
                          <div className="flex justify-end gap-2 mt-2">
                            <button 
                              className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                              onClick={() => {
                                handleEditRequest('genero')
                                handlePopoverClose('genero')
                                setGenderMenuOpen(true)
                              }}
                            >
                              Sí
                            </button>
                            <button 
                              className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                              onClick={() => handlePopoverClose('genero')}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                  {editableFields.genero && genderMenuOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1001]">
                      {["masculino", "femenino", "otro"].map((gender) => (
                        <button
                          key={gender}
                          onClick={() => handleGenderSelect(gender)}
                          className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          {formatGender(gender)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sección de Paquetes Activos */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Paquetes de Clases Activos</h3>
                <div className="space-y-4">
                  {isLoadingPackagesDetails ? (
                    <div className="text-sm text-gray-500">Cargando paquetes...</div>
                  ) : !packageDetailsResponse?.length ? (
                    <div className="text-sm text-gray-500">No hay paquetes activos</div>
                  ) : (
                    packageDetailsResponse.map((packageDetail: UserPackageWithDetails) => (
                      packageDetail && (
                        <div
                          key={packageDetail.userPackage.id}
                          className="p-4 border rounded-lg space-y-3"
                        >
                          {/* Nombre y estado */}
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{packageDetail.packageDetails.name}</h4>
                              <p className="text-sm text-gray-500">
                                Total: {packageDetail.packageDetails.class_count} sesiones
                              </p>
                            </div>
                            <span className={cn(
                              "text-sm px-2 py-1 rounded-full",
                              packageDetail.userPackage.status === 'active' 
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            )}>
                              {packageDetail.userPackage.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>

                          {/* Detalles del paquete */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Sesiones Restantes</p>
                              <p className="font-medium">{packageDetail.userPackage.sessions_left}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Precio</p>
                              <p className="font-medium">${packageDetail.packageDetails.price}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Expira</p>
                              <p className="font-medium">{formatDate(packageDetail.userPackage.expires_at)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Creado</p>
                              <p className="font-medium">{formatDate(packageDetail.userPackage.created_at || '')}</p>
                            </div>
                          </div>

                          {/* Información adicional y acciones */}
                          <div className="pt-2 border-t space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <IconCalendar className="h-4 w-4" />
                              <span>Reserva con {packageDetail.packageDetails.advance_booking_days} días de anticipación</span>
                            </div>
                            
                            {/* Botones de acción */}
                            <div className="flex justify-end">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                                  >
                                    Eliminar
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent 
                                  className="w-[280px]" 
                                  side="left" 
                                  align="end"
                                  sideOffset={5}
                                >
                                  <div className="space-y-3 p-1">
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-sm">¿Eliminar paquete?</h4>
                                      <p className="text-xs text-gray-500">
                                        Esta acción eliminará permanentemente el paquete y todas sus sesiones restantes. No podrás deshacer esta acción.
                                      </p>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2 border-t">
                                      <button
                                        onClick={() => deletePackage.mutate(packageDetail.userPackage.id)}
                                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                                        disabled={deletePackage.isPending}
                                      >
                                        {deletePackage.isPending ? 'Eliminando...' : 'Confirmar'}
                                      </button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      )
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pie del Modal */}
          <div className="p-6 border-t bg-white">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleSaveChanges}
                className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Historial de Reservaciones */}
      <ReservationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </SelectProvider>
  )
}
