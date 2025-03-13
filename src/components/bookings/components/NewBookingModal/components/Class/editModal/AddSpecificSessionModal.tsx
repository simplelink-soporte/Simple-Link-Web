"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconX, IconPlus, IconCalendar, IconClock, IconUsers, IconCoin, IconSportTennis, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { TimeSelector } from "@/components/ui/time-selector"
import { Input } from "@/components/ui/input"
import { SingleSelect } from "@/components/ui/single-select"
import { DateTime } from "luxon"
import { useGroupedCourts } from '@/hooks/useGroupedCourts'
import { useBranches } from '@/hooks/useBranches'
import { sessionManagementService } from '@/services/sessionManagementService'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  price: number;
  instructors: string[];
  courtIds: string;
  date?: string;
}

interface AddSpecificSessionModalProps {
  isOpen: boolean
  onClose: () => void
  classId: string
  onAddSession: (newSession: TimeSlot) => void
}

export function AddSpecificSessionModal({
  isOpen,
  onClose,
  classId,
  onAddSession
}: AddSpecificSessionModalProps) {
  const { currentBranch } = useBranches()
  const { courtOptions, isLoading: isLoadingCourts, error: courtsError } = useGroupedCourts({ 
    branchId: currentBranch?.id 
  })
  
  // Transformar las opciones agrupadas en una lista plana
  const flatCourtOptions = courtOptions.reduce<Array<{ id: string, name: string }>>((acc, group) => {
    return [...acc, ...group.options.map(opt => ({
      id: opt.value,
      name: `${group.label} - ${opt.label}`
    }))]
  }, [])
  
  // Estado para el formulario
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("09:00")
  const [capacity, setCapacity] = useState(4)
  const [price, setPrice] = useState(0)
  const [instructors, setInstructors] = useState<string[]>([])
  const [newInstructor, setNewInstructor] = useState("")
  const [selectedCourt, setSelectedCourt] = useState<string>("")
  const [loading, setLoading] = useState(false)
  
  // Función para validar el formulario
  const isFormValid = (): boolean => {
    if (!selectedDate) {
      toast.error("Selecciona una fecha para la sesión")
      return false
    }
    
    if (!startTime || !endTime) {
      toast.error("Selecciona un horario válido")
      return false
    }
    
    if (startTime >= endTime) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin")
      return false
    }
    
    if (capacity <= 0) {
      toast.error("La capacidad debe ser mayor a 0")
      return false
    }
    
    if (!selectedCourt) {
      toast.error("Selecciona al menos una cancha")
      return false
    }
    
    return true
  }
  
  // Función para agregar un instructor
  const handleAddInstructor = () => {
    if (newInstructor.trim() && !instructors.includes(newInstructor.trim())) {
      setInstructors(prev => [...prev, newInstructor.trim()])
      setNewInstructor("")
    }
  }
  
  // Función para eliminar un instructor
  const handleRemoveInstructor = (instructor: string) => {
    setInstructors(prev => prev.filter(i => i !== instructor))
  }
  
  // Manejar tecla Enter en el campo de instructor
  const handleInstructorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddInstructor()
    }
  }
  
  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (!isFormValid()) return
    
    setLoading(true)
    
    try {
      // Verificamos que tengamos una fecha seleccionada
      if (!selectedDate) {
        throw new Error("Selecciona una fecha para la sesión")
      }
      
      // Formateamos la fecha al formato ISO (YYYY-MM-DD)
      const formattedDate = format(selectedDate, 'yyyy-MM-dd')
      
      // Llamamos al servicio para agregar la sesión específica
      const result = await sessionManagementService.addSpecificSession({
        classId,
        date: formattedDate,
        startTime,
        endTime,
        courtIds: selectedCourt, 
        capacity,
        price,
        instructors
      })
      
      if (result.success) {
        // Crear el objeto de la nueva sesión para la UI
        const newSession: TimeSlot = {
          id: crypto.randomUUID(),
          startTime,
          endTime,
          capacity,
          price,
          instructors,
          courtIds: selectedCourt, 
          date: formattedDate
        }
        
        // Llamar a la función para actualizar la UI
        onAddSession(newSession)
        
        // Mostrar mensaje de éxito
        toast.success("Sesión específica agregada correctamente", {
          description: `Se ha agregado una nueva sesión para el ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}`
        })
        
        // Cerrar el modal y reiniciar el formulario
        handleClose()
      } else {
        throw new Error(result.error?.message || "Error al agregar la sesión")
      }
    } catch (error) {
      console.error("Error al agregar la sesión:", error)
      toast.error("Error al agregar la sesión", {
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado"
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Función para cerrar el modal y reiniciar el estado
  const handleClose = () => {
    // Reiniciar el formulario
    setSelectedDate(undefined)
    setStartTime("08:00")
    setEndTime("09:00")
    setCapacity(4)
    setPrice(0)
    setInstructors([])
    setNewInstructor("")
    setSelectedCourt("")
    
    // Cerrar el modal
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 20 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }}
          className="fixed right-[520px] top-[10%] w-full max-w-sm bg-white rounded-xl shadow-lg z-50 border border-gray-100/50"
          style={{ transform: 'translateX(-100%)' }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">
                Agregar Sesión Específica
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 rounded-lg p-1 hover:bg-gray-50 transition-colors duration-200"
              >
                <IconX size={16} />
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Fecha */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Fecha de la Sesión
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center justify-between",
                        "px-3 py-2 rounded-lg border border-gray-200",
                        "text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-black",
                        !selectedDate && "text-gray-400"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <IconCalendar size={16} className="text-gray-400" />
                        {selectedDate
                          ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
                              locale: es,
                            })
                          : "Seleccionar fecha"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <CustomCalendar
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Horario */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Hora de Inicio
                  </label>
                  <TimeSelector 
                    value={startTime} 
                    onChange={setStartTime} 
                    minHour={6}
                    maxHour={22}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Hora de Fin
                  </label>
                  <TimeSelector 
                    value={endTime} 
                    onChange={setEndTime} 
                    minHour={6}
                    maxHour={23}
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Capacidad y precio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Capacidad
                  </label>
                  <div className="relative">
                    <IconUsers size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      min={1}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Precio
                  </label>
                  <div className="relative">
                    <IconCoin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      min={0}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              
              {/* Instructores */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Instructores
                </label>
                <div className="flex space-x-2">
                  <Input
                    value={newInstructor}
                    onChange={(e) => setNewInstructor(e.target.value)}
                    onKeyDown={handleInstructorKeyDown}
                    placeholder="Nombre del instructor"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddInstructor}
                    variant="outline"
                    className="px-3"
                  >
                    <IconPlus size={16} />
                  </Button>
                </div>
                
                {/* Lista de instructores */}
                {instructors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {instructors.map((instructor) => (
                      <div
                        key={instructor}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                      >
                        {instructor}
                        <button
                          onClick={() => handleRemoveInstructor(instructor)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          <IconX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Canchas */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Canchas
                </label>
                <SingleSelect
                  value={selectedCourt}
                  onChange={setSelectedCourt}
                  options={flatCourtOptions}
                  placeholder="Seleccionar cancha"
                />
                {courtsError && (
                  <p className="text-xs text-red-500 mt-1">
                    Error al cargar las canchas. Por favor, intente nuevamente.
                  </p>
                )}
                {!isLoadingCourts && !courtsError && flatCourtOptions.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No hay canchas disponibles para esta sede.
                  </p>
                )}
              </div>
              
              {/* Botones de acciones */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="mr-2"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  {loading ? (
                    <IconLoader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <IconPlus size={16} className="mr-2" />
                  )}
                  Agregar Sesión
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
