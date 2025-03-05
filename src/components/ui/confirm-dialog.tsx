"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IconAlertTriangle } from "@tabler/icons-react"
import { motion } from "framer-motion"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 bg-white overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="pt-6 px-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                variant === 'danger' 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-yellow-50 text-yellow-600'
              }`}>
                <IconAlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-2 pt-1">
                <DialogTitle className="text-xl">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="p-6 bg-gray-50/80 mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 text-gray-700 border-gray-300 hover:bg-white"
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === 'danger' ? 'destructive' : 'default'}
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`flex-1 ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
} 