"use client"

import { useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MobileDrawerProps {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string
  className?: string
  /**
   * URL de la imagen que se mostrará junto al título
   * @default '/images/Miroodles - Sticker.png'
   */
  imageUrl?: string
  /**
   * Contenido que se mostrará fijo en la parte inferior del drawer
   */
  footer?: ReactNode
}

export function MobileDrawer({
  children,
  isOpen,
  onClose,
  title,
  className,
  imageUrl = '/images/Miroodles - Sticker.png',
  footer
}: MobileDrawerProps) {
  // Prevenir scroll cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              "fixed inset-0 z-50",
              "bg-white/20 backdrop-blur-sm"
            )}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              // Posicionamiento
              "fixed bottom-0 left-0 right-0",
              "z-50",
              // Tamaño
              "h-[70vh]",
              // Estilos
              "bg-white",
              "rounded-t-2xl",
              "shadow-lg",
              "border border-gray-200",
              // Estructura para contenido + footer
              "flex flex-col",
              className
            )}
          >
            {/* Contenido principal con scroll */}
            <div className={cn(
              "flex-1",
              "overflow-y-auto scrollbar-none",
              "p-6 pb-4" // Reducimos el padding bottom para que no haya mucho espacio antes del footer
            )}>
              {/* Header */}
              <div className="flex flex-col items-left gap-3 mb-6">
                {imageUrl && (
                  <div className="relative w-16 h-16">
                    <Image
                      src={imageUrl}
                      alt="Drawer icon"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                )}
                {title && (
                  <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h3>
                )}
              </div>

              {/* Contenido */}
              <div>
                {children}
              </div>
            </div>

            {/* Footer fijo */}
            {footer && (
              <div className={cn(
                "flex-shrink-0",
                "p-4 pt-2", // Padding en los lados y abajo, pero reducido arriba
                "bg-white" // Aseguramos que el fondo sea blanco para que no se vea el contenido debajo
              )}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}