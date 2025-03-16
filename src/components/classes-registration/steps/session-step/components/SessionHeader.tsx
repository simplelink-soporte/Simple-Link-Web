import React from 'react';
import Image from 'next/image';
import { useClassRegistration } from '../../../context/ClassRegistrationContext';
import { useUserPackages } from '../../../hooks/useUserPackages';
import { ActivePackageInfo } from '../../../shared/ActivePackageInfo';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

interface SessionHeaderProps {
  title: string;
  description: string;
  branchName?: string;
  isLongDescription: boolean;
  showFullDescription: boolean;
  onToggleDescription: () => void;
  onBackClick?: () => void;
  isLoadingAvailability?: boolean;
  sessionsMountedInUI?: boolean;
}

/**
 * Componente para mostrar el encabezado con información de la clase y controles
 * Replica exactamente el diseño del archivo original
 */
export function SessionHeader({
  title,
  description,
  branchName,
  isLongDescription,
  showFullDescription,
  onToggleDescription,
  onBackClick,
  isLoadingAvailability = false,
  sessionsMountedInUI = false
}: SessionHeaderProps) {
  // Contexto y hooks necesarios
  const { state } = useClassRegistration();
  const { activePackage } = useUserPackages();
  const isMobile = useDeviceDetection();
  
  // Comprobar si el paquete es válido para esta clase
  const packagesAreValid = true; // Simplificado para este componente

  return (
    <div className="space-y-6 flex-none">
      {/* Imagen decorativa */}
      <div className="flex justify-start">
        <div className="relative w-24 h-24">
          <Image
            src="/images/Miroodles - Sticker 5.png"
            alt="Decorative sticker"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Encabezado con Pack Activo alineado a la derecha en desktop */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">
            Elige tus sesiones
          </h2>
          <p className="text-sm text-gray-500">
            Selecciona las sesiones a las que deseas asistir
            {isLoadingAvailability && sessionsMountedInUI && (
              <span className="ml-2 text-xs italic flex items-center">
                <div className="w-3 h-3 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-1" />
                verificando disponibilidad...
              </span>
            )}
          </p>
        </div>
        
        {/* Pack activo en desktop - Alineado en la misma fila que el subtítulo */}
        {!isMobile && activePackage && (
          <div className="flex ml-auto">
            <ActivePackageInfo 
              activePackage={activePackage} 
              packagesAreValid={packagesAreValid} 
              branchName={branchName}
              variant="desktop"
            />
          </div>
        )}
      </div>

      {/* Descripción de la clase con la información integrada - Solo en desktop */}
      {!isMobile && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {description}
          </p>
          
          {/* Botón "Ver más" ahora arriba de los datos dinámicos */}
          {isLongDescription && (
            <button
              onClick={onToggleDescription}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showFullDescription ? 'Ver menos' : 'Ver más'}
            </button>
          )}
          
          {/* Información simplificada de la clase */}
          <p className="text-xs text-gray-500 mt-2">
            {title} • {state.selectedClass?.is_recurring ? 'Recurrente' : 'Única'}
            {branchName && ` • ${branchName}`}
          </p>
        </div>
      )}

      {/* Información paquete activo - Solo visible en móvil y alineado a la derecha */}
      {isMobile && activePackage && (
        <div className="flex mb-4 justify-end">
          <ActivePackageInfo 
            activePackage={activePackage} 
            packagesAreValid={packagesAreValid} 
            branchName={branchName}
            variant="mobile"
          />
        </div>
      )}
    </div>
  );
}
