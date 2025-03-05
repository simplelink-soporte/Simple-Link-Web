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
import { timeToMinutes } from "./utils"
import { Z_LAYERS } from "@/constants/zIndex"
import { useBookings } from "@/hooks/useBookings"
import { cn } from "@/lib/utils"
import { IconCircleCheck } from "@tabler/icons-react"
import { toast } from "@/components/ui/use-toast"
import { useBookingStore } from '@/store/bookingStore'
import { format } from 'date-fns'
import type { SelectedBooking } from '@/types/bookings'
import { useBusinessHours } from '@/hooks/useBusinessHours'
import { DateTime } from 'luxon'

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

  // Función para verificar si una celda tiene una reserva existente
  const getExistingBooking = (courtId: string, time: string) => {
    if (!businessHours?.timezone) return null;

    const transformedBookings = bookings.map(booking => {
      const startDateTime = DateTime.fromFormat(
        booking.startTime,
        'HH:mm:ss',
        { zone: 'UTC' }
      ).setZone(businessHours.timezone);

      const endDateTime = DateTime.fromFormat(
        booking.endTime,
        'HH:mm:ss',
        { zone: 'UTC' }
      ).setZone(businessHours.timezone);

      return {
        ...booking,
        startTime: startDateTime.toFormat('HH:mm'),
        endTime: endDateTime.toFormat('HH:mm')
      };
    });

    return transformedBookings.find(booking => 
      booking.courtId === courtId &&
      timeToMinutes(time) >= timeToMinutes(booking.startTime) &&
      timeToMinutes(time) < timeToMinutes(booking.endTime)
    ) || null;
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
      
      // Iniciar la actualización
      const refreshPromise = refetch()
      
      // Esperar al menos 1 segundo para la animación
      const animationPromise = new Promise(resolve => setTimeout(resolve, 1000))
      
      // Esperar a que ambas promesas se completen
      await Promise.all([refreshPromise, animationPromise])

      toast({
        title: "Datos actualizados",
        description: "Las reservas se han actualizado correctamente",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudieron actualizar las reservas. Por favor, intente nuevamente.",
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

  // Renderizado condicional
  if (!currentBranch) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Selecciona una sede para ver las canchas disponibles</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando reservas...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error al cargar las reservas</p>
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
          onCreateClassClick={() => setShowNewBookingModal(true)}
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
                onBookingClick={(booking) => {
                  // Encontrar la reserva transformada correspondiente
                  const transformedBooking = transformedBookings.find(b => b.id === booking.id);
                  setSelectedBooking(transformedBooking || booking);
                }}
                isSlotSelected={isSlotSelected}
                getCourtColumnWidth={getCourtColumnWidth}
                bookings={transformedBookings}
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
        isOpen={showSimpleShiftModal}
        onClose={handleSimpleShiftModalClose}
        selection={selection}
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
    </div>
  )
}