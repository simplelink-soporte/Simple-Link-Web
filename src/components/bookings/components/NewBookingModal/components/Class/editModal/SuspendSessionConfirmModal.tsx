import { useState } from "react"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { IconAlertTriangle, IconCalendarOff } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SuspendSessionConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  sessionTime: string
  sessionDate?: string
  className?: string
}

export function SuspendSessionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  sessionTime,
  sessionDate,
  className
}: SuspendSessionConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  // Función para manejar la confirmación
  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
      // El componente padre manejará el cierre del modal
    } catch (error) {
      console.error('Error al suspender la sesión:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent 
        className={cn(
          "sm:max-w-[450px] border-gray-200 shadow-2xl border-l-4 border-l-amber-400", 
          className
        )}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <IconAlertTriangle size={22} className="flex-shrink-0" strokeWidth={2} />
            <AlertDialogTitle className="text-amber-600 text-xl">
              Suspender sesión
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-700 text-base">
            Estás a punto de suspender la sesión programada para{' '}
            <span className="font-semibold text-amber-600">{sessionTime}</span>
            {sessionDate && <span className="font-semibold text-amber-600"> el día {sessionDate}</span>}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-5 bg-amber-50 p-4 rounded-md border border-amber-100 transition-all duration-200 hover:bg-amber-100/50">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-amber-500">
              <IconCalendarOff size={20} strokeWidth={1.5} className="flex-shrink-0" />
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="text-amber-700 font-medium">
                Consecuencias de suspender esta sesión
              </p>
              <ul className="text-amber-600 text-xs list-disc pl-4 space-y-1 leading-relaxed">
                <li>La sesión quedará marcada como suspendida en el sistema</li>
                <li>No aparecerá como disponible para nuevas reservas</li>
                <li>Las reservas existentes para esta sesión serán <strong>canceladas automáticamente</strong></li>
                <li>Se actualizará el estado de pago de las reservas a 'cancelado'</li>
                <li>Esta acción no se puede deshacer</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="mt-6 gap-3">
          <AlertDialogCancel 
            onClick={onClose}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800 border-gray-200 rounded-md transition-colors"
            disabled={isProcessing}
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            variant="destructive"
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors flex items-center gap-1.5"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <IconCalendarOff size={16} className="inline-block" />
                Suspender sesión
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 