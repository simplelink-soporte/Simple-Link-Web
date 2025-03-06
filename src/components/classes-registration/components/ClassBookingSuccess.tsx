/**
 * Componente para mostrar la confirmación de éxito después de completar la reserva
 */
import { useRouter } from 'next/navigation';
import { useClassRegistration } from '../context/ClassRegistrationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, ListChecks } from 'lucide-react';

/**
 * Componente para la pantalla de éxito después de reservar sesiones de clase
 */
export function ClassBookingSuccess() {
  const router = useRouter();
  const { state, goToStep } = useClassRegistration();
  
  const handleViewBookings = () => {
    // Redirigir al usuario a su página de reservas
    router.push('/dashboard/bookings');
  };
  
  const handleBookAnother = () => {
    // Reiniciar el proceso para reservar otra clase
    goToStep('package');
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-8 rounded-full bg-green-50 p-3">
        <CheckCircle className="h-12 w-12 text-green-500" />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">¡Reserva Completada!</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Has reservado exitosamente {state.bookingIds.length} {state.bookingIds.length === 1 ? 'sesión' : 'sesiones'} para la clase:
          </p>
          
          <div className="rounded-lg bg-primary-50 p-4 text-center">
            <h3 className="text-lg font-medium">{state.selectedClass?.title}</h3>
            {state.selectedClass?.instructor && (
              <p className="text-sm text-muted-foreground">
                Instructor: {state.selectedClass.instructor}
              </p>
            )}
          </div>
          
          <div className="flex justify-center space-x-4 pt-2">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-primary">{state.bookingIds.length}</span>
              <span className="text-xs text-muted-foreground">Sesiones</span>
            </div>
          </div>
          
          <div className="text-center text-sm">
            <p>
              Recibirás un correo electrónico con la confirmación de tu reserva.
              No olvides agregar estos eventos a tu calendario.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <Button onClick={handleViewBookings} className="w-full">
            <Calendar className="mr-2 h-4 w-4" />
            Ver Mis Reservas
          </Button>
          
          <Button variant="outline" onClick={handleBookAnother} className="w-full">
            <ListChecks className="mr-2 h-4 w-4" />
            Reservar Otra Clase
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 