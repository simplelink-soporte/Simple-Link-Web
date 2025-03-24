"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Componente de enlace simple con estética similar al botón de copiar
export interface AnimatedLinkButtonProps {
  href: string
  children: React.ReactNode
  className?: string
  target?: string
}

export function AnimatedLinkButton({ href, children, className, target = "_blank" }: AnimatedLinkButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      href={href}
      target={target}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Base
        "w-full flex items-center justify-center",
        // Padding y dimensiones
        "px-3 py-2",
        // Colores y bordes
        "bg-gray-50/50 hover:bg-gray-50",
        "rounded-lg border border-gray-200",
        // Texto y espaciado
        "text-sm transition-colors group gap-1.5",
        // Colores de texto
        "text-gray-600 hover:text-gray-800",
        className
      )}
    >
      {children}
    </Link>
  )
}
