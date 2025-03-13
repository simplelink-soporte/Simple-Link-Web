import { useState } from 'react'
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
import { IconAlertTriangle, IconCalendarEvent, IconTrash, IconCalendar } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { BookingSummary } from '@/services/classCheckService'

interface DeleteClassWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmDelete: () => Promise<void>
  bookingSummary: BookingSummary
  className?: string
}

export function DeleteClassWarningModal({
  isOpen,
  onClose,
  onConfirmDelete,
  bookingSummary,
  className
}: DeleteClassWarningModalProps) {
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning')
  const [isDeleting, setIsDeleting] = useState(false)

  // Formatter para las fechas en español
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
  };

  // Función para manejar el proceso de eliminación
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onConfirmDelete()
      // No cerramos el modal aquí, ya que el componente padre lo hará
    } catch (error) {
      console.error('Error al eliminar la clase:', error)
    } finally {
      setIsDeleting(false)
      // Reiniciamos el paso para futuras interacciones
      setStep('warning')
    }
  }

  // Función para reiniciar el estado al cerrar
  const handleClose = () => {
    setStep('warning')
    onClose()
  }

  // Obtenemos la cantidad de reservas para mostrar
  const bookingCount = bookingSummary.count || 0;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent 
        className={cn(
          "sm:max-w-[450px] border-gray-200 shadow-2xl", 
          step === 'warning' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-red-500',
          className
        )}
      >
        {step === 'warning' ? (
          // Primer paso: Advertencia informativa
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <IconAlertTriangle size={22} className="flex-shrink-0" strokeWidth={2} />
                <AlertDialogTitle className="text-amber-600 text-xl">
                  Reservas activas detectadas
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-gray-700 text-base">
                Esta clase tiene <span className="font-semibold text-amber-600">{bookingCount}</span> {bookingCount === 1 ? 'reserva activa' : 'reservas activas'} para fechas futuras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="my-5 bg-amber-50 p-4 rounded-md border border-amber-100 transition-all duration-200 hover:bg-amber-100/50">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-amber-500">
                  <IconCalendarEvent size={20} strokeWidth={1.5} className="flex-shrink-0" />
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-amber-700 font-medium">
                    Información importante
                  </p>
                  <p className="text-amber-600 text-xs leading-relaxed">
                    Si eliminas esta clase, todas las reservas futuras asociadas a ella 
                    serán <span className="font-semibold">automáticamente canceladas</span>. 
                    Esto cambiará su estado de pago a 'cancelado' y ya no aparecerán como reservas activas en el sistema.
                    Considera archivar la clase en lugar de eliminarla si deseas mantener las reservas activas.
                  </p>
                  
                  {/* Fechas con reservas (si hay información disponible) */}
                  {bookingSummary.reservationDates && bookingSummary.reservationDates.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-amber-200/50">
                      <p className="text-amber-700 font-medium text-xs mb-1.5">
                        Fechas con reservas:
                      </p>
                      <ul className="space-y-1">
                        {bookingSummary.reservationDates.map((date, index) => (
                          <li key={index} className="flex items-center gap-1.5 text-amber-600 text-xs">
                            <IconCalendar size={12} className="flex-shrink-0" />
                            {formatDate(date)}
                          </li>
                        ))}
                        {bookingSummary.uniqueDates && bookingSummary.uniqueDates > 5 && (
                          <li className="text-amber-600 text-xs italic">
                            Y {bookingSummary.uniqueDates - 5} fechas más...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <AlertDialogFooter className="mt-6 gap-3">
              <AlertDialogCancel 
                onClick={handleClose}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800 border-gray-200 rounded-md transition-colors"
              >
                Cancelar
              </AlertDialogCancel>
              <Button
                onClick={() => setStep('confirmation')}
                variant="default"
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
              >
                Entiendo, continuar
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          // Segundo paso: Confirmación de eliminación
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <IconTrash size={22} className="flex-shrink-0" strokeWidth={2} />
                <AlertDialogTitle className="text-red-600 text-xl">
                  Confirmar eliminación
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-gray-700 text-base">
                Al eliminar esta clase, <span className="font-semibold text-red-600">todas las reservas futuras ({bookingCount})</span> serán canceladas automáticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="my-5 bg-red-50 p-4 rounded-md border border-red-100 transition-all duration-200 hover:bg-red-100/50">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-red-500">
                  <IconAlertTriangle size={20} strokeWidth={1.5} className="flex-shrink-0" />
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-red-700 font-medium">
                    Advertencia
                  </p>
                  <p className="text-red-600 text-xs leading-relaxed">
                    Esta acción no se puede deshacer. Al proceder:
                  </p>
                  <ul className="text-red-600 text-xs list-disc pl-4 space-y-1 leading-relaxed">
                    <li>Se eliminará la clase permanentemente</li>
                    <li>Se cancelarán todas las reservas futuras asociadas (se marcará su estado de pago como 'cancelado')</li>
                    <li>Las reservas canceladas ya no estarán activas en el sistema</li>
                    <li>Los clientes con reservas podrían recibir notificaciones de cancelación</li>
                  </ul>
                  
                  {/* Información sobre el rango de fechas (si está disponible) */}
                  {bookingSummary.earliestDate && bookingSummary.latestDate && (
                    <div className="mt-2 pt-2 border-t border-red-200/50">
                      <p className="text-red-700 text-xs">
                        <span className="font-medium">Periodo afectado:</span>{' '}
                        {formatDate(bookingSummary.earliestDate)}
                        {bookingSummary.earliestDate !== bookingSummary.latestDate && (
                          <> al {formatDate(bookingSummary.latestDate)}</>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <AlertDialogFooter className="mt-6 gap-3">
              <Button
                onClick={() => setStep('warning')}
                variant="outline"
                className="bg-white text-gray-700 hover:bg-gray-50 border-gray-200 rounded-md transition-colors"
                disabled={isDeleting}
              >
                Volver
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-1.5"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <IconTrash size={16} className="inline-block" />
                    Eliminar de todas formas
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
} 