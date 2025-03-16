import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown, ChevronUp, Building } from 'lucide-react';

interface SessionHeaderProps {
  title: string;
  description: string;
  branchName?: string;
  isLongDescription: boolean;
  showFullDescription: boolean;
  onToggleDescription: () => void;
  onBackClick: () => void;
}

/**
 * Componente para mostrar el encabezado con información de la clase y controles
 */
export function SessionHeader({
  title,
  description,
  branchName,
  isLongDescription,
  showFullDescription,
  onToggleDescription,
  onBackClick
}: SessionHeaderProps) {
  // Renderizar el texto correcto para el botón de descripción
  const descriptionToggleText = showFullDescription ? 'Ver menos' : 'Ver más';
  const DescriptionToggleIcon = showFullDescription ? ChevronUp : ChevronDown;

  return (
    <div className="mb-6 space-y-4">
      {/* Botón de regreso y título */}
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2 text-gray-600 hover:text-gray-900" 
          onClick={onBackClick}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Atrás</span>
        </Button>
        <h1 className="text-xl font-semibold flex-1 line-clamp-1">{title}</h1>
      </div>

      {/* Nombre de la sede si está disponible */}
      {branchName && (
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <Building className="h-4 w-4 mr-1" />
          <span>{branchName}</span>
        </div>
      )}

      {/* Descripción con expansión/contracción */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {description}
        </p>
        
        {/* Botón de expandir/contraer sólo si la descripción es larga */}
        {isLongDescription && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-sm text-gray-600 hover:text-gray-900"
            onClick={onToggleDescription}
          >
            {descriptionToggleText}
            <DescriptionToggleIcon className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
