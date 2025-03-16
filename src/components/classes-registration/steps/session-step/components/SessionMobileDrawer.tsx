import React from 'react';
import { X, Check, Clock, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClassSession } from '../../../types/models';
import { formatSessionDate, isSessionAvailable } from '../utils/helpers';

interface SessionMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: ClassSession | null;
  isSelected: boolean;
  onSelect: (session: ClassSession) => void;
}

/**
 * Componente para mostrar los detalles de una sesión en un drawer móvil
 */
export function SessionMobileDrawer({
  isOpen,
  onClose,
  session,
  isSelected,
  onSelect
}: SessionMobileDrawerProps) {
  // Si no hay sesión, no mostrar nada
  if (!session) return null;
  
  // Formatear la fecha para mostrarla en un formato legible
  const formattedDate = formatSessionDate(session.date);
  
  // Verificar si la sesión está disponible
  const isAvailable = isSessionAvailable(session);
  
  // Función para manejar la selección y cerrar el drawer
  const handleSelect = () => {
    if (isAvailable) {
      onSelect(session);
      onClose();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="px-4 py-4">
        <DrawerHeader className="p-0 flex items-center justify-between">
          <DrawerTitle className="text-lg font-medium">Detalles de la sesión</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        
        <div className="mt-4 space-y-6">
          {/* Información de fecha */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 mr-3 text-gray-600" />
              <div>
                <div className="font-medium">{formattedDate.dayName}</div>
                <div className="text-sm text-gray-600">
                  {formattedDate.dayNumber} {formattedDate.monthName}
                </div>
              </div>
            </div>
            
            {/* Información de hora */}
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-3 text-gray-600" />
              <div>
                <div className="font-medium">Horario</div>
                <div className="text-sm text-gray-600">
                  {session.startTime} - {session.endTime}
                </div>
              </div>
            </div>
          </div>
          
          {/* Estado de disponibilidad */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium mb-2">Disponibilidad</h3>
            
            {session.spotsLeft === null || session.spotsLeft === undefined ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <div className="flex items-center">
                {isAvailable ? (
                  <>
                    <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm">
                      {session.spotsLeft} plazas disponibles de {session.totalSpots}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-500">
                      No hay plazas disponibles
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Información adicional */}
          {session.teacher && (
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium mb-1">Instructor</h3>
              <p className="text-sm text-gray-700">{session.teacher}</p>
            </div>
          )}
          
          {/* Estado actual y acciones */}
          <div className="space-y-3">
            {isSelected && (
              <Badge 
                variant="outline" 
                className="w-full flex items-center justify-center py-2 bg-primary/5 text-primary border-primary"
              >
                <Check className="h-3 w-3 mr-1" />
                Sesión seleccionada
              </Badge>
            )}
            
            <Button
              onClick={handleSelect}
              disabled={!isAvailable || isSelected}
              className="w-full"
              variant={isSelected ? "outline" : "default"}
            >
              {isSelected 
                ? 'Sesión ya seleccionada' 
                : isAvailable 
                  ? 'Seleccionar esta sesión' 
                  : 'No disponible'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
