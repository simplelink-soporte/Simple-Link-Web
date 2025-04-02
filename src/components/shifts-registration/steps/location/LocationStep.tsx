'use client';

import React, { useEffect, useState, memo } from 'react';
import { useShiftForm } from '../../context/ShiftFormContext';
import { StepComponentProps } from '../StepRenderer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Check, Loader2, Clock } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useShiftLocationBranches } from '../../hooks';
import { StepNavigation } from '../../shared/StepNavigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileLayout } from '../../shared/MobileLayout';

// Componente memoizado para el título y descripción
const PageHeader = memo(({ 
  title,
  description
}: { 
  title: string;
  description: string;
}) => (
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    transition={{ duration: 0.4 }} 
    className="space-y-2"
  > 
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-gray-900"> 
        {title}
      </h1>
    </div>
    
    <p className="text-sm text-gray-500"> 
      {description}
    </p> 
  </motion.div>
));

PageHeader.displayName = 'PageHeader';

// Función auxiliar para formatear el horario como string simple
const formatSimpleSchedule = (scheduleStr: string | Record<string, any>): string => {
  if (!scheduleStr) return 'Horario no disponible';
  if (typeof scheduleStr === 'string') {
    // Si es un string JSON, intentamos parsearlo
    try {
      const parsedJson = JSON.parse(scheduleStr);
      return formatSimpleSchedule(parsedJson);
    } catch (e) {
      // Si no se puede parsear, devolvemos el string original
      return scheduleStr;
    }
  }
  
  // Si es un objeto, intentamos extraer una representación legible
  try {
    if (scheduleStr.formatted) return scheduleStr.formatted;
    
    // Formato para los días específicos de la semana
    const dayMapping: { [key: string]: string } = {
      'monday': 'Lunes',
      'tuesday': 'Martes',
      'wednesday': 'Miércoles',
      'thursday': 'Jueves',
      'friday': 'Viernes',
      'saturday': 'Sábado',
      'sunday': 'Domingo'
    };
    
    // Orden de los días para ayudar a determinar rangos
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Acceder a la estructura correcta del horario
    const schedule = scheduleStr.schedule || scheduleStr;
    
    // Verificar si tiene la estructura esperada
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hasExpectedStructure = days.some(day => 
      schedule[day] !== undefined && 
      typeof schedule[day] === 'object' &&
      'isOpen' in schedule[day]
    );
    
    if (!hasExpectedStructure) {
      console.log('[formatSimpleSchedule] Estructura no esperada:', JSON.stringify(scheduleStr).substring(0, 100) + '...');
      return 'Horario: consultar con el establecimiento';
    }
    
    // Filtramos días que están abiertos
    const openDays = days.filter(day => 
      schedule[day] && schedule[day].isOpen === true
    );
    
    if (openDays.length === 0) return 'Cerrado';
    
    // Encontrar el horario más amplio
    let earliestOpen = '23:59';
    let latestClose = '00:00';
    
    openDays.forEach(day => {
      if (schedule[day] && schedule[day].timeRanges && schedule[day].timeRanges.length > 0) {
        schedule[day].timeRanges.forEach((range: { openTime: string; closeTime: string }) => {
          if (range.openTime < earliestOpen) earliestOpen = range.openTime;
          if (range.closeTime > latestClose) latestClose = range.closeTime;
        });
      }
    });
    
    // Ordenar los días para encontrar rangos consecutivos
    const orderedOpenDays = openDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    // Crear rangos de días
    const ranges: string[] = [];
    let currentRange: string[] = [];
    
    orderedOpenDays.forEach((day, index) => {
      if (index === 0) {
        currentRange.push(day);
      } else {
        // Si es consecutivo con el día anterior
        const prevDayIdx = dayOrder.indexOf(orderedOpenDays[index - 1]);
        const currentDayIdx = dayOrder.indexOf(day);
        
        if (currentDayIdx - prevDayIdx === 1) {
          // Es consecutivo, agregamos al rango actual
          currentRange.push(day);
        } else {
          // No es consecutivo, cerramos el rango actual y empezamos uno nuevo
          ranges.push(formatDayRange(currentRange, dayMapping));
          currentRange = [day];
        }
      }
      
      // Si es el último día, cerramos el rango
      if (index === orderedOpenDays.length - 1) {
        ranges.push(formatDayRange(currentRange, dayMapping));
      }
    });
    
    // Combinar el resultado
    return `${ranges.join(', ')}, de ${earliestOpen} a ${latestClose}`;
  } catch (e) {
    console.error('[LocationStep] Error al formatear horario:', e);
    return 'Horario no disponible';
  }
};

// Función auxiliar para formatear un rango de días
const formatDayRange = (days: string[], dayMapping: { [key: string]: string }): string => {
  if (days.length === 0) return '';
  if (days.length === 1) return dayMapping[days[0]];
  
  return `${dayMapping[days[0]]} a ${dayMapping[days[days.length - 1]]}`;
};

