'use client';

import React, { useEffect, useState } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { StepComponentProps } from './StepRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Calendar, Clock, Copy, Share2, AlertTriangle } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Servicios de ejemplo (se reemplazará con datos reales)
const demoServices = [
  { id: 'service-1', name: 'Consulta General', duration: 30, price: 50 },
  { id: 'service-2', name: 'Especialidad', duration: 45, price: 75 },
  { id: 'service-3', name: 'Procedimientos', duration: 60, price: 100 },
  { id: 'service-4', name: 'Análisis Clínicos', duration: 15, price: 35 },
];

const ConfirmationStep: React.FC<StepComponentProps> = ({
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  progress,
}) => {
  const { state, resetForm, dispatch, formData } = useShiftForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Obtener datos del servicio seleccionado
  const selectedService = demoServices.find(service => service.id === state.selectedService);

  // Formatear la fecha seleccionada
  const formattedDate = state.selectedDate 
    ? format(new Date(state.selectedDate), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })
    : '';

  // Formatear la hora seleccionada
  const formattedTime = state.selectedTimeSlot
    ? format(parse(state.selectedTimeSlot, 'HH:mm', new Date()), 'h:mm a')
    : '';

  // Simulación de envío de la reserva
  useEffect(() => {
    const submitBooking = async () => {
      try {
        if (!state.customerInfo) {
          throw new Error('No se han proporcionado datos de cliente');
        }

        // Simulamos procesamiento en el servidor
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // En implementación real, esto sería una llamada a API
        // const response = await bookingService.createBooking({
        //   serviceId: state.selectedService,
        //   date: state.selectedDate,
        //   timeSlot: state.selectedTimeSlot,
        //   customerInfo: state.customerInfo
        // });
        
        // Crear un código de reserva aleatorio
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setBookingCode(randomCode);
        
        // Actualizar el estado del formulario
        dispatch({ type: 'SET_BOOKING_ID', payload: randomCode });
        dispatch({ type: 'SET_BOOKING_STATUS', payload: 'success' });
        
        setBookingConfirmed(true);
        setLoading(false);
      } catch (error) {
        console.error('Error al procesar la reserva:', error);
        setError('No se pudo procesar la reserva. Por favor, inténtalo de nuevo más tarde.');
        dispatch({ type: 'SET_BOOKING_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: error as Error });
        setLoading(false);
      }
    };

    if (state.customerInfo && !bookingConfirmed && !state.bookingId) {
      dispatch({ type: 'SET_BOOKING_STATUS', payload: 'submitting' });
      submitBooking();
    } else {
      setLoading(false);
    }
  }, [state.customerInfo, bookingConfirmed, state.bookingId, dispatch, state.selectedService, state.selectedDate, state.selectedTimeSlot]);

  // Copiar al portapapeles
  const copyToClipboard = () => {
    const textToCopy = `Reserva #${bookingCode}\nServicio: ${selectedService?.name}\nFecha: ${formattedDate}\nHora: ${formattedTime}\nNombre: ${state.customerInfo?.name}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Compartir reserva
  const shareBooking = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mi reserva de turno',
        text: `He reservado un turno para ${selectedService?.name} el ${formattedDate} a las ${formattedTime}. Mi código de reserva es: ${bookingCode}`,
        url: window.location.href,
      });
    }
  };

  // Iniciar un nuevo turno
  const handleNewReservation = () => {
    resetForm();
  };

  // Si está cargando
  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Procesando tu reserva...</p>
      </div>
    );
  }

  // Si hay un error
  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error en la Reserva</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button variant="default" onClick={onPrevious} className="w-full">
            Volver y Revisar
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Si la reserva se confirmó exitosamente
  return (
    <div className="p-6 bg-white rounded-lg">
      <div className="flex flex-col items-center text-center mb-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">¡Reserva Confirmada!</h2>
        <p className="text-gray-600">Tu turno ha sido reservado exitosamente.</p>
        
        {bookingCode && (
          <div className="mt-4 bg-gray-50 px-4 py-2 rounded-md">
            <span className="text-sm text-gray-500">Código de reserva:</span>
            <div className="text-lg font-semibold">{bookingCode}</div>
          </div>
        )}
      </div>
      
      {/* Detalles de la reserva */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Detalles del Turno</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-start">
            <div className="w-24 font-medium">Servicio:</div>
            <div>{selectedService?.name || 'No seleccionado'}</div>
          </div>
          <div className="flex items-start">
            <div className="w-24 font-medium">Fecha:</div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              {formattedDate}
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-24 font-medium">Hora:</div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              {formattedTime}
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-24 font-medium">Nombre:</div>
            <div>{state.customerInfo?.name}</div>
          </div>
          <div className="flex items-start">
            <div className="w-24 font-medium">Email:</div>
            <div>{state.customerInfo?.email}</div>
          </div>
          <div className="flex items-start">
            <div className="w-24 font-medium">Teléfono:</div>
            <div>{state.customerInfo?.phone}</div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-1 text-sm">
            <Copy className="h-4 w-4" />
            {copySuccess ? 'Copiado!' : 'Copiar'}
          </Button>
          {navigator.share && (
            <Button variant="outline" size="sm" onClick={shareBooking} className="flex items-center gap-1 text-sm">
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Instrucciones adicionales */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-blue-700 mb-2">Instrucciones</h3>
        <p className="text-sm text-blue-600 mb-2">
          Hemos enviado los detalles de tu reserva a tu correo electrónico. Por favor, llega 10 minutos antes de tu horario programado.
        </p>
        <p className="text-sm text-blue-600">
          Si necesitas cancelar o reprogramar tu turno, comunícate con nosotros con al menos 24 horas de anticipación.
        </p>
      </div>
      
      {/* Botones finales */}
      <div className="flex flex-col gap-3">
        <Button onClick={handleNewReservation} className="w-full">
          Reservar otro turno
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            window.location.href = formData?.settings?.returnUrl || '/';
          }} 
          className="w-full"
        >
          Volver al inicio
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationStep;
