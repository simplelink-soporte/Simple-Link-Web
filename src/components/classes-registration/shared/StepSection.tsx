"use client"

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StepHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

interface StepSectionProps {
  children: ReactNode
  className?: string
  /**
   * Si la sección debe tener un fondo y borde
   * @default true
   */
  bordered?: boolean
  /**
   * Si la sección debe tener padding
   * @default true
   */
  padded?: boolean
}

interface StepGridProps {
  children: ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
}

interface StepActionsProps {
  children: ReactNode
  className?: string
  /**
   * Si los botones deben estar alineados a la derecha
   * @default false
   */
  alignRight?: boolean
}

/**
 * Encabezado del paso con título y subtítulo opcional
 */
export function StepHeader({ title, subtitle, className }: StepHeaderProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <h2 className="text-xl font-semibold text-gray-900">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-gray-600">
          {subtitle}
        </p>
      )}
    </div>
  )
}

/**
 * Sección del paso con espaciado y estilo consistentes
 * Usar solo cuando se necesite un contenedor con borde y fondo
 */
export function StepSection({ 
  children, 
  className,
  bordered = true,
  padded = true 
}: StepSectionProps) {
  return (
    <section className={cn(
      "w-full",
      // Padding condicional
      padded && [
        "p-[var(--padding-section-mobile)]",
        "sm:p-[var(--padding-section-tablet)]"
      ],
      // Borde y fondo condicionales
      bordered && [
        "rounded-[var(--radius-lg)]",
        "border border-gray-200",
        "bg-white"
      ],
      className
    )}>
      {children}
    </section>
  )
}

/**
 * Grid responsivo para elementos del paso
 */
export function StepGrid({ children, className, columns = 1 }: StepGridProps) {
  return (
    <div className={cn(
      "w-full",
      "grid gap-4",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Contenedor para los botones de acción del paso
 */
export function StepActions({ children, className, alignRight = false }: StepActionsProps) {
  return (
    <div className={cn(
      "flex flex-col-reverse sm:flex-row items-center",
      alignRight ? "justify-end" : "justify-between",
      "gap-[var(--gap-medium)]",
      "mt-[var(--gap-medium)]",
      className
    )}>
      {children}
    </div>
  )
} 