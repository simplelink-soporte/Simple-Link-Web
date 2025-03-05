import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  showOverlay?: boolean
  overlayClassName?: string
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className,
  showOverlay = true,
  overlayClassName
}: ModalProps) {
  if (!isOpen) return null

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Overlay */}
          {showOverlay && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className={cn(
                "fixed inset-0 bg-black/10 z-40",
                overlayClassName
              )}
            />
          )}

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: "100%", 
              opacity: 0,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            className={cn(
              "fixed inset-y-2 right-2 w-[500px] bg-white rounded-2xl border z-50 overflow-hidden",
              className
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
} 