const LocationStep: React.FC<StepComponentProps> = ({
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  progress,
}) => {
  const { state, selectLocation } = useShiftForm();
  const { organization } = useOrganization();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { branches, loading, error } = useShiftLocationBranches(organization?.id);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isContentVisible, setIsContentVisible] = useState(true);

  // Montaje del componente
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Exponer el estado de selección para que StepRenderer pueda acceder a él
  useEffect(() => {
    if (isMobile && typeof window !== 'undefined') {
      (window as any).__locationStepData = {
        selectedLocation,
        isLoading: loading
      };
      
      // Disparar un evento para notificar cambios
      const event = new CustomEvent('location-step-update', {
        detail: { selectedLocation, isLoading: loading }
      });
      window.dispatchEvent(event);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__locationStepData;
      }
    };
  }, [selectedLocation, loading, isMobile]);

  // Efecto para sincronizar el estado local con el contexto
  useEffect(() => {
    if (state.selectedLocation) {
      setSelectedLocation(state.selectedLocation);
    }
  }, [state.selectedLocation]);

  // Manejador para cuando se selecciona una ubicación
  const handleLocationSelection = (branchId: string) => {
    console.log('[LocationStep] Seleccionando ubicación:', branchId);
    setSelectedLocation(branchId);
    selectLocation(branchId);
  };

  // Manejador para avanzar al siguiente paso
  const handleNext = () => {
    console.log('[LocationStep] Intentando avanzar al siguiente paso, ubicación seleccionada:', selectedLocation);
    
    if (!selectedLocation) {
      console.warn('[LocationStep] No se puede avanzar: No hay ubicación seleccionada');
      return;
    }
    
    console.log('[LocationStep] Avanzando al siguiente paso:', {
      selectedLocation,
      branchName: branches.find(b => b.id === selectedLocation)?.name
    });
    onNext();
  };

  // Si está cargando
  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-600">Cargando ubicaciones disponibles...</p>
      </div>
    );
  }

  // Si hay un error
  if (error) {
    return (
      <div className="py-4">
        <div className="text-red-500 mb-4">{error.message || 'Error al cargar ubicaciones'}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Si no hay sucursales
  if (branches.length === 0) {
    return (
      <div className="py-4">
        <div className="text-gray-500 mb-4">No hay ubicaciones disponibles actualmente.</div>
      </div>
    );
  }

  return (
    isMobile ? (
      // Layout móvil con header y footer de navegación
      <MobileLayout
        onNext={handleNext}
        onBack={onPrevious}
        isNextDisabled={!selectedLocation}
        showBackButton={false} // No mostrar el botón volver en este paso
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col h-full"
        >
          <PageHeader 
            title="¿Dónde quieres reservar tu turno?"
            description="Selecciona la ubicación más conveniente para ti"
          />
          
          <div className="mt-6 space-y-3">
            {branches.map((branch, index) => {
              const isSelected = selectedLocation === branch.id;
              
              return (
                <motion.button
                  key={branch.id}
                  onClick={() => handleLocationSelection(branch.id)}
                  className={cn(
                    "w-full h-auto text-sm font-medium rounded-xl p-3",
                    "transition-all duration-200 ease-in-out border",
                    isSelected
                      ? "border-black text-gray-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-800"
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    transition: { duration: 0.3 }
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="font-medium text-sm transition-colors mb-1 text-gray-900">
                        {branch.name}
                      </h3>
                      <div className="space-y-0.5">
                        {branch.address && (
                          <p className="text-[11px] transition-colors text-left text-gray-500">
                            {branch.address}
                          </p>
                        )}
                        {branch.opening_hours && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <p className="text-[10px] transition-colors text-left text-gray-500">
                              {formatSimpleSchedule(branch.opening_hours)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                          }}
                          className="rounded-full flex items-center justify-center bg-black h-5 w-5"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 20,
                              delay: 0.1
                            }}
                          >
                            <Check 
                              className="h-3 w-3 text-white" 
                              strokeWidth={2.5}
                            />
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </MobileLayout>
    ) : (
      // Layout desktop
      <div className="py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key="location-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="pb-6">
              <PageHeader 
                title="¿Dónde quieres reservar tu turno?"
                description="Selecciona la ubicación más conveniente para ti"
              />
            </div>
            
            <div className="space-y-3 pb-6">
              {branches.map((branch, index) => {
                const isSelected = selectedLocation === branch.id;
                
                return (
                  <motion.button
                    key={branch.id}
                    onClick={() => handleLocationSelection(branch.id)}
                    className={cn(
                      "w-full h-auto text-sm font-medium rounded-xl p-3",
                      "transition-all duration-200 ease-in-out border",
                      isSelected
                        ? "border-black text-gray-900"
                        : "border-gray-200 hover:border-gray-300 text-gray-800"
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: 1,
                      transition: { duration: 0.3 }
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-medium text-sm transition-colors mb-1 text-gray-900">
                          {branch.name}
                        </h3>
                        <div className="space-y-0.5">
                          {branch.address && (
                            <p className="text-[11px] transition-colors text-left text-gray-500">
                              {branch.address}
                            </p>
                          )}
                          {branch.opening_hours && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <p className="text-[10px] transition-colors text-left text-gray-500">
                                {formatSimpleSchedule(branch.opening_hours)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 20
                            }}
                            className="rounded-full flex items-center justify-center bg-black h-5 w-5"
                          >
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                                delay: 0.1
                              }}
                            >
                              <Check 
                                className="h-3 w-3 text-white" 
                                strokeWidth={2.5}
                              />
                            </motion.div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <StepNavigation 
              onNext={handleNext} 
              onBack={onPrevious} 
              isNextDisabled={!selectedLocation}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    )
  );
};

export default LocationStep;
