"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useBranches } from '@/hooks/useBranches'
import { useCourts } from "@/hooks/useCourts"
import { useBookingSelection } from "./hooks/useBookingSelection"
import { useBookingState } from "./hooks/useBookingState"
import { useTimeSlots } from "./hooks/useTimeSlots"
import { useTableNavigation } from "./hooks/useTableNavigation"
import { useBookingModals } from "./hooks/useBookingModals"
import { TableHeader } from "./components/TableHeader"
import { TableBody } from "./components/TableBody"
import { TableNavigationButtons } from "./components/TableNavigationButtons"
import { ConfigurationMenu } from "./components/ConfigurationMenu"
import { NewBookingModal } from "./components/NewBookingModal/NewBookingModal"
import { SimpleShiftBookingModal } from "./components/NewBookingModal/SimpleShiftBookingModal"
import { ViewBookingModal } from "./components/ViewBookingModal/ViewBookingModal"
import { ViewClassModal } from "./components/ViewClassModal/ViewClassModal"
import { timeToMinutes } from "./utils"
import { Z_LAYERS } from "@/constants/zIndex"
import { useBookings } from "@/hooks/useBookings"
import { cn } from "@/lib/utils"
import { IconCircleCheck } from "@tabler/icons-react"
import { toast } from "@/components/ui/use-toast"
import { useBookingStore } from '@/store/bookingStore'
import { format } from 'date-fns'
import type { SelectedBooking, SelectionState } from '@/types/bookings'
import { useBusinessHours } from '@/hooks/useBusinessHours'
import { DateTime } from 'luxon'
import { useClasses } from '@/hooks/useClasses'
import type { TransformedClass } from '@/types/classes'
import { isTransformedClass } from '@/types/classes'
import { classQueryService } from '@/services/classQueryService'

const ScrollContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex-1 min-h-0 relative">
      <div 
        className={cn(
          "absolute inset-0",
          "overflow-y-auto",
          "bookings-scroll-container"
        )}
      >
        {children}
      </div>
    </div>
  );
};

