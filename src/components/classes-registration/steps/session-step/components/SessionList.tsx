import React, { forwardRef } from 'react';
import { SessionCard, SessionCardSkeleton } from './SessionCard';
import { EmptySessionState } from './EmptySessionState';
import type { ClassSession } from '../../../types/models';

interface SessionListProps {
  sessions: ClassSession[];
  selectedSessions: string[];
  onSessionSelect: (session: ClassSession) => void;
  isLoadingMoreSessions: boolean;
  hasMoreSessions?: boolean;
  isMobile: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
  // Propiedades adicionales para compatibilidad con el código existente
  searchQuery?: string;
  onClearFilter?: () => void;
  onSearchChange?: (value: string) => void;
  hasActiveFilter?: boolean;
}

/**
 * Componente que renderiza la lista de sesiones con soporte para scroll infinito
 * Este componente recibe una referencia para el contenedor del scroll infinito
 */
export const SessionList = forwardRef<HTMLDivElement, SessionListProps>((
  { 
    sessions, 
    selectedSessions, 
    onSessionSelect, 
    isLoadingMoreSessions,
    hasMoreSessions,
    isMobile,
    searchQuery,
    onClearFilter,
    onSearchChange,
    hasActiveFilter
  }, 
  ref
) => {
  // Si no hay sesiones, mostrar estado vacío
  if (!sessions || sessions.length === 0) {
    return <EmptySessionState />;
  }

  return (
    <div 
      id="sessions-container"
      ref={ref}
      className="space-y-4 overflow-y-auto pr-0 sm:pr-2 pb-12 relative flex-1"
      style={{ 
        height: 'auto',
        maxHeight: isMobile ? 'calc(100vh - 230px)' : '450px',
        minHeight: isMobile ? 'calc(100vh - 230px)' : '450px',
        overflowY: 'auto',
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        marginBottom: isMobile ? '0px' : '20px'
      }}
    >
      <div className="space-y-4 pb-10 pt-3">
        {/* Grid responsive para las tarjetas */}
        <div className={`space-y-4`}>
          {/* Renderizar cada sesión como una tarjeta */}
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={selectedSessions.includes(session.id)}
              onSelect={onSessionSelect}
              isMobile={isMobile}
            />
          ))}
          
          {/* Estado de carga para más sesiones */}
          {isLoadingMoreSessions && (
            <>
              {[...Array(isMobile ? 2 : 3)].map((_, index) => (
                <SessionCardSkeleton key={`skeleton-${index}`} />
              ))}
            </>
          )}
        </div>
      </div>
      
      {/* Indicador de carga al final de la lista */}
      {isLoadingMoreSessions && (
        <div className="w-full py-4 flex items-center justify-center text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-2"></div>
          <span>Cargando más sesiones...</span>
        </div>
      )}

      {/* Mensaje cuando no hay más sesiones */}
      {!isLoadingMoreSessions && sessions.length > 0 && !hasMoreSessions && (
        <div className="flex justify-center items-center py-4">
          <span className="text-sm text-gray-500">Has llegado al final de las sesiones disponibles</span>
        </div>
      )}
    </div>
  );
});

// Asignar nombre para mejorar depuración
SessionList.displayName = 'SessionList';
