"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"

// Componente Provider que debe envolver toda la aplicación o sección donde se usarán los tooltips
const CustomTooltipProvider = TooltipPrimitive.Provider

// Componente root del tooltip
const CustomTooltip = TooltipPrimitive.Root

// Componente trigger que envuelve el elemento que activará el tooltip
const CustomTooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ ...props }, ref) => (
  <TooltipPrimitive.Trigger ref={ref} {...props} />
))
CustomTooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

// Componente de contenido del tooltip con portal
const CustomTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  // Estado para detectar si estamos en el cliente
  const [isMounted, setIsMounted] = React.useState(false)
  
  // Efecto para actualizar el estado cuando el componente se monta
  React.useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])
  
  // Contenido del tooltip
  const content = (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // Estilos base
        "z-[99999] overflow-hidden rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700",
        "shadow-md border border-gray-100",
        // Animaciones
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  )
  
  // Si estamos en el cliente, usar portal para renderizar fuera del flujo normal
  if (isMounted && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }
  
  // Fallback cuando estamos en el servidor o el componente no está montado
  return null
})
CustomTooltipContent.displayName = TooltipPrimitive.Content.displayName

export { 
  CustomTooltip, 
  CustomTooltipTrigger, 
  CustomTooltipContent, 
  CustomTooltipProvider 
} 