export function BookingsTable() {
  const { currentBranch } = useBranches()
  const { selectedDate, setSelectedDate } = useBookingStore()
  const [configMenuOpen, setConfigMenuOpen] = useState(false)
  const [configButtonPosition, setConfigButtonPosition] = useState({ x: 0, y: 0 })
  const configButtonRef = useRef<HTMLButtonElement>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [tableConfig, setTableConfig] = useState({
    colors: {
      shift: '#FBD950',
      class: '#60A5FA',
      blocked: '#EF4444',
    }
  })

  // Custom hooks con fecha persistente
  const { data: allCourts = [] } = useCourts({ 
    branchId: currentBranch?.id,
    onlyActive: true
  })

  // Formatear la fecha para la consulta de reservas
  const formattedDate = format(selectedDate, 'yyyy-MM-dd')

  // Usar useBookings hook con TanStack Query
  const {
    bookings = [],
    isLoading,
    isError,
    refetch
  } = useBookings({
    selectedDate: formattedDate,
    branchId: currentBranch?.id
  })

  const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null)

  const { timeSlots, isOpen } = useTimeSlots({ selectedDate })

  const {
    visibleCourtsStart,
    tableContainerRef,
    handleTableNavigation,
    getCourtColumnWidth
  } = useTableNavigation({
    totalCourts: allCourts.length
  })

  const {
    showSimpleShiftModal,
    setShowSimpleShiftModal,
    showNewBookingModal,
    setShowNewBookingModal,
    handleSimpleShiftModalClose,
    handleNewBookingModalClose,
    guests,
    currentGuest,
    handleAddGuest,
    handleRemoveGuest,
    resetFormStates
  } = useBookingModals({
    onModalClose: () => setSelection(null)
  })

  const visibleCourts = allCourts.slice(
    visibleCourtsStart,
    visibleCourtsStart + 4
  )

  const {
    selection,
    isMouseDown,
    isDragging,
    handleCellMouseDown,
    handleCellMouseMove,
    handleMouseUp,
    isSlotSelected,
    setSelection
  } = useBookingSelection({
    visibleCourts,
    onSelectionComplete: () => setShowSimpleShiftModal(true)
  })

  const { businessHours } = useBusinessHours()
  
  // Transformar las reservas para convertir los horarios
  const transformedBookings = useMemo(() => {
    if (!bookings || !businessHours?.timezone) return [];

    // Filtrar reservas canceladas
    const activeBookings = bookings.filter(booking => booking.paymentStatus !== 'cancelled');

    return activeBookings.map(booking => {
        // Crear objetos DateTime de Luxon para la conversión
        const startDateTime = DateTime.fromFormat(
            booking.startTime,
            'HH:mm:ss',
            { zone: 'UTC' }
        ).reconfigure({ 
            year: DateTime.fromISO(booking.date).year,
            month: DateTime.fromISO(booking.date).month,
            day: DateTime.fromISO(booking.date).day
        }).setZone(businessHours.timezone);

        const endDateTime = DateTime.fromFormat(
            booking.endTime,
            'HH:mm:ss',
            { zone: 'UTC' }
        ).reconfigure({ 
            year: DateTime.fromISO(booking.date).year,
            month: DateTime.fromISO(booking.date).month,
            day: DateTime.fromISO(booking.date).day
        }).setZone(businessHours.timezone);

        // Convertir a la zona horaria de la sede
        const localStartTime = startDateTime.toFormat('HH:mm');
        const localEndTime = endDateTime.toFormat('HH:mm');

        return {
            ...booking,
            startTime: localStartTime,
            endTime: localEndTime
        };
    });
}, [bookings, businessHours?.timezone]);

  // Obtener las clases usando el nuevo hook
  const { 
    data: classesData = [], 
    isLoading: isLoadingClasses, 
    refetch: refetchClasses 
  } = useClasses({
    date: selectedDate,
    branchId: currentBranch?.id,
    includeCompleted: true // Incluir clases completadas
  })

  // Estado para almacenar las clases con información de participantes actualizada
  const [classes, setClasses] = useState<TransformedClass[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)
  
  // Referencia para almacenar el último valor de classesData
  const lastClassesDataRef = useRef<TransformedClass[]>([])

  // Efecto para actualizar la información de participantes cuando cambian las clases
  useEffect(() => {
    // Comparar si realmente han cambiado los datos de clases
    const classesDataChanged = JSON.stringify(classesData) !== JSON.stringify(lastClassesDataRef.current)
    
    // Solo actualizar si realmente han cambiado los datos
    if (classesDataChanged) {
      // Actualizar la referencia con el valor actual
      lastClassesDataRef.current = classesData
      
      // Mostrar información detallada sobre las clases recibidas para debug
      console.log('📊 Clases recibidas de useClasses:', {
        totalClases: classesData.length,
        clases: classesData.map(c => ({
          id: c.id,
          title: c.title,
          date: c.date,
          startTime: c.startTime,
          endTime: c.endTime,
          courtId: c.courtId,
          capacity: c.capacity,
          currentParticipants: c.currentParticipants
        }))
      });
      
      const updateParticipants = async () => {
        if (classesData.length > 0) {
          setIsLoadingParticipants(true)
          try {
            // Actualizar la información de participantes
            const updatedClasses = await classQueryService.updateClassesParticipants(classesData)
            
            // Comparar resultados antes y después para debug
            console.log('📈 Comparación de participantes:', {
              antes: classesData.map(c => ({ 
                id: c.id, 
                currentParticipants: c.currentParticipants, 
                capacity: c.capacity 
              })),
              después: updatedClasses.map(c => ({ 
                id: c.id, 
                currentParticipants: c.currentParticipants, 
                capacity: c.capacity 
              }))
            });
            
            setClasses(updatedClasses)
          } catch (error) {
            console.error('❌ Error al actualizar participantes:', error)
            setClasses(classesData) // Usar los datos originales en caso de error
          } finally {
            setIsLoadingParticipants(false)
          }
        } else {
          setClasses([])
        }
      }

      updateParticipants()
    }
  }, [classesData])

  // Refrescar automáticamente los participantes cada 2 minutos
  useEffect(() => {
    // Solo configurar el intervalo si hay clases para actualizar
    if (classesData.length === 0) return;
    
    console.log('⏱️ Configurando actualización automática de participantes cada 2 minutos');
    
    const intervalId = setInterval(() => {
      const updateParticipants = async () => {
        console.log('🔄 Actualizando participantes automáticamente...');
        try {
          // Hacer una copia profunda para no modificar directamente
          const currentClasses = [...classes];
          const updatedClasses = await classQueryService.updateClassesParticipants(currentClasses);
          
          // Solo actualizar si hay cambios reales
          const hasChanges = JSON.stringify(currentClasses) !== JSON.stringify(updatedClasses);
          if (hasChanges) {
            console.log('✅ Cambios en participantes detectados en la actualización automática');
            setClasses(updatedClasses);
          } else {
            console.log('ℹ️ No hay cambios en la disponibilidad');
          }
        } catch (error) {
          console.error('❌ Error en actualización automática:', error);
        }
      };
      
      updateParticipants();
    }, 2 * 60 * 1000); // 2 minutos
    
    return () => {
      console.log('🛑 Limpiando intervalo de actualización automática');
      clearInterval(intervalId);
    };
  }, [classesData.length]);

  // Estado para manejar la clase seleccionada (separado de las reservas)
  const [selectedClassData, setSelectedClassData] = useState<TransformedClass | null>(null);

  // Función modificada para verificar si una celda tiene una reserva o clase existente
  const getExistingBooking = (courtId: string, time: string) => {
    if (!businessHours?.timezone) return null;

    // Primero buscar en las clases con información actualizada de participantes
    // Si las clases no están cargadas o no hay clases para procesar
    if (classes && classes.length > 0) {
      // Debugging: Verificar todas las clases para encontrar sesiones específicas
      const specificSessions = classes.filter(c => c.isSpecificSession);
      if (specificSessions.length > 0) {
        console.log('🔍 BookingsTable - Sesiones específicas disponibles:', {
          total: specificSessions.length,
          sesiones: specificSessions.map(s => ({
            id: s.id,
            courtId: s.courtId,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            isSpecificSession: s.isSpecificSession
          }))
        });
      }

      // Buscar en las clases actualizadas
      const existingClass = classes.find(classData => 
        !classData.isSuspended && // No considerar clases suspendidas
        classData.courtId === courtId &&
        timeToMinutes(time) >= timeToMinutes(classData.startTime) &&
        timeToMinutes(time) < timeToMinutes(classData.endTime)
      );

      if (existingClass) {
        console.log('📊 Celda con clase encontrada:', {
          courtId,
          time,
          classId: existingClass.id,
          title: existingClass.title,
          isSuspended: existingClass.isSuspended,
          isSpecificSession: existingClass.isSpecificSession,
          startTime: existingClass.startTime,
          endTime: existingClass.endTime
        });
        return existingClass;
      }
    } else if (classesData && classesData.length > 0) {
      // Si no hay clases actualizadas, usar las originales (también verificando suspensión)
      const existingClass = classesData.find(classData => 
        !classData.isSuspended && // No considerar clases suspendidas
        classData.courtId === courtId &&
        timeToMinutes(time) >= timeToMinutes(classData.startTime) &&
        timeToMinutes(time) < timeToMinutes(classData.endTime)
      );
      
      if (existingClass) {
        return existingClass;
      }
    }

    // Si no hay clase activa, buscar en las reservas
    const transformedBookings = bookings.map(booking => {
      const bookingDate = DateTime.fromISO(booking.date);
      const startTime = DateTime.fromFormat(booking.startTime, 'HH:mm:ss', { zone: 'UTC' });
      const endTime = DateTime.fromFormat(booking.endTime, 'HH:mm:ss', { zone: 'UTC' });

      return {
        ...booking,
        startTime: startTime.setZone(businessHours.timezone).toFormat('HH:mm'),
        endTime: endTime.setZone(businessHours.timezone).toFormat('HH:mm')
      };
    });

    // Buscar una reserva en el horario indicado
    const existingBooking = transformedBookings.find(booking => 
      booking.courtId === courtId &&
      timeToMinutes(time) >= timeToMinutes(booking.startTime) &&
      timeToMinutes(time) < timeToMinutes(booking.endTime)
    );

    // Si encontramos una reserva, verificar si es de tipo class usando acceso seguro a propiedades
    if (existingBooking) {
      // Verificar si la reserva es de tipo clase
      if (existingBooking.reservation_type === 'class' && existingBooking.class_id) {
        console.log('🎓 Reserva de tipo clase encontrada:', {
          bookingId: existingBooking.id,
          classId: existingBooking.class_id,
          courtId,
          time,
          startTime: existingBooking.startTime,
          endTime: existingBooking.endTime
        });

        // Buscar si tenemos información de la clase en el estado actual
        let classInfo = classes.find(c => c.classId === existingBooking.class_id) || 
                        classesData.find(c => c.classId === existingBooking.class_id);
        
        if (classInfo) {
          // Usar la información de clase existente
          return classInfo;
        } else {
          // Obtener el precio de la sesión de clase
          const classSessionPrice = existingBooking.class_session_price || 0;

          // Transformar la reserva a formato de clase
          return {
            id: `class-booking-${existingBooking.id}`,
            courtId: existingBooking.courtId,
            date: existingBooking.date,
            startTime: existingBooking.startTime,
            endTime: existingBooking.endTime,
            title: existingBooking.title || 'Clase sin nombre',
            description: existingBooking.description || '',
            type: 'class',
            instructor: 'Instructor no disponible', // Valor por defecto
            capacity: 0, // Estos valores se actualizarán si se necesita
            currentParticipants: 0,
            status: 'active',
            visibility: 'public',
            price: classSessionPrice,
            classId: existingBooking.class_id, // ID original de la clase
            sessionId: `${existingBooking.class_id}-${existingBooking.id}` // ID único para la sesión
          } as TransformedClass;
        }
      }
    }

    return existingBooking || null;
  };

  // Función para manejar los clics en reservas y clases
  const handleBookingClick = (booking: any) => {
    // Verificar si booking es una TransformedClass
    if (isTransformedClass(booking)) {
      // Es una clase, mostrar el modal de clase
      console.log('🎓 Mostrando modal de clase para:', booking);
      setSelectedClassData(booking);
    } else {
      // Es una reserva normal, mostrar el modal de reserva
      const transformedBooking = transformedBookings.find(b => b.id === booking.id);
      setSelectedBooking(transformedBooking || booking);
    }
  }

  // Actualizar el manejador del botón de configuración
  const handleConfigButtonClick = () => {
    if (configButtonRef.current) {
      const rect = configButtonRef.current.getBoundingClientRect()
      setConfigButtonPosition({ x: rect.left, y: rect.bottom })
      setConfigMenuOpen(true)
    }
  }

  // Manejar el cambio de fecha
  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate)
    // No es necesario llamar a refetch explícitamente ya que TanStack Query
    // lo manejará automáticamente al cambiar la fecha en el queryKey
  }

  // Manejar la actualización manual
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      
      // Iniciar la actualización de reservas y clases
      const refreshPromises = [
        refetch(),
        refetchClasses()
      ]
      
      // Esperar al menos 1 segundo para la animación
      const animationPromise = new Promise(resolve => setTimeout(resolve, 1000))
      
      // Esperar a que todas las promesas se completen
      await Promise.all([...refreshPromises, animationPromise])

      toast({
        title: "Datos actualizados",
        description: "Las reservas y clases se han actualizado correctamente",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudieron actualizar los datos. Por favor, intente nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Agregar efecto para manejar eventos globales del mouse
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseUp)
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [handleMouseUp])

  // Renderizado condicional actualizado
  if (!currentBranch) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Selecciona una sede para ver las canchas disponibles</p>
      </div>
    )
  }

  if (isLoading || isLoadingClasses || isLoadingParticipants) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando datos...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error al cargar los datos</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none">
        <TableHeader
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onConfigClick={handleConfigButtonClick}
          onRefreshClick={handleRefresh}
          isRefreshing={isRefreshing}
          currentBranch={currentBranch}
        />
      </div>

      <div className="flex-1 min-h-0">
        <div className={cn(
          "h-full overflow-y-auto",
          "bookings-scroll-container"
        )}>
          <div className="p-4">
            <div ref={tableContainerRef} 
                 className="w-full border rounded-lg">
              <TableBody
                timeSlots={timeSlots}
                visibleCourts={visibleCourts}
                selection={selection}
                isMouseDown={isMouseDown}
                isDragging={isDragging}
                getExistingBooking={getExistingBooking}
                onMouseDown={handleCellMouseDown}
                onMouseMove={handleCellMouseMove}
                onMouseEnter={handleCellMouseMove}
                onBookingClick={handleBookingClick}
                isSlotSelected={isSlotSelected}
                getCourtColumnWidth={getCourtColumnWidth}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-none">
        <TableNavigationButtons
          totalItems={allCourts.length}
          visibleItems={4}
          currentStart={visibleCourtsStart}
          onNavigate={handleTableNavigation}
          className="border-t border-gray-200 bg-white py-3"
        />
      </div>

      {/* Modales y menús */}
      <ConfigurationMenu
        isOpen={configMenuOpen}
        onClose={() => setConfigMenuOpen(false)}
        position={configButtonPosition}
        currentConfig={tableConfig}
        onConfigChange={setTableConfig}
      />

      <NewBookingModal 
        isOpen={showNewBookingModal}
        onClose={handleNewBookingModalClose}
        initialBookingType="class"
        disableTypeSelection
      />

      <SimpleShiftBookingModal
        isOpen={showSimpleShiftModal && selection !== null}
        onClose={handleSimpleShiftModalClose}
        selection={selection || { 
          selections: [], 
          startCourtId: '', 
          endCourtId: '', 
          startTime: '', 
          endTime: '', 
          slots: 0 
        }}
        onBookingCreated={handleRefresh}
        selectedDate={selectedDate}
      />

      <ViewBookingModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        setSelectedBooking={setSelectedBooking}
        onCancelSuccess={() => {
          toast({
            title: "Reserva cancelada",
            description: (
              <div className="flex items-center gap-2">
                <IconCircleCheck className="h-4 w-4 text-green-600" />
                <span>La reserva ha sido cancelada exitosamente</span>
              </div>
            )
          })
          refetch()
        }}
      />

      {/* Modal para vista de clase */}
      <ViewClassModal
        isOpen={!!selectedClassData}
        onClose={() => setSelectedClassData(null)}
        classData={selectedClassData}
      />
    </div>
  )
}