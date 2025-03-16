"use client"

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { UserPackageFromDB } from '../types/models'
import { useState, useEffect, useRef } from 'react'
import { PackageTooltip } from './PackageTooltip'

interface ActivePackageInfoProps {
  activePackage: UserPackageFromDB
  packagesAreValid: boolean | null | undefined
  branchName?: string
  variant?: 'desktop' | 'mobile'
  className?: string
}

/**
 * Componente que muestra información sobre el paquete activo del usuario
 * Muestra versión compacta con tooltip en todas las variantes
 */
export function ActivePackageInfo({
  activePackage,
  packagesAreValid,
  branchName,
  variant = 'desktop',
  className
}: ActivePackageInfoProps) {
  // Asegurar que packagesAreValid sea un booleano
  const isValid = !!packagesAreValid
  
  // Estado para controlar la visibilidad del tooltip
  const [showTooltip, setShowTooltip] = useState(false)
  // Referencia al elemento contenedor para posicionar el tooltip
  const containerRef = useRef<HTMLDivElement>(null)
  // Estado para almacenar la posición del tooltip
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

  // Calcular la posición del tooltip cuando se muestra
  useEffect(() => {
    if (showTooltip && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPosition({
        top: rect.top - 10, // Posicionar 10px arriba del contenedor
        left: rect.left + rect.width / 2
      })
    }
  }, [showTooltip])

  // Agregar estilos de animación cuando el componente se monta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Verificar si el estilo ya existe para evitar duplicados
      if (!document.getElementById('tooltip-animation-style')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'tooltip-animation-style';
        styleEl.textContent = `
          @keyframes tooltipFadeIn {
            from { opacity: 0; transform: translate(-50%, -90%); }
            to { opacity: 1; transform: translate(-50%, -100%); }
          }
        `;
        document.head.appendChild(styleEl);
      }
    }
    // Limpiar el estilo cuando el componente se desmonta
    return () => {
      if (typeof window !== 'undefined') {
        const styleEl = document.getElementById('tooltip-animation-style');
        if (styleEl && !document.querySelectorAll('[data-tooltip-active="true"]').length) {
          styleEl.remove();
        }
      }
    };
  }, []);
  
  // Versión compacta con tooltip para todas las variantes (desktop y mobile)
  return (
    <div 
      ref={containerRef}
      className={cn(
        "rounded-xl px-3 py-2", // Reducido padding para eliminar espacio extra
        isValid ? "bg-blue-50" : "bg-yellow-50", // Fondos puros sin transparencias
        "flex-shrink-0 relative cursor-help",
        "inline-block", // Cambiado a inline-block para ajustar al contenido exacto
        "whitespace-nowrap", // Evitar saltos de línea
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(true)}
      onTouchEnd={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      data-tooltip-active={showTooltip ? "true" : "false"}
    >
      <div className="flex items-center justify-center">
        <h3 className={cn(
          "text-sm font-medium",
          isValid ? "text-blue-800" : "text-yellow-800"
        )}>
          Pack Activo
        </h3>
      </div>
      
      {isValid && (
        <p className="text-xs text-blue-500 mt-1 text-center">
          Válido hasta {format(new Date(activePackage.expires_at), 'd MMM', { locale: es })}
        </p>
      )}
      
      {/* Renderizar tooltip */}
      {showTooltip && (
        <PackageTooltip 
          activePackage={activePackage}
          isValid={isValid}
          branchName={branchName}
          position={tooltipPosition}
        />
      )}
    </div>
  )
}
