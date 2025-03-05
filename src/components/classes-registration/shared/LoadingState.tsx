"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
  className?: string
}

export function LoadingState({ 
  message = "Cargando...", 
  fullScreen = true,
  className 
}: LoadingStateProps) {
  return (
    <div className={cn(
      "flex items-center justify-center",
      fullScreen && "min-h-screen bg-white",
      className
    )}>
      <motion.div
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0.7 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className={cn(
          "text-sm text-gray-400",
          "font-light",
          "select-none"
        )}
      >
        {message}
      </motion.div>
    </div>
  )
} 