import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
 */
export function SessionCard({ 
  session, 
  isSelected, 
  onSelect, 
  isMobile = false 
}: SessionCardProps) {
  // Formatear la fecha para mostrarla en un formato legible
  const formattedDate = formatSessionDate(session.date);
  
  // Verificar si la sesión está disponible
  const isAvailable = isSessionAvailable(session);
  
  // Función para manejar el clic en la tarjeta
  const handleClick = () => {
    if (isAvailable) {
      onSelect(session);
    }
  };

  // Determinar las clases CSS basadas en los estados
  const cardClasses = cn(
    'border rounded-lg p-4 transition-all relative flex flex-col',
    'hover:shadow-md cursor-pointer',
    {
      'border-primary bg-primary/5': isSelected,
      'border-gray-200': !isSelected,
      'opacity-50 hover:shadow-none cursor-not-allowed': !isAvailable,
      'h-full': true
    }
  );

  // Renderizar la tarjeta
  return (
    <div 
      className={cardClasses} 
      onClick={handleClick}
      aria-disabled={!isAvailable}
    >
      {/* Indicador de selección */}
      {isSelected && (
        <div className="absolute -right-1 -top-1 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Fecha */}
      <div className="flex items-center mb-2">
        <Calendar className="h-4 w-4 mr-2 text-gray-600" />
        <div className="text-sm">
          <span className="font-medium">{formattedDate.dayName}</span>
          <span className="text-gray-600 ml-1">
            {formattedDate.dayNumber} {formattedDate.monthName}
          </span>
        </div>
      </div>

      {/* Hora */}
      <div className="flex items-center mb-3">
        <Clock className="h-4 w-4 mr-2 text-gray-600" />
        <span className="text-sm text-gray-700">
          {session.startTime} - {session.endTime}
        </span>
      </div>

      {/* Estado de disponibilidad */}
      <div className="mt-auto">
        {session.spotsLeft === null || session.spotsLeft === undefined ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <Badge 
            variant={isAvailable ? 'outline' : 'destructive'} 
            className={cn(
              'font-normal text-xs',
              isAvailable ? 'bg-green-50 text-green-700 hover:bg-green-50' : ''
            )}
          >
            {isAvailable 
              ? `${session.spotsLeft} plazas disponibles` 
              : 'No disponible'}
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Componente para estados de carga de la tarjeta de sesión
 */
export function SessionCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="flex items-center mb-2">
        <Skeleton className="h-4 w-4 mr-2 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center mb-3">
        <Skeleton className="h-4 w-4 mr-2 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-4 w-20 mt-auto" />
    </div>
  );
}
