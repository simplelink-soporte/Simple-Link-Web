"use client"

import { motion } from 'framer-motion'
import { IconMoodSad } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.75 }}
      className="w-full max-w-[680px] mx-auto px-6 md:px-8"
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <IconMoodSad className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
        <h1 className="text-2xl font-semibold text-gray-800">
          Página no encontrada
        </h1>
        <p className="text-sm text-gray-500 text-center">
          Lo sentimos, la página que estás buscando no existe o ha sido eliminada.
        </p>
      </div>
    </motion.div>
  )
} 