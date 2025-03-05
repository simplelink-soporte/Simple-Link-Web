"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { IconAlertTriangle } from "@tabler/icons-react"
import { Button } from "./button"

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  position: { x: number; y: number }
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  position
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed bg-white rounded-lg shadow-lg overflow-hidden z-[9999] border"
          style={{
            width: '320px',
            top: position.y,
            left: position.x
          }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <IconAlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                {cancelText}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 