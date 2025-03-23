'use client';

import React, { useEffect, useState } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { StepComponentProps } from './StepRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Calendar, Clock, AlertTriangle, MapPin, Phone, Mail, CreditCard, User, DollarSign } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useItems } from '@/hooks/useItems';

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
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>('');

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

  // Determinar el método de pago en formato legible
  const getPaymentMethodName = () => {
    const methods: Record<string, string> = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'deposit': 'Depósito',
      'full': 'Pago completo',
      'guarantee': 'Garantía',
      'local': 'Pago en el local'
    };
    
    // Si hay métodos de pago disponibles, mostrar el nombre correspondiente
    if (state.availablePaymentMethods && state.availablePaymentMethods.length > 0) {
      return methods[state.availablePaymentMethods[0]] || 'No especificado';
    }
    
    return 'No especificado';
  };

  // Obtener items usando el hook useItems para conseguir sus nombres
  const { data: itemsData = [] } = useItems(state.selectedLocation || undefined, {
    enabled: !!state.selectedLocation,
  });

  // Función para obtener el nombre del ítem por su ID
  const getItemNameById = (itemId: string) => {
    const item = itemsData.find(item => item.id === itemId);
    return item ? item.name : `Item ${itemId}`;
  };

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
      <div className="flex flex-col items-center text-center mb-5">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
        <h2 className="text-lg font-medium mb-1">¡Reserva Confirmada!</h2>
        <p className="text-sm text-gray-500">Tu turno ha sido reservado exitosamente.</p>
        
        {bookingCode && (
          <div className="mt-3 bg-gray-50 px-3 py-1.5 rounded-md">
            <span className="text-xs text-gray-500">Código de reserva:</span>
            <div className="text-base font-medium">{bookingCode}</div>
          </div>
        )}
      </div>
      
      {/* Información del Usuario */}
      <div className="mb-4 border border-gray-100 rounded-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">Datos del Usuario</h3>
        </div>
        <div className="px-3 py-2 text-sm">
          <div className="grid grid-cols-[100px_1fr] py-1 items-center">
            <div className="text-gray-500">Nombre:</div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span>{user?.metadata?.name || state.customerInfo?.name || 'No disponible'}</span>
            </div>
          </div>
          <div className="grid grid-cols-[100px_1fr] py-1 items-center">
            <div className="text-gray-500">Email:</div>
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <span>{user?.email || state.customerInfo?.email || 'No disponible'}</span>
            </div>
          </div>
          {state.customerInfo?.phone && (
            <div className="grid grid-cols-[100px_1fr] py-1 items-center">
              <div className="text-gray-500">Teléfono:</div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <span>{state.customerInfo.phone}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Detalles de la reserva */}
      <div className="mb-4 border border-gray-100 rounded-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">Detalles del Turno</h3>
        </div>
        <div className="px-3 py-2 text-sm">
          {/* Información de la cancha o servicio */}
          <div className="grid grid-cols-[100px_1fr] py-1 items-center">
            <div className="text-gray-500">Servicio:</div>
            <div>{state.shiftDetails?.courtName || selectedService?.name || 'No seleccionado'}</div>
          </div>
          
          {/* Fecha y hora */}
          <div className="grid grid-cols-[100px_1fr] py-1 items-center">
            <div className="text-gray-500">Fecha:</div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <span>{formattedDate || state.shiftDetails?.date || 'No especificada'}</span>
            </div>
          </div>
          <div className="grid grid-cols-[100px_1fr] py-1 items-center">
            <div className="text-gray-500">Hora:</div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span>{formattedTime || (state.shiftDetails ? `${state.shiftDetails.startTime} - ${state.shiftDetails.endTime}` : 'No especificada')}</span>
            </div>
          </div>
          
          {/* Duración */}
          {state.duration > 0 && (
            <div className="grid grid-cols-[100px_1fr] py-1 items-center">
              <div className="text-gray-500">Duración:</div>
              <div>{state.duration} {state.duration === 1 ? 'hora' : 'horas'}</div>
            </div>
          )}
          
          {/* Precio */}
          {(state.shiftDetails?.price || selectedService?.price) && (
            <div className="grid grid-cols-[100px_1fr] py-1 items-center">
              <div className="text-gray-500">Precio:</div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                <span>${state.shiftDetails?.price || selectedService?.price}</span>
              </div>
            </div>
          )}
          
          {/* Método de pago */}
          <div className="grid grid-cols-[100px_1fr] py-1 items-center">
            <div className="text-gray-500">Pago:</div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-gray-400" />
              <span>{getPaymentMethodName()}</span>
            </div>
          </div>
          
          {/* Items adicionales si existen */}
          {state.selectedItems && Object.keys(state.selectedItems).length > 0 && (
            <div className="mt-1 pt-1 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 mb-1">Items adicionales:</div>
              <ul className="text-xs pl-1">
                {Object.entries(state.selectedItems).map(([itemId, quantity]) => (
                  quantity > 0 && (
                    <li key={itemId} className="flex justify-between py-0.5">
                      <span>{getItemNameById(itemId)}</span>
                      <span>x{quantity}</span>
                    </li>
                  )
                ))}
              </ul>
              {state.itemsTotalPrice > 0 && (
                <div className="flex justify-between text-xs mt-1 pt-1 border-t border-gray-100">
                  <span>Subtotal items:</span>
                  <span>${state.itemsTotalPrice}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Total */}
          {(state.shiftDetails?.price || selectedService?.price || 0) + (state.itemsTotalPrice || 0) > 0 && (
            <div className="flex justify-between text-sm font-medium mt-1.5 pt-1.5 border-t border-gray-100">
              <span>Total:</span>
              <span>${(state.shiftDetails?.price || selectedService?.price || 0) + (state.itemsTotalPrice || 0)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Información del Club */}
      <div className="mb-4 border border-gray-100 rounded-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">Información del Club</h3>
        </div>
        <div className="px-3 py-2 text-sm">
          <div className="grid grid-cols-[100px_1fr] py-1 items-center">
            <div className="text-gray-500">Nombre:</div>
            <div>{organization?.name || 'No disponible'}</div>
          </div>
          {organization?.business_name && (
            <div className="grid grid-cols-[100px_1fr] py-1 items-center">
              <div className="text-gray-500">Razón Social:</div>
              <div>{organization.business_name}</div>
            </div>
          )}
          {organization?.email && (
            <div className="grid grid-cols-[100px_1fr] py-1 items-center">
              <div className="text-gray-500">Email:</div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <span>{organization.email}</span>
              </div>
            </div>
          )}
          {organization?.phone && (
            <div className="grid grid-cols-[100px_1fr] py-1 items-center">
              <div className="text-gray-500">Teléfono:</div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <span>{organization.phone}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationStep;
