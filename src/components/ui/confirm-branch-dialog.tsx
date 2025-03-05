import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useRef } from "react"
import type { Branch } from "@/types/branch"
import { createPortal } from "react-dom"

interface ConfirmBranchDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  currentBranch: Branch | null
  newBranch: Branch | null
  position?: { x: number; y: number }
}

export function ConfirmBranchDialog({
  isOpen,
  onClose,
  onConfirm,
  currentBranch,
  newBranch,
  position = { x: 280, y: 0 },
}: ConfirmBranchDialogProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!newBranch || typeof window === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.95, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: -20 }}
          transition={{ duration: 0.15 }}
          className="fixed bg-white rounded-lg shadow-lg border w-[280px]"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 99999,
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
          }}
        >
          <div 
            className="relative backdrop-blur-sm bg-white/95 rounded-lg overflow-hidden"
            style={{ isolation: 'isolate' }}
          >
            <div 
              className="absolute w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45"
              style={{
                left: '-5px',
                top: '20px',
                zIndex: 2,
                boxShadow: '-2px -2px 3px rgba(0, 0, 0, 0.02)'
              }}
            />
            
            <div className="p-4 space-y-3">
              <div className="relative" style={{ zIndex: 3 }}>
                <h3 className="text-sm font-medium">Cambiar de Sede</h3>
                <p className="text-xs text-gray-500 mt-1">
                  ¿Cambiar de{" "}
                  <span className="font-medium text-gray-700">
                    {currentBranch?.name || "sede actual"}
                  </span>{" "}
                  a{" "}
                  <span className="font-medium text-gray-700">
                    {newBranch.name}
                  </span>
                  ?
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onConfirm()
                  }}
                  className="px-3 py-1.5 text-xs bg-black text-white hover:bg-gray-800 rounded-md transition-all duration-200"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
} 