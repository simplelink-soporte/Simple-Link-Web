"use client"

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'
import type { UserPackageFromDB } from '../types/models'
import { useEffect, useState } from 'react'

interface PackageTooltipProps {
  activePackage: UserPackageFromDB
  isValid: boolean
  branchName?: string
  position: {
    top: number
    left: number
  }
}

/**
 * Componente de tooltip para la información detallada del paquete
 * Se renderiza en un portal para evitar problemas de z-index
 */
export function PackageTooltip({
  activePackage,
  isValid,
  branchName,
  position
}: PackageTooltipProps) {
  if (typeof document === 'undefined') return null
  
  // Estado para la posición ajustada del tooltip
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Ajustar la posición del tooltip para que no se salga de la pantalla
  useEffect(() => {
    // Ancho del tooltip
    const tooltipWidth = 256; // w-64 = 16rem = 256px
    
    // Calcular los límites de la ventana
    const windowWidth = window.innerWidth;
    
    // Asegurarse de que el tooltip no se salga por la izquierda o derecha
    let adjustedLeft = position.left;
    
    // Si está muy a la izquierda
    if (position.left - (tooltipWidth / 2) < 20) {
      adjustedLeft = tooltipWidth / 2 + 20;
    }
    
    // Si está muy a la derecha
    if (position.left + (tooltipWidth / 2) > windowWidth - 20) {
      adjustedLeft = windowWidth - (tooltipWidth / 2) - 20;
    }
    
    setAdjustedPosition({
      top: position.top,
      left: adjustedLeft
    });
  }, [position]);
  
  return createPortal(
    <div 
      className={cn(
        "fixed z-[9999]",
        "w-64 p-3 rounded-lg shadow-lg border",
        "text-sm",
        isValid ? "bg-white border-blue-200" : "bg-white border-yellow-200"
      )}
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
        transform: 'translate(-50%, -100%)',
        animation: 'tooltipFadeIn 0.2s ease-in-out forwards'
      }}
    >
      {/* Contenido del tooltip */}
      <div className={cn("space-y-2", isValid ? "text-blue-800" : "text-yellow-800")}>
        <p className="font-medium">{activePackage.package?.name}</p>
        
        {isValid ? (
          <>
            <div className="flex items-center space-x-1">
              {/* Icono de verificación */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-green-600">Pack válido para esta clase</p>
            </div>
            <p className="text-xs text-blue-600">
              Válido hasta {format(new Date(activePackage.expires_at), 'd MMMM yyyy', { locale: es })}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-1">
              {/* Icono de advertencia */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-yellow-700">
                Este pack no es válido para esta clase
              </p>
            </div>
            {/* Mostrar información de sede si está disponible */}
            <p className="text-xs text-yellow-600">
              Sede requerida: {branchName || 'No disponible'}
            </p>
          </>
        )}
      </div>
      
      {/* Flecha del tooltip */}
      <div className={cn(
        "absolute left-1/2 top-full -translate-x-1/2 -mt-[0.4rem]", 
        "w-3 h-3 rotate-45", 
        isValid ? "bg-white border-r border-b border-blue-200" : "bg-white border-r border-b border-yellow-200"
      )}></div>
    </div>,
    document.body
  )
}
