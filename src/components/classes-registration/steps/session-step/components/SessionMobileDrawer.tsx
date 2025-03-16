import React from 'react';
import { X, Check, Clock, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
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
  onSelect,
}: SessionMobileDrawerProps) {
  const isAvailable = session ? isSessionAvailable(session) : false;
  const isValidatingAvailability = session?.spotsLeft === undefined || session?.spotsLeft === null;
  
  if (!session) {
    return null;
  }

  const handleSelect = () => {
    if (session) {
      onSelect(session);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="px-4 py-6">
        {/* Custom header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Detalles de la sesión</h2>
          <SheetClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        
        <div className="mt-4 space-y-6">
          {/* Información de fecha */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">Fecha</h3>
              <p className="text-sm text-gray-500">
                {formatSessionDate(session.date)}
              </p>
            </div>
          </div>

          {/* Información de horario */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">Horario</h3>
              <p className="text-sm text-gray-500">
                {session.startTime} - {session.endTime}
              </p>
            </div>
          </div>

          {/* Información de instructor */}
          {session.instructor && (
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 text-primary shrink-0 mt-0.5 flex items-center justify-center">
                <span className="text-xs font-medium">👤</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Instructor</h3>
                <p className="text-sm text-gray-500">
                  {session.instructor}
                </p>
              </div>
            </div>
          )}

          {/* Información de disponibilidad */}
          <div className="flex items-start gap-3">
            {isValidatingAvailability ? (
              <div className="h-5 w-5 shrink-0 mt-0.5 relative">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              </div>
            ) : (
              <AlertCircle className={cn(
                "h-5 w-5 shrink-0 mt-0.5",
                isAvailable ? "text-green-500" : "text-red-500"
              )} />
            )}
            <div>
              <h3 className="font-medium text-gray-900">Disponibilidad</h3>
              {isValidatingAvailability ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-blue-200 rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-blue-300 rounded-full animate-pulse delay-150"></div>
                    <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse delay-300"></div>
                    <span className="text-xs text-gray-500 ml-1">Verificando...</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isAvailable ? "success" : "destructive"} className="uppercase text-xs font-semibold">
                    {isAvailable ? 'Disponible' : 'No disponible'}
                  </Badge>
                  {session.spotsLeft !== undefined && session.totalSpots !== undefined && (
                    <span className="text-xs text-gray-500">
                      {session.spotsLeft} / {session.totalSpots} lugares
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botón de selección */}
          <div className="pt-4">
            <Button 
              className="w-full"
              variant={isSelected ? "outline" : "default"}
              onClick={handleSelect}
              disabled={!isAvailable || isValidatingAvailability}
            >
              {isSelected ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Seleccionada
                </span>
              ) : isValidatingAvailability ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando disponibilidad...
                </span>
              ) : (
                'Seleccionar'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
