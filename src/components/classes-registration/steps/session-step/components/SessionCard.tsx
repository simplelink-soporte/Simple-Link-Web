import React from 'react';
import { cn } from '@/lib/utils';
import type { ClassSession } from '../../../types/models';
import { formatSessionDate } from '../utils/helpers';
import { isSessionAvailable } from '../utils/helpers';

interface SessionCardProps {
  session: ClassSession;
  isSelected: boolean;
  onSelect: (session: ClassSession) => void;
  isMobile?: boolean;
}

/**
 * Componente que renderiza una tarjeta individual para una sesión
 * Replicas exactamente el estilo y estructura del archivo original
 */
export function SessionCard({ 
  session, 
  isSelected, 
  onSelect, 
  isMobile = false 
}: SessionCardProps) {
  // Formatear la fecha para mostrarla en un formato legible
  const { dayName, dayNumber, monthName } = formatSessionDate(session.date);
  
  // Verificar si la sesión está disponible
  const isAvailable = isSessionAvailable(session);
  
  // Función para manejar el clic en la tarjeta
  const handleClick = () => {
    onSelect(session);
  };

  // Renderizar indicador de disponibilidad
  const renderAvailability = () => {
    // En modo desktop no mostramos la disponibilidad según el nuevo requerimiento
    if (!isMobile) {
      return null;
    }
    
    if (session.spotsLeft === undefined || session.spotsLeft === null) {
      return (
        <div className="flex items-center space-x-1.5">
          <div className="h-3 w-3 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500 animate-pulse whitespace-nowrap">Verificando...</span>
        </div>
      );
    }
    
    // Mostrar la disponibilidad real con solo tres colores
    const spotsLeft = session.spotsLeft;
    
    // Sin disponibilidad (rojo)
    if (spotsLeft === 0) {
      return (
        <span className="text-xs font-medium text-red-600 whitespace-nowrap">
          No disponible
        </span>
      );
    }
    
    // Poca disponibilidad (naranja/amber)
    if (spotsLeft <= 5) {
      return (
        <span className="text-xs font-medium text-amber-600 whitespace-nowrap">
          {spotsLeft} {spotsLeft === 1 ? 'lugar' : 'lugares'}
        </span>
      );
    }
    
    // Buena disponibilidad (gris)
    return (
      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
        {spotsLeft} {spotsLeft === 1 ? 'lugar' : 'lugares'}
      </span>
    );
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        // Estilos base del contenedor
        "w-full rounded-xl",
        // Usar mismo grosor de borde para evitar movimiento al seleccionar
        "border border-solid box-border",
        isSelected 
          ? "border-black" // Borde negro para elemento seleccionado
          : "border-gray-100 hover:border-gray-200 bg-white",
        // Quitar cualquier transición para evitar movimiento
        "transition-none",
        "relative overflow-hidden",
        // Accesibilidad - quitar anillo azul al seleccionar
        "focus:outline-none focus:ring-0"
      )}
      aria-pressed={isSelected}
      title={isSelected ? "Sesión seleccionada" : "Seleccionar sesión"}
    >
      <div className="px-4 py-3 sm:p-4">
        <div className="flex flex-row sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          {/* Contenedor principal para móvil que agrupa fecha/hora y precio */}
          <div className="flex flex-1 justify-between items-start sm:items-center gap-2">
            {/* Fecha y hora - Visible en todos los dispositivos */}
            <div className="min-w-0">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {dayName}, {dayNumber} de {monthName}
                </p>
                <p className="text-xs text-gray-600">
                  {session.startTime} - {session.endTime}
                </p>
              </div>
            </div>

            {/* Precio en móvil */}
            <div className="sm:hidden flex-shrink-0">
              <p className="text-sm font-medium text-gray-900">
                {typeof session.price === 'number' 
                  ? session.price.toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })
                  : 'Precio no disponible'
                }
              </p>
            </div>
          </div>

          {/* Instructor y cancha - Solo visible en desktop */}
          <div className="hidden sm:block flex-shrink-0">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              {session.instructor && (
                <p className="flex items-center gap-1">
                  <span className="font-medium">Instructor:</span>
                  <span className="truncate">{session.instructor}</span>
                </p>
              )}
              {session.courts && session.courts.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <p className="flex items-center gap-1">
                    <span className="font-medium">Cancha:</span>
                    <span className="truncate">{session.courts[0].name}</span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Precio y cupos - Solo visible en desktop */}
          <div className="hidden sm:flex flex-shrink-0 items-center">
            <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
              {typeof session.price === 'number' 
                ? session.price.toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })
                : 'Precio no disponible'
              }
            </p>
            {/* Ya no mostramos la disponibilidad en desktop */}
          </div>
        </div>
        {/* Información de disponibilidad - Visible solo en móvil si NO estamos en modo móvil */}
        {!isMobile && (
          <div className="w-full sm:hidden mt-2">
            {renderAvailability()}
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Componente para mostrar un esqueleto de carga para una tarjeta de sesión
 */
export function SessionCardSkeleton() {
  return (
    <div className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 sm:p-4 animate-pulse">
      <div className="flex flex-row sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div className="flex flex-1 justify-between items-start sm:items-center gap-2">
          <div className="min-w-0">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="sm:hidden flex-shrink-0">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="hidden sm:flex flex-shrink-0 items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}
