import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { IconCash, IconCreditCard, IconBuildingBank } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { PaymentMethodEnum } from "@/types/bookings"
import { formatCurrencyByCountry } from "@/lib/currency-utils"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number, method: PaymentMethodEnum) => void
  remainingAmount: number
  country?: string | null
}

export function PaymentModal({ isOpen, onClose, onConfirm, remainingAmount, country = null }: PaymentModalProps) {
  const [amount, setAmount] = useState<number>(remainingAmount)
  const [method, setMethod] = useState<PaymentMethodEnum>('cash')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('PaymentModal - Enviando datos:', { amount, method, country })
    onConfirm(amount, method)
    onClose()
  }

  const paymentMethods: { id: PaymentMethodEnum; label: string }[] = [
    { id: 'cash', label: 'Efectivo' },
    { id: 'stripe', label: 'Tarjeta' },
    { id: 'transfer', label: 'Transferencia' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 20 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }}
          className="fixed right-[520px] top-[15%] w-full max-w-md bg-white rounded-lg shadow-lg z-50"
          style={{ transform: 'translateX(-100%)' }}
        >
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Registrar Resto
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Monto a Pagar</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  max={remainingAmount}
                  required
                  placeholder="Ingrese el monto"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "border border-gray-200 bg-white",
                    "focus:outline-none focus:border-gray-300",
                    "transition-colors duration-200",
                    "placeholder:text-gray-400",
                    "text-sm",
                    "[appearance:textfield]",
                    "[&::-webkit-outer-spin-button]:appearance-none",
                    "[&::-webkit-inner-spin-button]:appearance-none"
                  )}
                />
                <p className="text-sm text-gray-500">
                  Monto pendiente: {formatCurrencyByCountry(remainingAmount, country)}
                </p>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMethod(id)}
                      className={cn(
                        "relative h-10 rounded-lg text-sm transition-all duration-200",
                        "border flex items-center justify-center",
                        "w-full px-2",
                        method === id
                          ? [
                              "border-gray-900/10 bg-gray-50",
                              "text-gray-900 font-medium"
                            ]
                          : [
                              "border-gray-200 bg-white hover:border-gray-300",
                              "text-gray-600 hover:text-gray-900",
                              "hover:bg-gray-50/50"
                            ]
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-black hover:bg-gray-800 text-white"
              >
                Confirmar
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}