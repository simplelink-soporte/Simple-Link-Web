import { cn } from '@/lib/utils'
import { useState } from 'react'
import { 
  IconCalendarOff, 
  IconCalendarDue, 
  IconLoader2,
  IconAlertTriangle,
  IconTrash,
  IconCalendar
} from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { sessionManagementService } from '@/services/sessionManagementService'
import { toast } from 'sonner'

interface BookingSummary {
  count: number;
  hasFutureBookings: boolean;
  reservationDates?: string[];
  uniqueDates?: number;
  earliestDate?: string;
  latestDate?: string;
}

interface SessionActionButtonsProps {
  sessionId: string;
  classId: string;
  startTime?: string;
  endTime?: string;
  courtId?: string;
  bookingSummary?: BookingSummary;
  date?: string;
  onSuspend?: (sessionId: string) => Promise<void>;
  onMove?: (sessionId: string) => Promise<void>;
}

// Función para formatear fechas en español
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export function SessionActionButtons({ 
  sessionId, 
  classId,
  startTime,
  endTime,
  courtId,
  bookingSummary,
  date,
  onSuspend, 
  onMove 
}: SessionActionButtonsProps) {
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [suspendStep, setSuspendStep] = useState<'warning' | 'confirmation'>('warning');

  // Para facilitar el debugging
  const currentDate = date || new Date().toISOString().split('T')[0];

  const handleSuspendClick = () => {
    setShowSuspendConfirm(true);
    setSuspendStep('warning');
  };

  const handleSuspendConfirm = async () => {
    setSuspendLoading(true);
    try {
      if (!onSuspend) {
        // Verificar que tenemos la fecha
        if (!date) {
          throw new Error('No se proporcionó una fecha para suspender la sesión');
        }

        const result = await sessionManagementService.suspendSession({
          classId,
          sessionId,
          startTime,
          endTime,
          courtId,
          date: currentDate,   // Usamos la fecha proporcionada o la actual
          cancellationReason: 'Sesión suspendida por el administrador'
        });

        if (result.success) {
          toast.success(
            `Sesión suspendida exitosamente para ${formatDate(currentDate)}`, 
            { 
              description: result.affectedBookingsCount 
                ? `Se cancelaron ${result.affectedBookingsCount} reservas asociadas` 
                : 'No había reservas asociadas'
            }
          );
        } else {
          toast.error(
            'Error al suspender la sesión', 
            { description: result.error?.message || 'Ocurrió un error inesperado' }
          );
        }
      } else {
        await onSuspend(sessionId);
      }
    } catch (error) {
      console.error('Error al suspender la sesión:', error);
      toast.error('Error al suspender la sesión', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado'
      });
    } finally {
      setSuspendLoading(false);
      setShowSuspendConfirm(false);
      setSuspendStep('warning');
    }
  };

  const handleMove = async () => {
    if (!onMove) return;
    
    setMoveLoading(true);
    try {
      await onMove(sessionId);
    } catch (error) {
      console.error('Error al mover la sesión:', error);
    } finally {
      setMoveLoading(false);
    }
  };

  // Determinar si hay reservas y cuántas
  const hasBookings = bookingSummary?.hasFutureBookings || false;
  const bookingCount = bookingSummary?.count || 0;

  return (
    <>
      <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
        <h4 className="text-xs font-medium text-gray-700 mb-3">
          Acciones disponibles
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSuspendClick}
            disabled={suspendLoading}
            className={cn(
              "flex flex-col items-center justify-center",
              "py-3 px-2 rounded-md",
              "bg-white border border-gray-100",
              "transition-all duration-200",
              suspendLoading 
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-red-50 hover:border-red-100 hover:shadow-sm"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center mb-1",
              suspendLoading ? "bg-gray-100" : "bg-red-50"
            )}>
              {suspendLoading ? (
                <IconLoader2 size={16} className="text-gray-400 animate-spin" />
              ) : (
                <IconCalendarOff size={16} className="text-red-500" />
              )}
            </div>
            <span className="text-xs font-medium text-gray-700">
              Suspender
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">
              {hasBookings ? `Cancela ${bookingCount} reservas` : 'Cancela la sesión'}
            </span>
          </button>
          
          <button
            onClick={handleMove}
            disabled={moveLoading || !onMove}
            className={cn(
              "flex flex-col items-center justify-center",
              "py-3 px-2 rounded-md",
              "bg-white border border-gray-100",
              "transition-all duration-200",
              onMove 
                ? "hover:bg-blue-50 hover:border-blue-100 hover:shadow-sm" 
                : "opacity-60 cursor-not-allowed",
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center mb-1",
              moveLoading ? "bg-gray-100" : "bg-blue-50"
            )}>
              {moveLoading ? (
                <IconLoader2 size={16} className="text-gray-400 animate-spin" />
              ) : (
                <IconCalendarDue size={16} className="text-blue-500" />
              )}
            </div>
            <span className="text-xs font-medium text-gray-700">
              Mover
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">
              Cambia la fecha/hora
            </span>
          </button>
        </div>
        
        <div className="mt-3 text-[10px] text-gray-500 italic text-center">
          {date ? `Afectará a la sesión del ${formatDate(date)}` : 'Afectará solo a esta sesión'}
        </div>
      </div>

      {/* Modal de confirmación mejorado */}
      <AlertDialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <AlertDialogContent 
          className={cn(
            "sm:max-w-[450px] border-gray-200 shadow-2xl", 
            suspendStep === 'warning' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-red-500'
          )}
        >
          {suspendStep === 'warning' ? (
            // Primer paso: Advertencia informativa
            <>
              <AlertDialogHeader>
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <IconAlertTriangle size={22} className="flex-shrink-0" strokeWidth={2} />
                  <AlertDialogTitle className="text-amber-600 text-xl">
                    {hasBookings ? 'Reservas activas detectadas' : 'Suspender sesión'}
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-gray-700 text-base">
                  {hasBookings 
                    ? `Esta sesión tiene ${bookingCount} ${bookingCount === 1 ? 'reserva activa' : 'reservas activas'} para ${formatDate(currentDate)}.`
                    : `Esta acción marcará la sesión del ${formatDate(currentDate)} como no disponible. No hay reservas afectadas.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              {hasBookings && (
                <div className="my-5 bg-amber-50 p-4 rounded-md border border-amber-100 transition-all duration-200 hover:bg-amber-100/50">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-amber-500">
                      <IconCalendarOff size={20} strokeWidth={1.5} className="flex-shrink-0" />
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <p className="text-amber-700 font-medium">
                        Información importante
                      </p>
                      <p className="text-amber-600 text-xs leading-relaxed">
                        Si suspendes esta sesión, todas las reservas asociadas a ella 
                        para el día <span className="font-semibold">{formatDate(currentDate)}</span> serán 
                        <span className="font-semibold"> automáticamente canceladas</span>. 
                        Esto cambiará su estado de pago a 'cancelado'.
                      </p>
                      
                      {/* Fechas con reservas (si hay información disponible) */}
                      {bookingSummary?.reservationDates && bookingSummary.reservationDates.length > 0 && (
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
                            {bookingSummary?.uniqueDates && bookingSummary.uniqueDates > 5 && (
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
              )}

              <AlertDialogFooter className="mt-6 gap-3">
                <AlertDialogCancel 
                  onClick={() => {
                    setShowSuspendConfirm(false);
                    setSuspendStep('warning');
                  }}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800 border-gray-200 rounded-md transition-colors"
                >
                  Cancelar
                </AlertDialogCancel>
                {hasBookings ? (
                  <button
                    onClick={() => setSuspendStep('confirmation')}
                    className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Entiendo, continuar
                  </button>
                ) : (
                  <AlertDialogAction 
                    onClick={handleSuspendConfirm}
                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                  >
                    {suspendLoading ? (
                      <>
                        <IconLoader2 size={16} className="animate-spin mr-2" />
                        Suspendiendo...
                      </>
                    ) : (
                      'Confirmar suspensión'
                    )}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </>
          ) : (
            // Segundo paso: Confirmación de suspensión
            <>
              <AlertDialogHeader>
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <IconTrash size={22} className="flex-shrink-0" strokeWidth={2} />
                  <AlertDialogTitle className="text-red-600 text-xl">
                    Confirmar suspensión
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-gray-700 text-base">
                  Al suspender esta sesión para el <span className="font-semibold">{formatDate(currentDate)}</span>, 
                  <span className="font-semibold text-red-600"> las {bookingCount} reservas</span> serán canceladas automáticamente.
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
                      <li>La sesión del {formatDate(currentDate)} será marcada como no disponible</li>
                      <li>Se cancelarán todas las reservas para esa fecha (se marcará su estado de pago como 'cancelado')</li>
                      <li>Las reservas canceladas ya no estarán activas en el sistema</li>
                      <li>Los clientes con reservas podrían recibir notificaciones de cancelación</li>
                    </ul>
                  </div>
                </div>
              </div>

              <AlertDialogFooter className="mt-6 gap-3">
                <button
                  onClick={() => setSuspendStep('warning')}
                  className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 py-2 px-4 rounded-md transition-colors"
                  disabled={suspendLoading}
                >
                  Volver
                </button>
                <button
                  onClick={handleSuspendConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors flex items-center gap-1.5"
                  disabled={suspendLoading}
                >
                  {suspendLoading ? (
                    <>
                      <IconLoader2 size={16} className="animate-spin mr-1" />
                      Suspendiendo...
                    </>
                  ) : (
                    <>
                      <IconCalendarOff size={16} className="inline-block" />
                      Suspender de todas formas
                    </>
                  )}
                </button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 