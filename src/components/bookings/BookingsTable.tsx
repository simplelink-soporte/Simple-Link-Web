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
    if (!bookings) return [];

    // Filtrar reservas canceladas
    return bookings.filter(booking => booking.paymentStatus !== 'cancelled');
    
    // Ya no necesitamos convertir los horarios aquí, ya que ahora vienen 
    // convertidos desde el servicio de consulta bookingQueryService
    // y además, los campos start_time y end_time ahora son timestamp without time zone
    // en lugar de time without time zone, lo que facilita el manejo de reservas nocturnas
    
  }, [bookings]);

  // Obtener las clases usando el hook con caché configurado
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
  
  // Caché de participantes por fecha para evitar reconsultas innecesarias
  const [participantsCache, setParticipantsCache] = useState<Record<string, TransformedClass[]>>({})

  // Efecto para actualizar la información de participantes cuando cambian las clases
  useEffect(() => {
    // Si no hay datos de clases, no hacer nada
    if (!classesData || classesData.length === 0) {
      // Evitamos llamar a setClasses si no es necesario para prevenir el ciclo infinito
      if (classes.length !== 0) {
        setClasses([]);
      }
      return;
    }
    
    // Clave para el caché (usando la fecha formateada)
    const cacheKey = format(selectedDate, 'yyyy-MM-dd');
    
    // Comprobar si ya tenemos esta fecha en caché
    if (participantsCache[cacheKey]) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Usando participantes en caché para:', cacheKey, {
          totalClases: participantsCache[cacheKey].length
        });
      }
      // Evitamos re-renderizar si los datos son los mismos
      if (JSON.stringify(classes) !== JSON.stringify(participantsCache[cacheKey])) {
        setClasses(participantsCache[cacheKey]);
      }
      return;
    }
    
    // Comprobación para evitar actualizaciones innecesarias
    const classesDataChanged = JSON.stringify(lastClassesDataRef.current) !== JSON.stringify(classesData);
    
    if (classesDataChanged) {
      // Actualizar la referencia con el valor actual
      lastClassesDataRef.current = classesData
      
      // Mostrar información detallada sobre las clases recibidas para debug
      // Solo en desarrollo y limitado a una vez por cambio de datos
      if (process.env.NODE_ENV === 'development') {
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
      }
      
      const updateParticipants = async () => {
        if (classesData.length > 0) {
          setIsLoadingParticipants(true)
          try {
            // Actualizar la información de participantes
            const updatedClasses = await classQueryService.updateClassesParticipants(classesData)
            
            // Comparar resultados antes y después para debug
            // Solo en desarrollo y limitado a una vez por actualización
            if (process.env.NODE_ENV === 'development') {
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
            }
            
            // Actualizar el estado actual
            setClasses(updatedClasses)
            
            // Guardar en caché para futuras referencias
            setParticipantsCache(prevCache => ({
              ...prevCache,
              [cacheKey]: updatedClasses
            }));
            
            if (process.env.NODE_ENV === 'development') {
              console.log('💾 Guardando en caché participantes para:', cacheKey);
            }
          } catch (error) {
            console.error('❌ Error al actualizar participantes:', error)
            setClasses(classesData) // Usar los datos originales en caso de error
          } finally {
            setIsLoadingParticipants(false)
          }
        } else {
          if (classes.length !== 0) {
            setClasses([])
          }
        }
      }

      updateParticipants()
    }
  // Eliminamos 'classes' de las dependencias para evitar el ciclo infinito
  }, [classesData, selectedDate, participantsCache])

  // Refrescar automáticamente los participantes cada 2 minutos SOLO para el día actual
  useEffect(() => {
    // Solo configurar el intervalo si:
    // 1. Hay clases para actualizar
    // 2. Es el día actual (no tiene sentido actualizar días pasados o futuros en tiempo real)
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    
    if (classesData.length === 0 || !isToday) {
      if (process.env.NODE_ENV === 'development' && !isToday && classesData.length > 0) {
        console.log('⏱️ Omitiendo actualización automática: no es el día actual');
      }
      return;
    }
    
    // Log una sola vez al configurar el intervalo
    if (process.env.NODE_ENV === 'development') {
      console.log('⏱️ Configurando actualización automática de participantes cada 2 minutos');
    }
    
    const intervalId = setInterval(() => {
      const updateParticipants = async () => {
        // Log controlado para la actualización automática
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Actualizando participantes automáticamente...');
        }
        
        try {
          // Hacer una copia profunda para no modificar directamente
          const currentClasses = [...classes];
          const updatedClasses = await classQueryService.updateClassesParticipants(currentClasses);
          
          // Solo actualizar si hay cambios reales
          const hasChanges = JSON.stringify(currentClasses) !== JSON.stringify(updatedClasses);
          if (hasChanges) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Cambios en participantes detectados en la actualización automática');
            }
            setClasses(updatedClasses);
            
            // También actualizar el caché para mantener coherencia
            const cacheKey = format(selectedDate, 'yyyy-MM-dd');
            setParticipantsCache(prevCache => ({
              ...prevCache,
              [cacheKey]: updatedClasses
            }));
          } else if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️ No hay cambios en la disponibilidad');
          }
        } catch (error) {
          console.error('❌ Error en actualización automática:', error);
        }
      };
      
      updateParticipants();
    }, 2 * 60 * 1000); // 2 minutos
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🛑 Limpiando intervalo de actualización automática');
      }
      clearInterval(intervalId);
    };
  }, [classesData.length, classes, selectedDate]);

  // Estado para manejar la clase seleccionada (separado de las reservas)
  const [selectedClassData, setSelectedClassData] = useState<TransformedClass | null>(null);

  // Memoizar el procesamiento de sesiones específicas para evitar recálculos innecesarios
  const specificSessionsInfo = useMemo(() => {
    if (classes && classes.length > 0) {
      const specificSessions = classes.filter(c => c.isSpecificSession);
      if (specificSessions.length > 0 && process.env.NODE_ENV === 'development') {
        // Log controlado y una sola vez al detectar sesiones específicas
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
      return specificSessions;
    }
    return [];
  }, [classes]);

  // Función modificada para verificar si una celda tiene una reserva o clase existente
  const getExistingBooking = (courtId: string, time: string): SelectedBooking | TransformedClass | null => {
    if (!businessHours?.timezone) return null;

    // Primero buscar en las clases con información actualizada de participantes
    // Si las clases no están cargadas o no hay clases para procesar
    if (classes && classes.length > 0) {
      // Buscar en las clases actualizadas
      const existingClass = classes.find(classData => 
        !classData.isSuspended && // No considerar clases suspendidas
        classData.courtId === courtId &&
        timeToMinutes(time) >= timeToMinutes(classData.startTime) &&
        timeToMinutes(time) < timeToMinutes(classData.endTime)
      );

      if (existingClass) {
        return existingClass;
      }
    }

    // Luego buscar en las reservas normales
    const existingBooking = bookings.find(booking => 
      booking.courtId === courtId &&
      timeToMinutes(time) >= timeToMinutes(booking.startTime) &&
      timeToMinutes(time) < timeToMinutes(booking.endTime)
    );

    if (existingBooking) {
      return existingBooking;
    }

    return null;
  };

  // Función para manejar los clics en reservas y clases
  const handleBookingClick = (booking: any) => {
    // Verificar si booking es una TransformedClass
    if (isTransformedClass(booking)) {
      // Es una clase, mostrar el modal de clase
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
      
      // Refrescar reservas
      await refetch()
      
      // Refrescar clases
      await refetchClasses()
      
      // También actualizar participantes manualmente para el día actual
      const cacheKey = format(selectedDate, 'yyyy-MM-dd');
      if (classes.length > 0) {
        const updatedClasses = await classQueryService.updateClassesParticipants(classes);
        setClasses(updatedClasses);
        
        // Actualizar caché
        setParticipantsCache(prevCache => ({
          ...prevCache,
          [cacheKey]: updatedClasses
        }));
      }
      
      toast({
        description: (
          <div className="flex items-center gap-2">
            <IconCircleCheck className="w-4 h-4 text-emerald-500" />
            <span>Contenido actualizado</span>
          </div>
        ),
      })
    } catch (error) {
      console.error('Error al refrescar:', error)
      toast({
        variant: "destructive",
        description: "Error al actualizar. Intente nuevamente.",
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