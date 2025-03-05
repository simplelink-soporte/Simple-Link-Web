import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { BookingService } from '@/services/bookingService';
import { PaymentMethodEnum, PaymentStatusEnum } from '@/types/bookings';
import { useBookingStore } from '@/store/bookingStore';
import { formatCurrency } from '@/lib/utils';

export function ConfirmationStep() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodEnum>(PaymentMethodEnum.CASH);
  const { selectedCourt, selectedDate, selectedStartTime, selectedEndTime, participants, rentalItems, resetBooking } = useBookingStore();

  const handleConfirmBooking = async () => {
    if (!selectedCourt || !selectedDate || !selectedStartTime || !selectedEndTime) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, complete todos los campos requeridos."
      });
      return;
    }

    setIsLoading(true);

    try {
      const bookingService = new BookingService();
      const response = await bookingService.createBooking({
        courtId: selectedCourt.id,
        date: selectedDate,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        totalPrice: calculateTotalPrice(),
        paymentStatus: PaymentStatusEnum.PENDING,
        paymentMethod: paymentMethod,
        depositAmount: calculateDepositAmount(),
        participants: participants,
        rentalItems: rentalItems
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Reserva confirmada",
        description: "Tu reserva ha sido confirmada exitosamente."
      });

      resetBooking();
    } catch (error) {
      console.error('Error al confirmar la reserva:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ha ocurrido un error al confirmar la reserva."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    // Precio base por hora
    const basePrice = selectedCourt?.pricePerHour || 0;
    const hours = calculateHours();
    let total = basePrice * hours;

    // Agregar precio de los rentals si hay
    if (rentalItems?.length > 0) {
      const rentalsTotal = rentalItems.reduce((acc, item) => {
        return acc + (item.price || 0) * item.quantity;
      }, 0);
      total += rentalsTotal;
    }

    return total;
  };

  const calculateDepositAmount = () => {
    return calculateTotalPrice() * 0.3; // 30% del total
  };

  const calculateHours = () => {
    if (!selectedStartTime || !selectedEndTime) return 0;
    const start = new Date(`2000-01-01T${selectedStartTime}`);
    const end = new Date(`2000-01-01T${selectedEndTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Confirmar Reserva</CardTitle>
        <CardDescription>Revisa los detalles de tu reserva y selecciona el método de pago</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Detalles de la Reserva</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cancha</Label>
              <p className="text-sm text-gray-500">{selectedCourt?.name}</p>
            </div>
            <div>
              <Label>Fecha</Label>
              <p className="text-sm text-gray-500">{selectedDate}</p>
            </div>
            <div>
              <Label>Hora de inicio</Label>
              <p className="text-sm text-gray-500">{selectedStartTime}</p>
            </div>
            <div>
              <Label>Hora de fin</Label>
              <p className="text-sm text-gray-500">{selectedEndTime}</p>
            </div>
          </div>
        </div>

        {participants && participants.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Participantes</h3>
            <div className="grid grid-cols-1 gap-2">
              {participants.map((participant, index) => (
                <div key={index} className="text-sm text-gray-500">
                  {participant.firstName} {participant.lastName}
                </div>
              ))}
            </div>
          </div>
        )}

        {rentalItems && rentalItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Equipamiento Rentado</h3>
            <div className="grid grid-cols-1 gap-2">
              {rentalItems.map((item, index) => (
                <div key={index} className="text-sm text-gray-500">
                  {item.name} x{item.quantity} - {formatCurrency(item.price * item.quantity)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Método de Pago</h3>
          <RadioGroup
            defaultValue={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value as PaymentMethodEnum)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={PaymentMethodEnum.CASH} id="cash" />
              <Label htmlFor="cash">Efectivo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={PaymentMethodEnum.CARD} id="card" />
              <Label htmlFor="card">Tarjeta</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={PaymentMethodEnum.TRANSFER} id="transfer" />
              <Label htmlFor="transfer">Transferencia</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Resumen de Pago</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Total</span>
              <span>{formatCurrency(calculateTotalPrice())}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Depósito (30%)</span>
              <span>{formatCurrency(calculateDepositAmount())}</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleConfirmBooking}
          disabled={isLoading}
        >
          {isLoading ? "Confirmando..." : "Confirmar Reserva"}
        </Button>
      </CardFooter>
    </Card>
  );
} 