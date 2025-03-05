import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark, IconChevronDown, IconUser, IconCreditCard, IconCalendar, IconTicket, IconId, IconEdit } from "@tabler/icons-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectProvider } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { CancelMembershipModal } from "@/components/CancelMembershipModal"
import { PauseMembershipModal } from "@/components/PauseMembershipModal"
import { cn } from "@/lib/utils"
import { format } from 'date-fns'
import es from 'date-fns/locale/es'
import { ReservationHistoryModal } from "@/components/ReservationHistoryModal"
import { ReservationStats } from "@/components/stats/ReservationStats"
import { ReservationStatsAlt } from "@/components/stats/ReservationStatsAlt"
import { toast } from "sonner"

interface Member {
  firstName: string
  lastName: string
  email: string
  status: string
  date: string
  gender: string
  phone?: string
  notes?: string
  membershipDetails?: {
    startDate: string
    price: number
    lastPayment: string
    nextPayment: string
    cancelDate?: Date
  }
  isPaused?: boolean
  reservationStats?: ReservationStats
  created_at: string
}

interface MemberDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  member: Member | null
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

export function MemberDetailsModal({ isOpen, onClose, member }: MemberDetailsModalProps) {
  // Cambiamos el estado inicial a string vacío para que todo esté cerrado
  const [openSection, setOpenSection] = useState<string>("")
  const [selectedPlan, setSelectedPlan] = useState(member?.status || "")
  const [isGenderSelectOpen, setIsGenderSelectOpen] = useState(false)
  const [selectedGender, setSelectedGender] = useState(member?.gender || "")
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    gender: false,
    phone: false,
    notes: false
  })
  const [formData, setFormData] = useState({
    firstName: member?.firstName || "",
    lastName: member?.lastName || "",
    email: member?.email || "",
    gender: member?.gender || "",
    phone: member?.phone || "",
    notes: member?.notes || ""
  })

  // Estado para controlar el popup de confirmación
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    gender: false,
    phone: false,
    notes: false
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
    status: member?.status || "",
    isPaused: member?.isPaused || false
  })

  const [membershipDetails, setMembershipDetails] = useState(member?.membershipDetails || null)

  // Agregar estado para controlar el modal de historial de reservaciones
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  // Agregar función para manejar la cancelación
  const handleCancelMembership = (reason: string, cancelDate: Date) => {
    setMembershipDetails(prev => ({
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
    handleInputChange('gender', gender)
    setGenderMenuOpen(false)
    handlePopoverClose('gender')
    setEditableFields(prev => ({
      ...prev,
      gender: false
    }))
  }

  // Función para manejar la confirmación de edición
  const handleEditConfirm = (field: string) => {
    handleEditRequest(field)
    handlePopoverClose(field)
    if (field === 'gender') {
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
        firstName: member.first_name || '',
        lastName: member.last_name || '',
        email: member.email,
        gender: formatGender(member.gender),
        phone: member.phone || '',
        notes: member.notes || ''
      })
      setSelectedGender(formatGender(member.gender))
      setSelectedPlan(member.status)
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

  if (!member) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <SelectProvider>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: "100%", 
              opacity: 0,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l z-50"
          >
            <div className="h-full flex flex-col">
              {/* Encabezado */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="p-6 border-b"
              >
                <h2 className="text-xl font-semibold">Detalles del Miembro</h2>
                <p className="text-sm text-gray-500 mt-1">Información completa del miembro</p>
              </motion.div>

              {/* Contenido Principal */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="flex-1 overflow-y-auto"
              >
                <div className="p-6 space-y-8">
                  {/* Sección de Detalles */}
                  <div className="space-y-6">
                    {/* Nombre y Apellido */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Campo Nombre */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Nombre
                        </label>
                        <Popover open={popoverOpen.firstName} onOpenChange={(open) => {
                          if (!editableFields.firstName) {
                            setPopoverOpen(prev => ({ ...prev, firstName: open }))
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
                                editableFields.firstName ? "text-gray-900" : "text-gray-500"
                              )}
                              value={formData.firstName}
                              onChange={(e) => handleInputChange('firstName', e.target.value)}
                              readOnly={!editableFields.firstName}
                              placeholder="Ingrese el nombre"
                            />
                          </PopoverTrigger>
                          {!editableFields.firstName && (
                            <PopoverContent className="w-auto p-3">
                              <div className="text-sm">
                                <p>¿Desea modificar este campo?</p>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button 
                                    className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                    onClick={() => {
                                      handleEditRequest('firstName')
                                      handlePopoverClose('firstName')
                                    }}
                                  >
                                    Sí
                                  </button>
                                  <button 
                                    className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                                    onClick={() => handlePopoverClose('firstName')}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                      </div>

                      {/* Campo Apellido */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Apellido
                        </label>
                        <Popover open={popoverOpen.lastName} onOpenChange={(open) => {
                          if (!editableFields.lastName) {
                            setPopoverOpen(prev => ({ ...prev, lastName: open }))
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
                                editableFields.lastName ? "text-gray-900" : "text-gray-500"
                              )}
                              value={formData.lastName}
                              onChange={(e) => handleInputChange('lastName', e.target.value)}
                              readOnly={!editableFields.lastName}
                              placeholder="Ingrese el apellido"
                            />
                          </PopoverTrigger>
                          {!editableFields.lastName && (
                            <PopoverContent className="w-auto p-3">
                              <div className="text-sm">
                                <p>¿Desea modificar este campo?</p>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button 
                                    className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                    onClick={() => {
                                      handleEditRequest('lastName')
                                      handlePopoverClose('lastName')
                                    }}
                                  >
                                    Sí
                                  </button>
                                  <button 
                                    className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                                    onClick={() => handlePopoverClose('lastName')}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                      </div>
                    </div>

                    {/* Campo Teléfono */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Número de teléfono
                      </label>
                      <Popover open={popoverOpen.phone} onOpenChange={(open) => {
                        if (!editableFields.phone) {
                          setPopoverOpen(prev => ({ ...prev, phone: open }))
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
                              editableFields.phone ? "text-gray-900" : "text-gray-500"
                            )}
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            readOnly={!editableFields.phone}
                            placeholder="Ingrese el número de teléfono"
                          />
                        </PopoverTrigger>
                        {!editableFields.phone && (
                          <PopoverContent className="w-auto p-3">
                            <div className="text-sm">
                              <p>¿Desea modificar este campo?</p>
                              <div className="flex justify-end gap-2 mt-2">
                                <button 
                                  className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                  onClick={() => {
                                    handleEditRequest('phone')
                                    handlePopoverClose('phone')
                                  }}
                                >
                                  Sí
                                </button>
                                <button 
                                  className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                                  onClick={() => handlePopoverClose('phone')}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                    </div>

                    {/* Campo Email */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <Popover open={popoverOpen.email} onOpenChange={(open) => {
                        if (!editableFields.email) {
                          setPopoverOpen(prev => ({ ...prev, email: open }))
                        }
                      }}>
                        <PopoverTrigger asChild>
                          <input
                            type="email"
                            className={cn(
                              "w-full px-3 py-2 rounded-lg",
                              "border border-gray-200 bg-white",
                              "focus:outline-none focus:border-gray-300",
                              "transition-colors duration-200",
                              "placeholder:text-gray-400",
                              "text-sm",
                              editableFields.email ? "text-gray-900" : "text-gray-500"
                            )}
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            readOnly={!editableFields.email}
                            placeholder="Ingrese el email"
                          />
                        </PopoverTrigger>
                        {!editableFields.email && (
                          <PopoverContent className="w-auto p-3">
                            <div className="text-sm">
                              <p>¿Desea modificar este campo?</p>
                              <div className="flex justify-end gap-2 mt-2">
                                <button 
                                  className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                  onClick={() => {
                                    handleEditRequest('email')
                                    handlePopoverClose('email')
                                  }}
                                >
                                  Sí
                                </button>
                                <button 
                                  className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                                  onClick={() => handlePopoverClose('email')}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                    </div>

                    {/* Campo Género */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Género
                      </label>
                      <Popover open={popoverOpen.gender} onOpenChange={(open) => {
                        if (!editableFields.gender) {
                          setPopoverOpen(prev => ({ ...prev, gender: open }))
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
                                editableFields.gender ? "text-gray-900" : "text-gray-500"
                              )}>
                                {selectedGender || "Seleccione el género"}
                              </span>
                              <IconChevronDown className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </PopoverTrigger>
                        {!editableFields.gender && (
                          <PopoverContent className="w-auto p-3">
                            <div className="text-sm">
                              <p>¿Desea modificar este campo?</p>
                              <div className="flex justify-end gap-2 mt-2">
                                <button 
                                  className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                  onClick={() => {
                                    handleEditRequest('gender')
                                    handlePopoverClose('gender')
                                    setGenderMenuOpen(true)
                                  }}
                                >
                                  Sí
                                </button>
                                <button 
                                  className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                                  onClick={() => handlePopoverClose('gender')}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                      {editableFields.gender && genderMenuOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1001]">
                          {["Masculino", "Femenino", "Otro"].map((gender) => (
                            <button
                              key={gender}
                              onClick={() => handleGenderSelect(gender)}
                              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                            >
                              {gender}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Campo Notas */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Notas
                      </label>
                      <Popover open={popoverOpen.notes} onOpenChange={(open) => {
                        if (!editableFields.notes) {
                          setPopoverOpen(prev => ({ ...prev, notes: open }))
                        }
                      }}>
                        <PopoverTrigger asChild>
                          <textarea
                            className={cn(
                              "w-full px-3 py-2 rounded-lg",
                              "border border-gray-200 bg-white",
                              "focus:outline-none focus:border-gray-300",
                              "transition-colors duration-200",
                              "placeholder:text-gray-400",
                              "text-sm",
                              "min-h-[100px] resize-none",
                              editableFields.notes ? "text-gray-900" : "text-gray-500"
                            )}
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            readOnly={!editableFields.notes}
                            placeholder="Agregue notas adicionales..."
                          />
                        </PopoverTrigger>
                        {!editableFields.notes && (
                          <PopoverContent className="w-auto p-3">
                            <div className="text-sm">
                              <p>¿Desea modificar este campo?</p>
                              <div className="flex justify-end gap-2 mt-2">
                                <button 
                                  className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                  onClick={() => {
                                    handleEditRequest('notes')
                                    handlePopoverClose('notes')
                                  }}
                                >
                                  Sí
                                </button>
                                <button 
                                  className="px-2 py-1 text-xs bg-black text-white rounded-md hover:bg-gray-800"
                                  onClick={() => handlePopoverClose('notes')}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                    </div>
                  </div>

                  {/* Sección de Reservaciones */}
                  <div className="space-y-6 pt-6 border-t">
                    <h3 className="text-base font-medium">Reservaciones</h3>
                    <div className="space-y-8">
                      <ReservationStatsAlt
                        stats={{
                          future: member.reservationStats?.future || 0,
                          past: member.reservationStats?.past || 0,
                          cancelled: member.reservationStats?.cancelled || 0,
                        }}
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={() => setIsHistoryModalOpen(true)}
                          className="text-sm text-gray-400 hover:text-gray-500 font-medium transition-colors"
                        >
                          Ver historial completo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Pie del Modal */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="p-6 border-t bg-white"
              >
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cerrar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Guardar Cambios
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Modal de Historial de Reservaciones */}
          <ReservationHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
          />
        </SelectProvider>
      )}
    </AnimatePresence>
  )
}
