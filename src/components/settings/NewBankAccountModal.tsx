"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AnimatePresence, motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface BankAccountFormData {
  institution: string
  accountHolder: string
  alias: string
  cbuCvu: string
}

interface NewBankAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function NewBankAccountModal({
  open,
  onOpenChange,
  onConfirm
}: NewBankAccountModalProps) {
  const [formData, setFormData] = useState<BankAccountFormData>({
    institution: "",
    accountHolder: "",
    alias: "",
    cbuCvu: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm()
    onOpenChange(false)
  }

  const handleInputChange = (field: keyof BankAccountFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 50,
              minHeight: '100vh',
              minWidth: '100vw',
              margin: 0,
              padding: 0
            }}
            onClick={() => onOpenChange(false)}
            transition={{ 
              duration: 0.15,
              ease: "easeInOut"
            }}
          />
          <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ 
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: "spring",
                  damping: 25,
                  stiffness: 350,
                  mass: 0.5
                }
              }}
              exit={{ 
                opacity: 0,
                scale: 0.95,
                transition: {
                  duration: 0.15,
                  ease: "easeInOut"
                }
              }}
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 51,
                width: '100%',
                maxWidth: '425px',
                pointerEvents: 'none',
                willChange: 'transform, opacity'
              }}
            >
              <DialogContent 
                className="bg-white border-none shadow-2xl rounded-lg data-[state=open]:animate-none pointer-events-auto"
              >
                <motion.div
                  initial={false}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 1 }}
                  transition={{
                    duration: 0.1
                  }}
                >
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-xl font-semibold">
                      Conectar cuenta bancaria
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                      Ingresa los datos de tu cuenta bancaria o de pago
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-5">
                      <div className="space-y-2.5">
                        <Label htmlFor="institution" className="text-gray-700">
                          Institución bancaria o de pago
                        </Label>
                        <Input
                          id="institution"
                          placeholder="Ej: Banco Santander, Mercado Pago"
                          value={formData.institution}
                          onChange={(e) => handleInputChange('institution', e.target.value)}
                          className="h-10 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2.5">
                        <Label htmlFor="accountHolder" className="text-gray-700">
                          Titular de la cuenta
                        </Label>
                        <Input
                          id="accountHolder"
                          placeholder="Nombre y apellido del titular"
                          value={formData.accountHolder}
                          onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                          className="h-10 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
                          required
                        />
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="alias" className="text-gray-700">
                          Alias
                        </Label>
                        <Input
                          id="alias"
                          placeholder="Ej: padel.club.pagos"
                          value={formData.alias}
                          onChange={(e) => handleInputChange('alias', e.target.value)}
                          className="h-10 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
                          required
                        />
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="cbuCvu" className="text-gray-700">
                          CBU/CVU
                        </Label>
                        <Input
                          id="cbuCvu"
                          placeholder="Ingresa los 22 dígitos"
                          value={formData.cbuCvu}
                          onChange={(e) => handleInputChange('cbuCvu', e.target.value)}
                          className="h-10 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-10 px-4 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="h-10 px-4 bg-black hover:bg-gray-900 text-white"
                      >
                        Confirmar
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </DialogContent>
            </motion.div>
          </Dialog>
        </>
      )}
    </AnimatePresence>
  )
} 