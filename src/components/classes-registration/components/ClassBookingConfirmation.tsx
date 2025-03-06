/**
 * Componente para la confirmación de reservas de sesiones de clase
 * 
 * Este componente muestra un resumen de las sesiones seleccionadas
 * y permite al usuario confirmar la reserva.
 */
import { useState } from 'react';
import { useClassRegistration } from '../context/ClassRegistrationContext';
import { useClassBooking } from '@/hooks/useClassBooking';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle, AlertCircle, Calendar, Clock, Users, Info } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

/**
 * Componente para la confirmación de reserva de clases
 */
export function ClassBookingConfirmation() {
  const { state, goToStep } = useClassRegistration();
  const { submitClassBooking, getSessionsSummary, isSubmitting } = useClassBooking();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Obtener el resumen de sesiones
  const sessionsSummary = getSessionsSummary();
  
  if (!sessionsSummary) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No hay sesiones seleccionadas</AlertTitle>
        <AlertDescription>
          Debes seleccionar al menos una sesión de clase para continuar.
        </AlertDescription>
      </Alert>
    );
  }
  
  const handleConfirm = async () => {
    try {
      setError(null);
      const result = await submitClassBooking({
        paymentMethod: 'cash' // Por ahora hardcodeado, se puede mejorar con un selector
      });
      
      if (result.error) {
        setError(result.error.message);
        console.error('Error al reservar:', result.error);
      } else {
        setSuccess(true);
        // Navegar a la página de éxito después de un breve retraso
        setTimeout(() => {
          goToStep('confirmation');
        }, 1500);
      }
    } catch (err) {
      setError('Error inesperado al procesar la reserva');
      console.error('Error inesperado:', err);
    }
  };
  
  const handleBack = () => {
    goToStep('session');
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirmar Reserva de Clase</CardTitle>
          <CardDescription>
            Revisa los detalles de las sesiones que vas a reservar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">{sessionsSummary.className}</h3>
            <p className="text-sm text-muted-foreground">
              Has seleccionado {sessionsSummary.sessionCount} {sessionsSummary.sessionCount === 1 ? 'sesión' : 'sesiones'}
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Detalle de sesiones:</h4>
            {sessionsSummary.sessions.map((session) => (
              <Card key={session.id} className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(session.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{session.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{session.court}</span>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm font-medium">Precio:</span>
                  <span className="text-sm font-bold">{formatCurrency(session.price)}</span>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-lg font-medium">Precio total:</span>
            <span className="text-xl font-bold">{formatCurrency(sessionsSummary.totalPrice)}</span>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">¡Reserva completada!</AlertTitle>
              <AlertDescription className="text-green-600">
                Tus sesiones han sido reservadas correctamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={isSubmitting || success}
          >
            Volver
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isSubmitting || success || sessionsSummary.sessions.length === 0}
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Procesando...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Reservado
              </>
            ) : (
              'Confirmar Reserva'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 