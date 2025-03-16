import React, { forwardRef } from 'react';
import { SessionCard, SessionCardSkeleton } from './SessionCard';
import { EmptySessionState } from './EmptySessionState';
import type { ClassSession } from '../../../types/models';

interface SessionListProps {
  sessions: ClassSession[];
  selectedSessions: string[];
  onSessionSelect: (session: ClassSession) => void;
  isLoadingMoreSessions: boolean;
  isMobile: boolean;
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
    isMobile 
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
      className="flex-1 overflow-y-auto px-1 pb-4 session-container"
      style={{ 
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div className="space-y-4">
        {/* Título de sección */}
        <h2 className="text-lg font-medium text-gray-900 mb-2 sticky top-0 bg-white z-10 py-2 shadow-sm">
          Sesiones disponibles
        </h2>

        {/* Grid responsive para las tarjetas */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
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
              {[...Array(isMobile ? 2 : 6)].map((_, index) => (
                <SessionCardSkeleton key={`skeleton-${index}`} />
              ))}
            </>
          )}
        </div>
      </div>
      
      {/* Indicador de carga al final de la lista */}
      {isLoadingMoreSessions && (
        <div className="flex justify-center items-center py-4">
          <span className="text-sm text-gray-500">Cargando más sesiones...</span>
        </div>
      )}
    </div>
  );
});

// Asignar nombre para mejorar depuración
SessionList.displayName = 'SessionList';
