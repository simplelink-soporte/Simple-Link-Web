import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { IconArrowLeft, IconCash, IconCreditCard, IconReceipt, IconLoader2 } from "@tabler/icons-react"
import type { PaymentMethodEnum, PaymentStatusEnum } from "@/types/bookings"

interface PaymentDetailsStepProps {
  onConfirm: (paymentDetails: {
    paymentMethod: PaymentMethodEnum
    paymentStatus: PaymentStatusEnum
    depositAmount?: number
    generateInvoice?: boolean
  }) => void
  onBack: () => void
  sessionPrice?: number
  isLoading?: boolean
  initialPaymentMethod?: PaymentMethodEnum
  initialPaymentStatus?: PaymentStatusEnum
  initialDepositAmount?: number
  initialGenerateInvoice?: boolean
}

export function PaymentDetailsStep({
  onConfirm,
  onBack,
  sessionPrice = 0,
  isLoading = false,
  initialPaymentMethod = "cash",
  initialPaymentStatus = "completed",
  initialDepositAmount = 0,
  initialGenerateInvoice = true
}: PaymentDetailsStepProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodEnum>(initialPaymentMethod)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusEnum>(initialPaymentStatus)
  const [depositAmount, setDepositAmount] = useState<number>(initialDepositAmount)
  const [showDepositField, setShowDepositField] = useState(initialPaymentStatus === "partial")
  const [generateInvoice, setGenerateInvoice] = useState<boolean>(initialGenerateInvoice)

  const handleConfirm = () => {
    if (isLoading) return;
    
    onConfirm({
      paymentMethod,
      paymentStatus,
      depositAmount: showDepositField ? depositAmount : undefined,
      generateInvoice
    })
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-gray-900">
          Detalles de pago
        </h3>
        <p className="text-xs text-gray-500">
          Configura el pago para esta reserva
        </p>
      </div>

      {/* Información del precio */}
      <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Precio total:</span>
          <span className="text-sm font-medium text-gray-900">
            ${sessionPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Método de pago */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">
          Método de pago
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setPaymentMethod("cash")}
            className={cn(
              "flex flex-col items-center justify-center",
              "rounded-md border p-2",
              "text-xs transition-colors duration-200",
              paymentMethod === "cash"
                ? "border-gray-300 bg-gray-50 text-gray-900"
                : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <IconCash size={16} />
            <span className="mt-1">Efectivo</span>
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setPaymentMethod("card")}
            className={cn(
              "flex flex-col items-center justify-center",
              "rounded-md border p-2",
              "text-xs transition-colors duration-200",
              paymentMethod === "card"
                ? "border-gray-300 bg-gray-50 text-gray-900"
                : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <IconCreditCard size={16} />
            <span className="mt-1">Tarjeta</span>
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setPaymentMethod("transfer")}
            className={cn(
              "flex flex-col items-center justify-center",
              "rounded-md border p-2",
              "text-xs transition-colors duration-200",
              paymentMethod === "transfer"
                ? "border-gray-300 bg-gray-50 text-gray-900"
                : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <IconReceipt size={16} />
            <span className="mt-1">Transferencia</span>
          </button>
        </div>
      </div>

      {/* Estado del pago */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">
          Estado del pago
        </label>
        <div className="flex space-x-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setPaymentStatus("completed")
              setShowDepositField(false)
            }}
            className={cn(
              "flex-1 rounded-md border px-3 py-1.5",
              "text-xs transition-colors duration-200",
              paymentStatus === "completed"
                ? "border-gray-300 bg-gray-50 text-gray-900"
                : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            Pagado
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setPaymentStatus("partial")
              setShowDepositField(true)
            }}
            className={cn(
              "flex-1 rounded-md border px-3 py-1.5",
              "text-xs transition-colors duration-200",
              paymentStatus === "partial"
                ? "border-gray-300 bg-gray-50 text-gray-900"
                : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            Parcial
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setPaymentStatus("pending")
              setShowDepositField(false)
            }}
            className={cn(
              "flex-1 rounded-md border px-3 py-1.5",
              "text-xs transition-colors duration-200",
              paymentStatus === "pending"
                ? "border-gray-300 bg-gray-50 text-gray-900"
                : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            Pendiente
          </button>
        </div>
      </div>

      {/* Campo de depósito (condicional) */}
      {showDepositField && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          <label htmlFor="deposit" className="text-xs font-medium text-gray-700">
            Monto de depósito
          </label>
          <input
            id="deposit"
            type="number"
            min="0"
            max={sessionPrice}
            value={depositAmount}
            disabled={isLoading}
            onChange={(e) => setDepositAmount(Math.max(0, Math.min(sessionPrice, Number(e.target.value))))}
            className={cn(
              "w-full rounded-md border border-gray-200 px-3 py-1.5",
              "text-xs text-gray-900",
              "focus:border-gray-300 focus:outline-none focus:ring-0",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          />
          <p className="text-xs text-gray-500">
            Restante: ${(sessionPrice - depositAmount).toFixed(2)}
          </p>
        </motion.div>
      )}

      {/* Generar factura */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">
          Generar factura
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={generateInvoice}
            disabled={isLoading}
            onChange={(e) => setGenerateInvoice(e.target.checked)}
            className={cn(
              "rounded border-gray-200",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          />
          <span className="text-xs text-gray-500">
            Marque esta opción para generar una factura
          </span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-1.5",
            "text-xs font-medium text-gray-500",
            "px-3 py-1.5 rounded-md",
            "hover:bg-gray-50",
            "transition-colors duration-200",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <IconArrowLeft size={14} />
          Volver
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-1.5",
            "text-xs font-medium text-gray-900",
            "px-3 py-1.5 rounded-md",
            "bg-gray-100 hover:bg-gray-200",
            "transition-colors duration-200",
            isLoading && "opacity-80 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <IconLoader2 size={14} className="animate-spin" />
              Procesando...
            </>
          ) : (
            "Confirmar"
          )}
        </button>
      </div>
    </div>
  )
} 