'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useShiftForm } from '../../context/ShiftFormContext';
import { StepComponentProps } from '../StepRenderer';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { startOfDay, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Importar los componentes que hemos creado
import { PageHeader } from './components/PageHeader';
import { DateSelector } from './components/DateSelector';
import { ShiftFilters } from './components/ShiftFilters';
import { ShiftsList } from './components/ShiftsList';
import { StepNavigation } from '../../shared/StepNavigation';
import { MobileLayout } from '../../shared/MobileLayout';

// Importar el hook de disponibilidad
import { useAvailability } from '@/hooks/useAvailability';
import { AvailabilitySlot } from '@/types/availability';

// Importar el hook de scroll para turnos
import { useShiftsScroll } from './hooks/useShiftsScroll';

// Tipos para el paso de turnos
type CourtType = 'all' | 'indoor' | 'outdoor' | 'covered';
type TimeOfDay = 'morning' | 'afternoon' | 'night';

// Componente principal del paso de turnos
const ShiftsStep: React.FC<StepComponentProps> = ({
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  progress,
}) => {
  // Contexto del formulario
  const { 
    state, 
    selectShift, 
    setDuration: setShiftDuration, 
    setShiftDetails, 
    selectDate, 
    setSkipItemsStep 
  } = useShiftForm();
  
  // Referencia al contenedor de la lista de turnos para scrolling
  const shiftsContainerRef = useRef<HTMLDivElement>(null);
  
  // Estado para determinar si es móvil o desktop
  const [viewType, setViewType] = useState<'mobile' | 'desktop'>('desktop');
  
  // Efecto para detectar si es móvil
  useEffect(() => {
    const checkIfMobile = () => {
      setViewType(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };

    // Verificar inicialmente
    checkIfMobile();

    // Añadir listener para cambios de tamaño
    window.addEventListener('resize', checkIfMobile);

    // Limpiar listener al desmontar
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Implementar el scroll confinado al contenedor de turnos
  useShiftsScroll(shiftsContainerRef as React.RefObject<HTMLDivElement>, {
    enabled: viewType === 'desktop',
    scrollSpeed: 1.2,
    initialPadding: 10
  });

  // Estados locales
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (state.selectedDate) {
      return startOfDay(parseISO(state.selectedDate));
    }
    return startOfDay(new Date());
  });
  
  // Inicializar duración desde el estado global si está disponible
  const [duration, setDuration] = useState<number[]>(() => {
    // Si existe un valor de duración en el contexto, usarlo
    return [state.duration || 1];
  });
  
  // Actualizar el contexto si cambia la duración
  useEffect(() => {
    if (state.duration !== duration[0]) {
      setShiftDuration(duration[0]);
    }
  }, [state.duration, duration, setShiftDuration]);

  const [selectedTime, setSelectedTime] = useState<TimeOfDay | null>(null);
  const [courtFilter, setCourtFilter] = useState<CourtType>('all');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(state.selectedShift);

  // Efecto para sincronizar con el estado global
  useEffect(() => {
    if (state.selectedShift && state.selectedShift !== selectedShiftId) {
      setSelectedShiftId(state.selectedShift);
    }
  }, [state.selectedShift, selectedShiftId]);

  // Obtener información de la ubicación seleccionada
  const branchId = state.selectedLocation;

  // Obtener disponibilidad de turnos utilizando el hook
  const { 
    slots = [], 
    loading, 
    error
  } = useAvailability({
    date: selectedDate,
    duration: duration[0],
    timeOfDay: selectedTime || undefined,
    courtType: courtFilter === 'all' ? undefined : courtFilter,
    branchId: branchId || ''
  });

  // Manejador para seleccionar un turno
  const handleShiftSelection = useCallback((slot: AvailabilitySlot) => {
    console.log('[ShiftsStep] Seleccionando turno:', slot.id);
    
    // Actualizar el estado local inmediatamente
    setSelectedShiftId(slot.id);
    
    // Actualizar el ID del turno en el contexto
    selectShift(slot.id);
    
    // Formatear la fecha en ISO (solo la parte de la fecha)
    const formattedDate = selectedDate.toISOString().split('T')[0];
    
    // Guardar los detalles completos del turno en el contexto global
    setShiftDetails({
      startTime: slot.startTime,
      endTime: slot.endTime,
      courtId: slot.courtId,
      courtName: slot.courtName,
      price: slot.price || 0,
      date: formattedDate // Incluir la fecha en los detalles del turno
    });
    
    // Guardar la fecha seleccionada también por separado (para compatibilidad)
    selectDate(formattedDate);
  }, [selectShift, setShiftDetails, selectDate, selectedDate]);

  // Manejador para avanzar al siguiente paso
  const handleNext = useCallback(() => {
    if (!selectedShiftId) {
      console.error('[ShiftsStep] No se puede avanzar: No hay turno seleccionado');
      // Mostrar alerta visual o notificación al usuario
      return;
    }
    
    console.log('[ShiftsStep] Avanzando al siguiente paso con el turno:', selectedShiftId);
    onNext();
  }, [selectedShiftId, onNext]);
  
  // Manejador para cambiar la fecha
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    
    // Limpiar la selección al cambiar la fecha
    setSelectedShiftId(null);
    selectShift('');
    
    // Limpiar los detalles del turno
    setShiftDetails({
      startTime: '',
      endTime: '',
      courtId: '',
      courtName: '',
      price: 0,
      date: date.toISOString().split('T')[0] // Incluir la fecha seleccionada
    });
    
    // Guardar la fecha en el contexto
    selectDate(date.toISOString().split('T')[0]);
  }, [selectShift, setShiftDetails, selectDate]);
  
  // Manejador para cambiar la duración
  const handleDurationChange = useCallback((value: number[]) => {
    // Actualizar estado local
    setDuration(value);
    
    // Al cambiar la duración, forzar una re-evaluación de si hay items disponibles
    // Resetear el flag de skipItemsStep para que el paso de artículos se evalúe nuevamente
    console.log(`[ShiftsStep] Duración cambiada a ${value[0]} minutos. Reseteando skipItemsStep.`);
    setSkipItemsStep(false);
    
    // Limpiar la selección de turno al cambiar la duración
    setSelectedShiftId(null);
    selectShift('');
    
    // Limpiar los detalles del turno
    setShiftDetails({
      startTime: '',
      endTime: '',
      courtId: '',
      courtName: '',
      price: 0,
      date: selectedDate.toISOString().split('T')[0] // Mantener la fecha seleccionada
    });
    
    // Actualizar duración en el contexto global
    setShiftDuration(value[0]);
  }, [selectShift, setShiftDetails, setSkipItemsStep, setShiftDuration, selectedDate]);
  
  // Manejador para cambiar el filtro de tiempo
  const handleTimeChange = useCallback((value: TimeOfDay | null) => {
    setSelectedTime(value);
    
    // Limpiar la selección de turno al cambiar el filtro
    setSelectedShiftId(null);
    selectShift('');
    
    // Limpiar los detalles del turno
    setShiftDetails({
      startTime: '',
      endTime: '',
      courtId: '',
      courtName: '',
      price: 0,
      date: selectedDate.toISOString().split('T')[0] // Mantener la fecha seleccionada
    });
  }, [selectShift, setShiftDetails, selectedDate]);
  
  // Manejador para cambiar el filtro de tipo de cancha
  const handleCourtFilterChange = useCallback((value: CourtType) => {
    setCourtFilter(value);
    
    // Limpiar la selección de turno al cambiar el filtro
    setSelectedShiftId(null);
    selectShift('');
    
    // Limpiar los detalles del turno
    setShiftDetails({
      startTime: '',
      endTime: '',
      courtId: '',
      courtName: '',
      price: 0,
      date: selectedDate.toISOString().split('T')[0] // Mantener la fecha seleccionada
    });
  }, [selectShift, setShiftDetails, selectedDate]);

  // Organizar slots por pista
  const organizedSlots = useMemo(() => {
    if (!slots.length) return [];
    
    // Agrupar por courtName (pista)
    const groupedByCourt = slots.reduce((acc, slot) => {
      const courtKey = slot.courtName || 'sin-asignar';
      if (!acc[courtKey]) {
        acc[courtKey] = [];
      }
      acc[courtKey].push(slot);
      return acc;
    }, {} as Record<string, typeof slots>);
    
    // Ordenar cada grupo por hora de inicio
    Object.keys(groupedByCourt).forEach(courtKey => {
      groupedByCourt[courtKey].sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
      });
    });
    
    // Aplanar el resultado manteniendo los grupos juntos
    return Object.values(groupedByCourt).flat();
  }, [slots]);

  // Exponer el estado de selección para que StepRenderer pueda acceder a él
  useEffect(() => {
    if (viewType === 'mobile' && typeof window !== 'undefined') {
      (window as any).__shiftsStepData = {
        selectedShiftId,
        isLoading: loading
      };
      
      // Disparar un evento para notificar cambios
      const event = new CustomEvent('shifts-step-update', {
        detail: { selectedShiftId, isLoading: loading }
      });
      window.dispatchEvent(event);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__shiftsStepData;
      }
    };
  }, [selectedShiftId, loading, viewType]);

  return (
    viewType === 'mobile' ? (
      // Layout móvil con header y footer de navegación
      <MobileLayout
        onNext={handleNext}
        onBack={onPrevious}
        isNextDisabled={!selectedShiftId}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col h-full"
        >
          {/* Encabezado */}
          <PageHeader 
            title="Selecciona tu turno"
            description="Elige el día y horario que prefieras para tu reserva"
            theme="light"
          />
          
          {/* Selector de Fecha */}
          <div className="mt-6">
            <DateSelector 
              selectedDate={selectedDate}
              onDateSelect={handleDateChange}
              viewType={viewType}
              theme="light"
            />
          </div>
          
          {/* Filtros */}
          <div className="mt-6">
            <ShiftFilters 
              duration={duration}
              onDurationChange={handleDurationChange}
              selectedTime={selectedTime}
              onTimeChange={handleTimeChange}
              courtFilter={courtFilter}
              onCourtFilterChange={handleCourtFilterChange}
              viewType={viewType}
              theme="light"
            />
          </div>
          
          {/* Lista de Turnos - Contenedor con altura máxima para scroll interno */}
          <div className="mt-6 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 relative">
              <ShiftsList 
                shifts={organizedSlots.map(slot => ({
                  id: slot.id,
                  time: slot.startTime,
                  endTime: slot.endTime,
                  type: 'Turno Regular',
                  courtNumber: slot.courtName,
                  courtType: slot.courtType,
                  basePrice: slot.price || 0,
                  status: slot.status
                }))}
                selectedShift={selectedShiftId}
                onShiftSelect={(shift) => {
                  // Encontrar el slot original basado en el ID del shift seleccionado
                  const slot = slots.find(s => s.id === shift.id);
                  if (slot) {
                    handleShiftSelection(slot);
                  }
                }}
                loading={loading}
                viewType={viewType}
                theme="light"
                containerRef={shiftsContainerRef as React.RefObject<HTMLDivElement>}
              />
            </div>
          </div>
        </motion.div>
      </MobileLayout>
    ) : (
      // Layout desktop con encabezado y navegación en el footer
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col h-full p-4 md:p-6"
      >
        {/* Encabezado */}
        <PageHeader 
          title="Selecciona tu turno"
          description="Elige el día y horario que prefieras para tu reserva"
          theme="light"
        />
        
        {/* Selector de Fecha */}
        <div className="mt-6">
          <DateSelector 
            selectedDate={selectedDate}
            onDateSelect={handleDateChange}
            viewType={viewType}
            theme="light"
          />
        </div>
        
        {/* Filtros */}
        <div className="mt-6">
          <ShiftFilters 
            duration={duration}
            onDurationChange={handleDurationChange}
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            courtFilter={courtFilter}
            onCourtFilterChange={handleCourtFilterChange}
            viewType={viewType}
            theme="light"
          />
        </div>
        
        {/* Lista de Turnos - Contenedor con altura máxima para scroll interno */}
        <div className="mt-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 relative">
            <ShiftsList 
              shifts={organizedSlots.map(slot => ({
                id: slot.id,
                time: slot.startTime,
                endTime: slot.endTime,
                type: 'Turno Regular',
                courtNumber: slot.courtName,
                courtType: slot.courtType,
                basePrice: slot.price || 0,
                status: slot.status
              }))}
              selectedShift={selectedShiftId}
              onShiftSelect={(shift) => {
                // Encontrar el slot original basado en el ID del shift seleccionado
                const slot = slots.find(s => s.id === shift.id);
                if (slot) {
                  handleShiftSelection(slot);
                }
              }}
              loading={loading}
              viewType={viewType}
              theme="light"
              containerRef={shiftsContainerRef as React.RefObject<HTMLDivElement>}
            />
          </div>
        </div>
        
        {/* Navegación */}
        {viewType === 'desktop' && (
          <StepNavigation 
            onNext={handleNext}
            onBack={onPrevious}
            isNextDisabled={!selectedShiftId}
          />
        )}
      </motion.div>
    )
  );
};

export default ShiftsStep;
