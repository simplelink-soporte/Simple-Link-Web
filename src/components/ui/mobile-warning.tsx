"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  if (!mounted) return null

  return (
    <AnimatePresence>
      {isMobile && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={cn(
              "relative w-full max-w-[300px]",
              "bg-white rounded-xl px-5 py-4",
              "shadow-2xl",
              "flex flex-col items-center",
              "mx-auto"
            )}
          >
            <div className="w-12 h-12 mb-3 bg-yellow-50 rounded-full flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-yellow-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Versión de Escritorio Requerida
            </h3>
            
            <p className="text-sm text-gray-600 text-center max-w-[260px] mb-1.5">
              Lo sentimos, pero el panel administrativo solo está disponible para dispositivos de escritorio.
            </p>
            
            <p className="text-xs text-gray-500 text-center">
              Por favor, accede desde una computadora para una mejor experiencia.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
} 