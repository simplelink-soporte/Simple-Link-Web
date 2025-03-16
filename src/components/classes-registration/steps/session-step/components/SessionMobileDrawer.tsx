import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Check, Clock, Calendar, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileDrawer } from '../../../shared/MobileDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClassSession } from '../../../types/models';
import { formatSessionDate, isSessionAvailable } from '../utils/helpers';
import { useClassRegistration } from '../../../context/ClassRegistrationContext';
import { IconChevronRight } from '@tabler/icons-react';
import { stockValidationService } from '../../../services/stockValidationService';

interface SessionMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: ClassSession | null;
  isSelected: boolean;
  onSelect: (session: ClassSession) => void;
}

/**
 * Componente para mostrar los detalles de una sesión en un drawer móvil
 * Utiliza el componente MobileDrawer para mantener la misma apariencia y funcionalidad
 * que antes de la refactorización
 */
export function SessionMobileDrawer({
  isOpen,
  onClose,
  session,
  isSelected,
  onSelect,
}: SessionMobileDrawerProps) {
  const { goToStep, state, selectSession, dispatch } = useClassRegistration();
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  // Referencia para almacenar la última sesión validada y evitar bucles
  const lastValidatedSessionRef = useRef<string | null>(null);
  // Estado local para mantener la sesión actualizada con disponibilidad
  const [sessionWithAvailability, setSessionWithAvailability] = useState<ClassSession | null>(session);

  // Actualizar el estado local cuando cambia la sesión
  useEffect(() => {
    setSessionWithAvailability(session);
  }, [session]);

  if (!sessionWithAvailability) {
    return null;
  }

  // Función para verificar si la sesión está en el estado seleccionado
  const isSessionSelected = () => {
    return state.selectedSessions.includes(sessionWithAvailability.id);
  };

  // Verificar la disponibilidad de la sesión cuando se abre el drawer
  useEffect(() => {
    let isMounted = true; // Bandera para evitar actualizaciones en componentes desmontados
    
    // Solo proceder si el drawer está abierto y tenemos una sesión válida
    if (isOpen && sessionWithAvailability && sessionWithAvailability.id) {
      // Evitar re-validación de la misma sesión para prevenir bucles
      const currentSessionKey = `${sessionWithAvailability.id}-${sessionWithAvailability.date}-${sessionWithAvailability.startTime}`;
      const isAlreadyValidated = lastValidatedSessionRef.current === currentSessionKey;
      const shouldSkipValidation = isAlreadyValidated && sessionWithAvailability.spotsLeft !== undefined && sessionWithAvailability.spotsLeft !== null;
      
      if (shouldSkipValidation) {
        console.log('🔄 Omitiendo re-validación para sesión ya validada:', sessionWithAvailability.id);
        return;
      }
      
      // Forzamos estado de carga inmediatamente cuando se abre el drawer
      setIsLoadingAvailability(true);
      console.log('📱 Iniciando validación de disponibilidad para sesión en drawer móvil', sessionWithAvailability.id);
      
      // Pequeño retraso para asegurar que el estado de carga se refleje en la UI
      const timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        
        try {
          // Buscar la clase actual para obtener su ID
          const classId = state.selectedClass?.id;
          
          if (!classId) {
            console.error('❌ No se pudo obtener el ID de la clase para verificar disponibilidad');
            if (isMounted) setIsLoadingAvailability(false);
            return;
          }
          
          // Obtenemos la disponibilidad de esta sesión específica
          if (sessionWithAvailability.date && sessionWithAvailability.startTime && sessionWithAvailability.endTime) {
            console.log('📊 Verificando disponibilidad para sesión:', {
              classId,
              date: sessionWithAvailability.date,
              startTime: sessionWithAvailability.startTime,
              endTime: sessionWithAvailability.endTime
            });
            
            const availabilityResult = await stockValidationService.checkSessionAvailability(
              classId,
              sessionWithAvailability.date,
              sessionWithAvailability.startTime,
              sessionWithAvailability.endTime,
              { forceUpdate: true } // Forzar actualización para evitar caché
            );
            
            console.log('📊 Resultado de disponibilidad:', availabilityResult);
            
            if (availabilityResult && state.selectedClass && isMounted) {
              // Registrar esta sesión como ya validada para evitar bucles
              lastValidatedSessionRef.current = currentSessionKey;
              
              // Actualizar el estado local primero (efecto inmediato en UI)
              setSessionWithAvailability({
                ...sessionWithAvailability,
                spotsLeft: availabilityResult.availableSpots
              });
              
              // Actualizamos esta sesión con la disponibilidad en el estado global
              const updatedSessions = state.selectedClass.sessions.map((s: ClassSession) => {
                if (s.id === sessionWithAvailability.id) {
                  return {
                    ...s,
                    spotsLeft: availabilityResult.availableSpots
                  };
                }
                return s;
              });
              
              // Actualizamos el estado de la clase con las sesiones actualizadas
              dispatch({
                type: 'SET_SELECTED_CLASS',
                payload: {
                  ...state.selectedClass,
                  sessions: updatedSessions,
                  id: state.selectedClass.id || '' // Aseguramos que id siempre esté definido
                }
              });
              
              console.log('✅ Disponibilidad actualizada para sesión en drawer móvil:', availabilityResult.availableSpots);
            }
          }
        } catch (error) {
          console.error('❌ Error al verificar disponibilidad para sesión en drawer móvil:', error);
        } finally {
          // Asegurarnos de que el componente sigue montado antes de actualizar el estado
          if (isMounted) {
            setIsLoadingAvailability(false);
          }
        }
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    } else if (!isOpen) {
      // Cuando se cierra el drawer, reseteamos el estado de validación
      lastValidatedSessionRef.current = null;
    }
    
    return () => {
      isMounted = false; // Limpiar bandera cuando el componente se desmonta
    };
  }, [isOpen, sessionWithAvailability?.id, dispatch]);

  const handleSelect = () => {
    if (sessionWithAvailability) {
      // Seleccionar la sesión directamente usando el contexto
      // para evitar pasar por multiples componentes
      if (sessionWithAvailability.id) {
        selectSession(sessionWithAvailability.id);
      }
      
      // También llamamos a onSelect para mantener la compatibilidad
      onSelect(sessionWithAvailability);
      
      // Cerrar el drawer
      onClose();
      
      // Verificamos explícitamente si la sesión ya está en el estado
      // antes de intentar navegar (usando la función de verificación)
      if (isSessionSelected()) {
        setTimeout(() => {
          goToStep('summary');
        }, 300);
      } else {
        // Esperamos más tiempo y hacemos una verificación adicional
        setTimeout(() => {
          // Comprobamos una vez más si la sesión se añadió al estado
          if (isSessionSelected()) {
            goToStep('summary');
          } else {
            // Si después de esperar sigue sin estar seleccionada,
            // la seleccionamos una vez más y esperamos para navegar
            if (sessionWithAvailability.id) {
              selectSession(sessionWithAvailability.id);
              setTimeout(() => goToStep('summary'), 300);
            }
          }
        }, 500);
      }
    }
  };

  // Formatear la fecha para mostrarla en un formato legible
  const { dayName, dayNumber, monthName } = formatSessionDate(sessionWithAvailability.date);
  
  // Verificar si la sesión está disponible
  const isAvailable = isSessionAvailable(sessionWithAvailability);
  // Estamos cargando si: 
  // 1. Nuestro estado local indica que estamos verificando disponibilidad, o
  // 2. La sesión aún no tiene información de disponibilidad (spotsLeft es null o undefined)
  const isValidatingAvailability = isLoadingAvailability || (sessionWithAvailability.spotsLeft === undefined || sessionWithAvailability.spotsLeft === null);

  return (
    <MobileDrawer
      isOpen={isOpen}
      onClose={onClose}
      imageUrl="/images/Miroodles - Sticker 3.png"
      title="Detalles de la sesión"
      footer={
        <Button 
          className={cn(
            "w-full px-4 py-3 rounded-xl",
            "bg-gray-900 text-white",
            "text-sm font-medium",
            "transition-all duration-200",
            "hover:bg-gray-800",
            "flex items-center justify-center gap-2"
          )}
          onClick={handleSelect}
          disabled={!isAvailable || isValidatingAvailability}
        >
          {isSelected ? (
            <>
              <span>Continuar</span>
              <IconChevronRight size={16} className="text-white/70" />
            </>
          ) : isValidatingAvailability ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando disponibilidad...
            </span>
          ) : (
            <>
              <span>Continuar</span>
              <IconChevronRight size={16} className="text-white/70" />
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Información de la sesión */}
        <div className="space-y-4">
          {/* Fecha y hora */}
          <div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {dayName}, {dayNumber} de {monthName}
              </h3>
              <p className="text-sm text-gray-600">
                {sessionWithAvailability.startTime} - {sessionWithAvailability.endTime}
              </p>
            </div>
          </div>

          {/* Detalles adicionales */}
          <div className="space-y-4">
            {/* Instructor */}
            {sessionWithAvailability.instructor && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Instructor
                </h4>
                <p className="text-sm text-gray-600">
                  {sessionWithAvailability.instructor}
                </p>
              </div>
            )}

            {/* Cancha */}
            {sessionWithAvailability.courts && sessionWithAvailability.courts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Cancha
                </h4>
                <p className="text-sm text-gray-600">
                  {sessionWithAvailability.courts[0].name}
                </p>
              </div>
            )}

            {/* Cupos */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Cupos disponibles
              </h4>
              {isValidatingAvailability ? (
                <div className="flex items-center">
                  <div className="w-3 h-3 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Verificando disponibilidad...</span>
                </div>
              ) : (
                <p className={cn(
                  "text-sm",
                  sessionWithAvailability.spotsLeft <= 3 && sessionWithAvailability.spotsLeft > 0 
                    ? "text-amber-600" 
                    : (sessionWithAvailability.spotsLeft === 0 ? "text-red-600" : "text-gray-500"),
                  sessionWithAvailability.spotsLeft <= 3 ? "font-medium" : ""
                )}>
                  {sessionWithAvailability.spotsLeft} {sessionWithAvailability.spotsLeft === 1 ? 'cupo' : 'cupos'}
                </p>
              )}
            </div>

            {/* Precio */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Precio
              </h4>
              <p className="text-base font-medium text-gray-900">
                {typeof sessionWithAvailability.price === 'number'
                  ? sessionWithAvailability.price.toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })
                  : 'Precio no disponible'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileDrawer>
  );
}
