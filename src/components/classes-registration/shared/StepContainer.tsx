"use client"

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StepContainerProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  stepId?: string
  /**
   * Si el contenido debe centrarse verticalmente
   * @default true
   */
  centered?: boolean
}

/**
 * Contenedor principal para todos los pasos del proceso de registro
 * Proporciona layout, animaciones y scroll cuando es necesario
 */
export function StepContainer({ 
  children, 
  className,
  contentClassName,
  stepId = 'step-container',
  centered = true
}: StepContainerProps) {
  return (
    <motion.div
      key={stepId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        // Layout base
        "w-full",
        // Establecemos una altura fija para que el scroll sea dentro del contenedor
        "h-[calc(100vh-var(--user-badge-height)-var(--navigation-height))]",
        "max-w-[var(--container-default)]",
        // Centrado
        "mx-auto",
        // Habilitamos el scroll en este contenedor específico con scrollbar-none
        // que está bien definida en globals.css
        "overflow-y-auto scrollbar-none",
        // Padding horizontal responsivo
        "px-[var(--padding-container-mobile)]",
        "sm:px-[var(--padding-container-tablet)]",
        "lg:px-[var(--padding-container-desktop)]",
        // Padding inferior para la navegación y superior para el UserBadge
        "pb-20 pt-16", // Ajustados para dar espacio al UserBadge y navegación
        className
      )}
    >
      <div className={cn(
        // Layout del contenido
        "w-full h-full",
        "flex flex-col",
        // Centrado condicional
        centered ? "justify-center" : "justify-start",
        // Espaciado usando variables CSS
        "gap-[var(--gap-medium)]",
        contentClassName
      )}>
        {children}
      </div>
    </motion.div>
  )
} 