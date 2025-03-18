'use client';

import React, { useEffect, useState } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { StepComponentProps } from './StepRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Tipo para los servicios
interface Service {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  price?: number;
  imageUrl?: string;
}

// Datos de servicios de ejemplo (luego se reemplazarán con datos reales)
const demoServices: Service[] = [
  {
    id: 'service-1',
    name: 'Consulta General',
    description: 'Consulta médica general con profesionales calificados.',
    duration: 30,
    price: 50,
    imageUrl: '/images/services/general.jpg',
  },
  {
    id: 'service-2',
    name: 'Especialidad',
    description: 'Atención con especialistas en diversas áreas médicas.',
    duration: 45,
    price: 75,
    imageUrl: '/images/services/specialty.jpg',
  },
  {
    id: 'service-3',
    name: 'Procedimientos',
    description: 'Procedimientos médicos menores realizados por expertos.',
    duration: 60,
    price: 100,
    imageUrl: '/images/services/procedures.jpg',
  },
  {
    id: 'service-4',
    name: 'Análisis Clínicos',
    description: 'Toma de muestras y análisis clínicos completos.',
    duration: 15,
    price: 35,
    imageUrl: '/images/services/labs.jpg',
  },
];

const ServiceStep: React.FC<StepComponentProps> = ({
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  progress,
}) => {
  const { state, selectService, formData } = useShiftForm();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Cargar servicios
  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Simulamos una carga de datos
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // En la implementación real, estos datos vendrían de un servicio API
        // const response = await serviceApi.getServices();
        // setServices(response.data);
        
        // Por ahora usamos datos de ejemplo
        setServices(demoServices);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar servicios:', error);
        setError('No se pudieron cargar los servicios. Por favor, inténtelo más tarde.');
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Filtrar servicios basados en la búsqueda
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Manejar selección de servicio
  const handleServiceSelection = (serviceId: string) => {
    selectService(serviceId);
    onNext();
  };

  // Si está cargando
  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Cargando servicios disponibles...</p>
      </div>
    );
  }

  // Si hay un error
  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()} className="w-full">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Selecciona un Servicio</h2>
      
      {/* Barra de búsqueda */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Buscar servicios..."
          className="pl-10 w-full"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      
      {/* Lista de servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {filteredServices.length > 0 ? (
          filteredServices.map(service => (
            <Card 
              key={service.id} 
              className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                state.selectedService === service.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleServiceSelection(service.id)}
            >
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg">{service.name}</CardTitle>
                {service.duration && (
                  <CardDescription>Duración: {service.duration} min</CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-gray-600">{service.description}</p>
              </CardContent>
              {service.price && (
                <CardFooter className="p-4 pt-0 text-sm">
                  Precio: ${service.price}
                </CardFooter>
              )}
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No se encontraron servicios que coincidan con tu búsqueda.</p>
          </div>
        )}
      </div>
      
      {/* Botones de navegación */}
      <div className="flex justify-between mt-6">
        {!isFirstStep && (
          <Button variant="outline" onClick={onPrevious} className="flex items-center gap-2">
            <ChevronLeft size={16} /> Anterior
          </Button>
        )}
        <div className="flex-1"></div>
        {filteredServices.length > 0 && (
          <Button 
            onClick={() => handleServiceSelection(filteredServices[0].id)} 
            disabled={state.selectedService === null}
            className="flex items-center gap-2"
          >
            Siguiente <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ServiceStep;
