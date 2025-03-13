"use client"

import { useState } from "react"
import { 
  IconAlertCircle,
  IconUsers,
  IconBan,
  IconArrowsExchange,
  IconLoader2,
  IconCheck
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { sessionManagementService } from "@/services/sessionManagementService"

interface SessionMoveConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (suspendOriginal: boolean) => Promise<void>;
  sessionInfo: {
    startTime: string;
    endTime: string;
    date?: string;
    classId?: string;
    id?: string;
    courtIds?: string[];
  } | null;
  targetSessionInfo: {
    startTime: string;
    endTime: string;
    date?: string;
    id?: string;
    courtIds?: string[];
  } | null;
}

// Función auxiliar para formatear el tiempo (HH:MM)
const formatTime = (time: string) => {
  return time.split(':').slice(0, 2).join(':')
}

// Función para formatear la fecha
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long'
  });
};

export function SessionMoveConfirmation({
  isOpen,
  onClose,
  onConfirm,
  sessionInfo,
  targetSessionInfo
}: SessionMoveConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<'move' | 'move-and-suspend'>('move-and-suspend');
  const [moveResult, setMoveResult] = useState<{movedCount: number} | null>(null);

  const handleConfirm = async () => {
    if (!sessionInfo || !targetSessionInfo) return;
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // 1. Primero movemos las reservas para ambas opciones
      if (sessionInfo.date && targetSessionInfo.date) {
        const moveResult = await sessionManagementService.moveSessionBookings({
          classId: sessionInfo.classId || '',
          sourceSessionId: sessionInfo.id || '',
          targetSessionId: targetSessionInfo.id || '',
          sourceDate: sessionInfo.date,
          sourceStartTime: sessionInfo.startTime,
          sourceEndTime: sessionInfo.endTime,
          sourceCourtId: sessionInfo.courtIds && sessionInfo.courtIds.length > 0 ? sessionInfo.courtIds[0] : undefined,
          targetDate: targetSessionInfo.date,
          targetStartTime: targetSessionInfo.startTime,
          targetEndTime: targetSessionInfo.endTime,
          targetCourtId: targetSessionInfo.courtIds && targetSessionInfo.courtIds.length > 0 ? targetSessionInfo.courtIds[0] : undefined
        });
        
        if (!moveResult.success) {
          throw new Error(moveResult.error?.message || 'Error al mover las reservas');
        }
        
        console.log('✅ Reservas movidas correctamente:', moveResult.data);
        setMoveResult(moveResult.data);
      }
      
      // 2. Si es "move-and-suspend", también suspendemos la sesión original
      if (selectedOption === 'move-and-suspend' && sessionInfo.date) {
        // Extraer el courtId del arreglo de courtIds
        const courtId = sessionInfo.courtIds && sessionInfo.courtIds.length > 0 
          ? sessionInfo.courtIds[0] 
          : undefined;
        
        if (!courtId) {
          console.warn('⚠️ No se encontró ID de cancha para suspender la sesión');
        }
        
        // Llamar al servicio de suspensión
        const suspendResult = await sessionManagementService.suspendSession({
          classId: sessionInfo.classId || '',
          sessionId: sessionInfo.id || '',
          startTime: sessionInfo.startTime,
          endTime: sessionInfo.endTime,
          courtId: courtId,
          date: sessionInfo.date,
          cancellationReason: 'Sesión suspendida al mover participantes a otra sesión'
        });
        
        if (!suspendResult.success) {
          throw new Error(suspendResult.error?.message || 'Error al suspender la sesión original');
        }
        
        console.log('✅ Sesión original suspendida correctamente');
      }
      
      // 3. Llamar a onConfirm para mantener la compatibilidad con el código existente
      await onConfirm(selectedOption === 'move-and-suspend');
      setSuccess(true);
      
      // Cerramos el modal después de un tiempo
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error("Error al procesar la operación:", error);
      setErrorMessage(error.message || 'Error inesperado al procesar la operación');
    } finally {
      setLoading(false);
    }
  }

  if (!sessionInfo || !targetSessionInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-base">Confirmar movimiento de sesión</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Por favor, selecciona cómo deseas proceder con esta operación.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Información de movimiento */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <IconAlertCircle size={16} className="text-blue-500" />
              <span className="font-medium text-blue-700">Detalles del movimiento</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="font-medium text-gray-700">Desde:</p>
                <p className="text-gray-600">
                  {formatTime(sessionInfo.startTime)} - {formatTime(sessionInfo.endTime)}
                </p>
                {sessionInfo.date && (
                  <p className="text-gray-500 text-[10px]">
                    {formatDate(sessionInfo.date)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-700">Hacia:</p>
                <p className="text-gray-600">
                  {formatTime(targetSessionInfo.startTime)} - {formatTime(targetSessionInfo.endTime)}
                </p>
                {targetSessionInfo.date && (
                  <p className="text-gray-500 text-[10px]">
                    {formatDate(targetSessionInfo.date)}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Opciones de movimiento */}
          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">Opciones para la sesión original:</p>
            
            {/* Opción: Mover participantes */}
            <div 
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedOption === 'move' 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200'
              }`}
              onClick={() => setSelectedOption('move')}
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selectedOption === 'move' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300'
              }`}>
                {selectedOption === 'move' && (
                  <div className="h-2.5 w-2.5 rounded-full bg-white" />
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-900 cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <IconUsers size={16} className="text-gray-600" />
                    <span>Mover participantes</span>
                  </div>
                </label>
                <p className="text-xs text-gray-500">
                  Los participantes serán movidos a la nueva sesión, y la original seguirá disponible para reservas.
                </p>
              </div>
            </div>
            
            {/* Opción: Mover y suspender */}
            <div 
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedOption === 'move-and-suspend' 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200'
              }`}
              onClick={() => setSelectedOption('move-and-suspend')}
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selectedOption === 'move-and-suspend' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300'
              }`}>
                {selectedOption === 'move-and-suspend' && (
                  <div className="h-2.5 w-2.5 rounded-full bg-white" />
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-900 cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <IconBan size={16} className="text-red-500" />
                    <span>Mover participantes y suspender sesión</span>
                  </div>
                </label>
                <p className="text-xs text-gray-500">
                  Los participantes serán movidos y la sesión original quedará suspendida (no disponible para reservas).
                </p>
              </div>
            </div>
          </div>
          
          {/* Mensaje de error si hay alguno */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
              <p className="font-medium">Error al procesar la solicitud</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          )}
          
          {/* Mensaje de éxito si hay resultados */}
          {success && moveResult && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700">
              <div className="flex items-center gap-2">
                <IconCheck size={16} className="text-green-500" />
                <p className="font-medium">Operación completada con éxito</p>
              </div>
              {moveResult.movedCount > 0 ? (
                <p className="mt-1">Se han movido {moveResult.movedCount} reservas a la nueva sesión.</p>
              ) : (
                <p className="mt-1">No había reservas para mover en esta sesión.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            className="w-full sm:w-auto"
            disabled={loading || success}
            onClick={handleConfirm}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <IconLoader2 size={16} className="animate-spin" />
                <span>Procesando...</span>
              </div>
            ) : success ? (
              <div className="flex items-center gap-2">
                <IconCheck size={16} />
                <span>Completado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <IconArrowsExchange size={16} />
                <span>Confirmar</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
