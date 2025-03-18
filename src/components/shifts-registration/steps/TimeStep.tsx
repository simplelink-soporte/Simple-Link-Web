'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { StepComponentProps } from './StepRenderer';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

// Tipo para los slots de tiempo
interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  capacity: number;
  reserved: number;
}

// Generar horarios de ejemplo (se reemplazará con datos reales)
const generateTimeSlots = () => {
  const slots: TimeSlot[] = [];
  let startHour = 8; // 8:00 AM
  let endHour = 18; // 6:00 PM
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Eliminar horarios aleatorios para simular no disponibilidad
      const available = Math.random() > 0.3; // 30% de probabilidad de no estar disponible
      
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      const time = `${formattedHour}:${formattedMinute}`;
      
      slots.push({
        id: `slot-${hour}-${minute}`,
        time,
        available,
        capacity: 3 + Math.floor(Math.random() * 5), // Capacidad entre 3 y 7
        reserved: Math.floor(Math.random() * 3) // Entre 0 y 2 reservas
      });
    }
  }
  
  return slots;
};

// Agrupar horarios por rango de tiempo
const groupTimeSlots = (slots: TimeSlot[]) => {
  return slots.reduce((groups, slot) => {
    const hour = parseInt(slot.time.split(':')[0]);
    
    if (hour < 12) {
      groups.morning.push(slot);
    } else if (hour < 17) {
      groups.afternoon.push(slot);
    } else {
      groups.evening.push(slot);
    }
    
    return groups;
  }, {
    morning: [] as TimeSlot[],
    afternoon: [] as TimeSlot[],
    evening: [] as TimeSlot[]
  });
};

const TimeStep: React.FC<StepComponentProps> = ({
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  progress,
}) => {
  const { state, selectTimeSlot, formData } = useShiftForm();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');

  // Agrupar los horarios por rango de tiempo
  const groupedSlots = useMemo(() => {
    return groupTimeSlots(timeSlots);
  }, [timeSlots]);

  // Filtrar horarios según el filtro activo
  const filteredSlots = useMemo(() => {
    if (activeFilter === 'all') {
      return timeSlots.filter(slot => slot.available);
    }
    return groupedSlots[activeFilter].filter(slot => slot.available);
  }, [timeSlots, groupedSlots, activeFilter]);

  // Cargar horarios disponibles
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        // Simulamos una carga de datos
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // En la implementación real, estos datos vendrían de un servicio API
        // const response = await availabilityService.getTimeSlots(state.selectedService, state.selectedDate);
        // setTimeSlots(response.data);
        
        // Por ahora usamos datos de ejemplo
        setTimeSlots(generateTimeSlots());
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar horarios disponibles:', error);
        setError('No se pudieron cargar los horarios disponibles. Por favor, inténtelo más tarde.');
        setLoading(false);
      }
    };

    if (state.selectedService && state.selectedDate) {
      fetchTimeSlots();
    }
  }, [state.selectedService, state.selectedDate]);

  // Manejar selección de horario
  const handleTimeSelect = (slotId: string) => {
    const selectedSlot = timeSlots.find(slot => slot.id === slotId);
    if (selectedSlot) {
      selectTimeSlot(selectedSlot.time);
    }
  };

  // Manejar clic en siguiente
  const handleNext = () => {
    if (state.selectedTimeSlot) {
      onNext();
    }
  };

  // Si está cargando
  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Cargando horarios disponibles...</p>
      </div>
    );
  }

  // Si hay un error
  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()} className="w-full">
          Reintentar
        </Button>
      </div>
    );
  }

  // Formatear la fecha seleccionada
  const formattedDate = state.selectedDate 
    ? format(new Date(state.selectedDate), 'EEEE, d \'de\' MMMM', { locale: es })
    : '';

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-xl font-semibold mb-2">Selecciona un Horario</h2>
      <p className="text-gray-600 mb-6">{formattedDate}</p>
      
      {/* Filtros de horarios */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('all')}
          className="whitespace-nowrap"
        >
          Todos los horarios
        </Button>
        <Button
          variant={activeFilter === 'morning' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('morning')}
          className="whitespace-nowrap"
        >
          Mañana (8-12h)
        </Button>
        <Button
          variant={activeFilter === 'afternoon' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('afternoon')}
          className="whitespace-nowrap"
        >
          Tarde (12-17h)
        </Button>
        <Button
          variant={activeFilter === 'evening' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('evening')}
          className="whitespace-nowrap"
        >
          Noche (17h+)
        </Button>
      </div>
      
      {/* Lista de horarios */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {filteredSlots.length > 0 ? (
          filteredSlots.map(slot => {
            // Parsear el tiempo para mostrarlo formateado
            const timeDate = parse(slot.time, 'HH:mm', new Date());
            const formattedTime = format(timeDate, 'h:mm a');
            const isSelected = state.selectedTimeSlot === slot.time;
            const capacityText = `${slot.reserved}/${slot.capacity}`;
            
            return (
              <Button
                key={slot.id}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  "flex flex-col h-auto py-3",
                  isSelected ? 'bg-primary text-primary-foreground' : '',
                  slot.capacity - slot.reserved <= 1 ? 'border-amber-500' : ''
                )}
                onClick={() => handleTimeSelect(slot.id)}
              >
                <span className="text-base">{formattedTime}</span>
                <span className={cn(
                  "text-xs mt-1",
                  isSelected ? 'text-primary-foreground' : 'text-gray-500',
                  slot.capacity - slot.reserved <= 1 ? 'text-amber-600' : ''
                )}>
                  {slot.capacity - slot.reserved <= 1 ? '¡Últimos lugares!' : capacityText}
                </span>
              </Button>
            );
          })
        ) : (
          <div className="col-span-full text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No hay horarios disponibles en este rango.</p>
          </div>
        )}
      </div>
      
      {/* Botones de navegación */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onPrevious} className="flex items-center gap-2">
          <ChevronLeft size={16} /> Anterior
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!state.selectedTimeSlot}
          className="flex items-center gap-2"
        >
          Siguiente <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default TimeStep;
