'use client';

import React, { useEffect, useState } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { StepComponentProps } from './StepRenderer';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StepNavigation } from '../shared/StepNavigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Generar fechas disponibles de ejemplo (se reemplazará con datos reales)
const generateAvailableDates = () => {
  const today = startOfDay(new Date());
  const availableDates = [];
  
  // Generar 30 días, pero solo algunos estarán disponibles
  for (let i = 1; i <= 30; i++) {
    const date = addDays(today, i);
    
    // Hacer que algunos días no estén disponibles (ejemplo)
    const isAvailable = i % 3 !== 0; // Cada tercer día no está disponible
    
    if (isAvailable) {
      availableDates.push(format(date, 'yyyy-MM-dd'));
    }
  }
  
  return availableDates;
};

const DateStep: React.FC<StepComponentProps> = ({
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  progress,
}) => {
  const { state, selectDate, formData } = useShiftForm();
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    state.selectedDate ? new Date(state.selectedDate) : undefined
  );
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Cargar fechas disponibles
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        // Simulamos una carga de datos
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // En la implementación real, estos datos vendrían de un servicio API basado en el servicio seleccionado
        // const response = await availabilityService.getAvailableDates(state.selectedService);
        // setAvailableDates(response.data);
        
        // Por ahora usamos datos de ejemplo
        setAvailableDates(generateAvailableDates());
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar fechas disponibles:', error);
        setError('No se pudieron cargar las fechas disponibles. Por favor, inténtelo más tarde.');
        setLoading(false);
      }
    };

    if (state.selectedService) {
      fetchAvailableDates();
    }
  }, [state.selectedService]);

  // Manejar selección de fecha
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    const formattedDate = format(date, 'yyyy-MM-dd');
    selectDate(formattedDate);
  };

  // Manejar clic en siguiente
  const handleNext = () => {
    if (selectedDate) {
      onNext();
    }
  };

  // Si está cargando
  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Cargando fechas disponibles...</p>
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

  // Función para deshabilitar fechas no disponibles
  const disableDate = (date: Date) => {
    const today = startOfDay(new Date());
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Deshabilitar fechas pasadas
    if (isBefore(date, today)) {
      return true;
    }
    
    // Deshabilitar fechas muy futuras (más de 60 días)
    if (isAfter(date, addDays(today, 60))) {
      return true;
    }
    
    // Deshabilitar fechas no disponibles según la API
    return !availableDates.includes(formattedDate);
  };

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Selecciona una Fecha</h2>
      
      <div className="flex justify-center mb-6">
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={disableDate}
            locale={es}
            className="rounded-md"
          />
        </div>
      </div>
      
      {selectedDate && (
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">Fecha seleccionada:</p>
          <p className="text-lg font-medium">
            {format(selectedDate, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })}
          </p>
        </div>
      )}
      
      {/* Botones de navegación */}
      {!isMobile ? (
        <StepNavigation 
          onNext={handleNext} 
          onBack={onPrevious} 
          isNextDisabled={!selectedDate}
        />
      ) : (
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious} className="flex items-center gap-2">
            <ChevronLeft size={16} /> Anterior
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!selectedDate}
            className="flex items-center gap-2"
          >
            Siguiente <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default DateStep;
