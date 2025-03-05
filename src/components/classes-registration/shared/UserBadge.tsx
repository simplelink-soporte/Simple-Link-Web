"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconUser, IconLogout, IconLoader2, IconExternalLink } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useClassRegistrationAuth } from '../hooks/useAuth'
import { MobileDrawer } from './MobileDrawer'
import { toast } from 'sonner'

export function UserBadge() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, signOut, isLoading: authLoading } = useClassRegistrationAuth()

  const handleLogout = useCallback(async () => {
    if (isLoading) return
    try {
      setIsLoading(true)
      setIsOpen(false)
      setIsMobileDrawerOpen(false)
      await signOut()
      toast.success('Sesión cerrada correctamente')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      toast.error('Error al cerrar sesión')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, signOut])

  const handleBadgeClick = useCallback(() => {
    // En móvil, abrimos el drawer
    if (window.innerWidth < 640) {
      setIsMobileDrawerOpen(true)
      return
    }
    // En desktop, mostramos el dropdown
    setIsOpen(!isOpen)
  }, [])

  if (authLoading || !user) return null

  return (
    <>
      {/* Badge y Dropdown */}
      <div className="absolute top-6 right-6 z-[60]">
        <motion.button
          onClick={handleBadgeClick}
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg",
            "bg-white/80 backdrop-blur-sm",
            "text-sm text-gray-700",
            "hover:bg-white",
            "transition-all duration-200",
            "shadow-sm border border-gray-200/50",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          disabled={isLoading}
        >
          <IconUser className="w-4 h-4 text-gray-500" />
          <span className="text-sm">{user.name?.split(' ')[0] || 'Usuario'}</span>
        </motion.button>

        {/* Desktop dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute top-full right-0 mt-1",
                "w-48 py-1 rounded-lg",
                "bg-white/90 backdrop-blur-sm",
                "border border-gray-200/50",
                "shadow-lg",
                "hidden sm:block" // Ocultar en móvil
              )}
            >
              {/* Email del usuario */}
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>

              {/* Botón de cerrar sesión */}
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2",
                  "text-xs text-gray-600 hover:text-gray-900",
                  "hover:bg-gray-50",
                  "transition-colors duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <IconLogout className="w-3.5 h-3.5" />
                )}
                <span>{isLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile drawer */}
      <div className="sm:hidden">
        <MobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          imageUrl="/images/Miroodles - Sticker 4.png"
        >
          <div className="space-y-8">
            {/* Marca */}
            <div className="text-left">
              <h2 className="text-xl font-light text-gray-900">
                SimpleLink
              </h2>
            </div>

            {/* Información del usuario */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {user.name || 'Usuario'}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {user.email}
                </p>
              </div>

              {/* Botón de cerrar sesión */}
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "px-4 py-3 rounded-xl",
                  "bg-gray-900 text-white",
                  "text-sm font-medium",
                  "transition-all duration-200",
                  "hover:bg-gray-800",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <IconLogout className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
              </button>
            </div>

            {/* Sección de promoción */}
            <div className="pt-6 border-t border-gray-100">
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-left">
                  ¿Te gustaría tener tu sistema SimpleLink en tu empresa?
                </p>
                <div className="flex justify-start">
                  <a
                    href="https://simplelink-landing-navy.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2",
                      "px-3 py-2 rounded-lg",
                      "bg-gray-50 hover:bg-gray-100",
                      "text-sm text-gray-900",
                      "transition-colors duration-200",
                      "border border-gray-200"
                    )}
                  >
                    <span>Conocer más</span>
                    <IconExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </MobileDrawer>
      </div>
    </>
  )
} 