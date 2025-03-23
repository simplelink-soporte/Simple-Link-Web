"use client"

import React, { useEffect } from 'react';
import { useClassRegistration } from '../context/ClassRegistrationContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Calendar, Clock, User, CreditCard, Ticket, AlertTriangle, Mail } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function ConfirmationStep() {
  const { state, goToStep } = useClassRegistration();
  const { user } = useAuth();

  // Verificar que hemos llegado aquí después de crear reservas
  useEffect(() => {
    // Si no hay IDs de reserva o el estado no es success, redirigir al paso de resumen
    if (state.bookingIds.length === 0 || state.bookingStatus !== 'success') {
      console.log('No hay reservas confirmadas, redirigiendo a resumen');
      goToStep('summary');
    } else {
      console.log('Reservas confirmadas:', state.bookingIds);
    }
  }, [state.bookingIds, state.bookingStatus, goToStep]);

  // Formatear fecha
  const formatSessionDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    
    return format(new Date(date), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es });
  };
  
  // Mensaje según si se usó paquete o no
  const message = state.selectedPackage
    ? `Has reservado tus sesiones usando tu paquete ${state.selectedPackage.title}`
    : 'Has reservado tus sesiones correctamente';

  // Método de pago utilizado
  const paymentMethod = state.selectedPayment ? {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    deposit: 'Depósito',
    full: 'Pago completo',
    guarantee: 'Garantía',
    local: 'Pago en el local'
  }[state.selectedPayment] : 'No especificado';

  // Si está cargando
  if (state.bookingStatus === 'submitting') {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Procesando tu reserva...</p>
      </div>
    );
  }

  // Si hay un error
  if (state.bookingStatus === 'error') {
    return (
      <div className="p-6 bg-white rounded-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error en la Reserva</h2>
          <p className="text-gray-600 mb-4">No se pudo procesar la reserva. Por favor, inténtalo de nuevo más tarde.</p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button variant="default" onClick={() => goToStep('summary')} className="w-full">
            Volver y Revisar
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-5">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
          <h2 className="text-lg font-medium mb-1">¡Reserva Confirmada!</h2>
          <p className="text-sm text-gray-500">{message}</p>
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
                <span>{user?.metadata?.name || 'No disponible'}</span>
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr] py-1 items-center">
              <div className="text-gray-500">Email:</div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <span>{user?.email || 'No disponible'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detalles de la clase */}
        {state.selectedClass && (
          <div className="mb-4 border border-gray-100 rounded-md overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Detalles de la Clase</h3>
            </div>
            <div className="px-3 py-2">
              <h4 className="text-sm font-medium mb-2">{state.selectedClass.title}</h4>
              
              {/* Sesiones reservadas */}
              <div className="space-y-2 mb-3">
                {state.selectedClass.sessions
                  .filter(session => state.selectedSessions.includes(session.id))
                  .map(session => (
                    <div key={session.id} className="border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm">{formatSessionDate(session.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm">{`${session.startTime} - ${session.endTime}`}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">Precio:</span>
                        <span className="text-sm font-medium">${session.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Método de pago */}
              <div className="flex items-center gap-1.5 py-1.5 border-b border-gray-100">
                <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm">Método de pago: <span className="font-medium">{paymentMethod}</span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}