'use client';

import React, { useState } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { StepComponentProps } from './StepRenderer';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

// Servicios de ejemplo (se reemplazará con datos reales)
const demoServices = [
  { id: 'service-1', name: 'Consulta General', duration: 30, price: 50 },
  { id: 'service-2', name: 'Especialidad', duration: 45, price: 75 },
  { id: 'service-3', name: 'Procedimientos', duration: 60, price: 100 },
  { id: 'service-4', name: 'Análisis Clínicos', duration: 15, price: 35 },
];

const SummaryStep: React.FC<StepComponentProps> = ({
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  progress,
}) => {
  const { state, setCustomerInfo, formData } = useShiftForm();
  
  // Estado para el formulario de cliente
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  
  // Estado para los errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Manejar cambios en los campos del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar el error cuando el usuario escribe
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validar el formulario
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validar nombre
    if (!customerData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    // Validar email
    if (!customerData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(customerData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    // Validar teléfono
    if (!customerData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!/^\+?[\d\s-]{8,15}$/.test(customerData.phone)) {
      newErrors.phone = 'Teléfono inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = () => {
    if (validateForm()) {
      setCustomerInfo(customerData);
      onNext();
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Resumen de la Reserva</h2>
      
      {/* Resumen de la selección */}
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
          {selectedService?.price && (
            <div className="flex items-start">
              <div className="w-24 font-medium">Precio:</div>
              <div>${selectedService.price}</div>
            </div>
          )}
          {selectedService?.duration && (
            <div className="flex items-start">
              <div className="w-24 font-medium">Duración:</div>
              <div>{selectedService.duration} minutos</div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button variant="outline" size="sm" onClick={onPrevious} className="text-sm">
            Modificar selección
          </Button>
        </CardFooter>
      </Card>
      
      {/* Formulario de datos del cliente */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-medium">Tus Datos</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            name="name"
            placeholder="Ingresa tu nombre completo"
            value={customerData.name}
            onChange={handleInputChange}
          />
          {errors.name && (
            <div className="text-red-500 text-sm flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico <span className="text-red-500">*</span></Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="ejemplo@correo.com"
            value={customerData.email}
            onChange={handleInputChange}
          />
          {errors.email && (
            <div className="text-red-500 text-sm flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono <span className="text-red-500">*</span></Label>
          <Input
            id="phone"
            name="phone"
            placeholder="Tu número de teléfono"
            value={customerData.phone}
            onChange={handleInputChange}
          />
          {errors.phone && (
            <div className="text-red-500 text-sm flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.phone}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Notas adicionales</Label>
          <Input
            id="notes"
            name="notes"
            placeholder="Información adicional que quieras proporcionar"
            value={customerData.notes}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      {/* Botones de navegación */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onPrevious} className="flex items-center gap-2">
          <ChevronLeft size={16} /> Anterior
        </Button>
        <Button onClick={handleSubmit} className="flex items-center gap-2">
          Confirmar Reserva <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default SummaryStep;
