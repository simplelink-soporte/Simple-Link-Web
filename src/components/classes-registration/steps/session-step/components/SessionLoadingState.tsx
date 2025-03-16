import React from 'react';
import { Loader2 } from 'lucide-react';

interface SessionLoadingStateProps {
  message?: string;
  className?: string;
}

/**
 * Componente que muestra un estado de carga para las sesiones
 */
export function SessionLoadingState({ 
  message = 'Cargando sesiones...', 
  className = '' 
}: SessionLoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center h-full ${className}`}>
      <div className="flex items-center justify-center mb-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <h3 className="text-base font-medium text-gray-700 mb-1">
        {message}
      </h3>
      <p className="text-sm text-gray-500">
        Esto puede tomar unos segundos.
      </p>
    </div>
  );
}
