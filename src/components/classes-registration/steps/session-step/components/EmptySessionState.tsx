import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * Componente que muestra un estado cuando no hay sesiones disponibles
 */
export function EmptySessionState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="bg-gray-50 p-8 rounded-xl w-full max-w-lg mx-auto">
        <div className="flex justify-center mb-4">
          <Calendar className="h-16 w-16 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay sesiones disponibles
        </h3>
        <p className="text-gray-500 text-sm">
          No se encontraron sesiones disponibles para esta clase. 
          Por favor, intenta seleccionar otra clase o contacta a soporte si crees que esto es un error.
        </p>
      </div>
    </div>
  );
}
