"use client"

import { motion, AnimatePresence } from "framer-motion"

export default function UpgradeLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {/* Overlay con fondo semi-transparente */}
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/20 backdrop-blur-sm"
        />
        
        {/* Contenedor del popup */}
        <motion.div
          key="popup"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 100,
              damping: 15,
              mass: 1
            }
          }}
          exit={{ 
            opacity: 0, 
            y: -20,
            scale: 0.95,
            transition: {
              type: "spring",
              stiffness: 100,
              damping: 15,
              mass: 1
            }
          }}
          className="relative w-full max-w-[1100px] mx-4"
        >
          <div className="bg-white rounded-xl border shadow-lg overflow-hidden">
            <div className="h-[90vh]">
              {children}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
} 