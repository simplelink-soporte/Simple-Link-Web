"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { 
  IconCalendar, 
  IconClock, 
  IconChevronLeft,
  IconArrowRight,
  IconLoader2,
  IconCheck,
  IconChevronRight,
  IconChevronDown
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { SessionMoveConfirmation } from "./SessionMoveConfirmation"

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  price: number;
  instructors: string[];
  courtIds: string[];
  date?: string;
  isSuspended?: boolean;
}

interface SessionMoveSectionProps {
  session: TimeSlot;
  classId: string;
  availableSessions: TimeSlot[];
  onBack: () => void;
  onMove: (targetSessionId: string, suspendOriginal: boolean) => Promise<void>;
}

export function SessionMoveSection({
  session,
  classId,
  availableSessions,
  onBack,
  onMove
}: SessionMoveSectionProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    session.date ? new Date(session.date) : undefined
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Función para formatear la fecha YYYY-MM-DD
  const formatYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Función para obtener los días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);
    
    // Obtener el día de la semana del primer día (0 = Domingo, 1 = Lunes, ...)
    const firstDayOfWeek = firstDay.getDay();
    // Ajustar para que la semana comience en lunes (0 = Lunes, 1 = Martes, ...)
    const adjustedFirstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const days = [];
    
    // Añadir días vacíos para alinear el primer día
    for (let i = 0; i < adjustedFirstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Añadir los días del mes
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push(date);
    }
    
    return days;
  };
  
  // Verificar si hay sesiones disponibles para una fecha
  const hasSessionsOnDate = (dateStr: string) => {
    return availableSessions.some(slot => 
      slot.date === dateStr && 
      slot.id !== session.id && 
      !slot.isSuspended
    );
  };
  
  // Filtrar sesiones disponibles por fecha seleccionada
  const filteredSessions = selectedDate 
    ? availableSessions.filter(
        s => s.date === selectedDate.toISOString().split('T')[0] && 
        s.id !== session.id && 
        !s.isSuspended
      )
    : [];
  
  // Encontrar la sesión seleccionada entre las disponibles
  const targetSession = selectedSessionId 
    ? availableSessions.find(s => s.id === selectedSessionId)
    : null;
  
  const handleMove = async () => {
    if (!selectedSessionId) return;
    
    // En lugar de ejecutar directamente, mostramos el diálogo de confirmación
    setShowConfirmation(true);
  };
  
  // Función que recibe la confirmación del diálogo
  const handleConfirmMove = async (suspendOriginal: boolean) => {
    setLoading(true);
    try {
      await onMove(selectedSessionId, suspendOriginal);
      setSuccess(true);
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error("Error al mover la sesión:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para formatear el tiempo (HH:MM)
  const formatTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':')
  }

  return (
    <div className="space-y-4">
      {/* Header con botón de regreso */}
      <div className="flex items-center mb-2">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-xs"
          disabled={loading}
        >
          <IconChevronLeft size={14} />
          <span>Volver</span>
        </button>
      </div>
      
      {/* Título y descripción - similar a SessionsReviewSection */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-gray-900/75">
          Mover sesión
        </h3>
        <p className="text-xs text-gray-500/75">
          Selecciona una nueva fecha y sesión de destino
        </p>
      </div>
      
      {/* Implementación de un calendario minimalista como en SessionsReviewSection */}
      <div className="bg-white border border-gray-200 rounded-md p-2">
        {/* Encabezado del calendario */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-2">
          <button
            onClick={() => setSelectedDate(prev => prev ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1) : new Date())}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <IconChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="text-xs font-medium text-gray-800">
            {selectedDate?.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) || new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setSelectedDate(prev => prev ? new Date(prev.getFullYear(), prev.getMonth() + 1, 1) : new Date())}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <IconChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
        
        {/* Días de la semana */}
        <div className="grid grid-cols-7 text-center pt-1 bg-white">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
            <div key={index} className="text-[10px] text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Días del mes */}
        <div className="grid grid-cols-7 text-center pb-1 px-1 bg-white">
          {getDaysInMonth(selectedDate || new Date()).map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-6" />;
            }
            
            const dateStr = formatYYYYMMDD(day);
            const isSelected = selectedDate && dateStr === formatYYYYMMDD(selectedDate);
            const hasSessions = hasSessionsOnDate(dateStr);
            
            return (
              <div key={dateStr} className="py-1 px-1">
                <button
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors",
                    isSelected 
                      ? "bg-gray-600 text-white hover:bg-gray-700" 
                      : hasSessions
                        ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {day.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Información de la sesión a mover - debajo del calendario */}
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-200">
            <IconClock size={12} className="text-gray-600" />
          </div>
          <span className="text-xs font-medium text-gray-700">Sesión a mover:</span>
        </div>
        
        <div className="ml-7">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-900 font-medium">
              {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </span>
          </div>
          {session.date && (
            <p className="text-xs text-gray-500">
              {new Date(session.date).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long'
              })}
            </p>
          )}
        </div>
      </div>
      
      {/* Sección para seleccionar la sesión */}
      <div className={cn(
        "rounded-lg border p-3 transition-opacity duration-200",
        selectedDate ? "border-gray-100 opacity-100" : "border-gray-50 opacity-50"
      )}>
        <h4 className="text-xs font-medium text-gray-700 mb-3">
          Selecciona la sesión de destino
        </h4>
        
        {filteredSessions.length > 0 ? (
          <div className="space-y-2">
            {filteredSessions.map(slot => (
              <div 
                key={`${slot.id}_${slot.startTime}_${slot.endTime}`} 
                className={cn(
                  "border rounded-md p-2.5 cursor-pointer transition-all",
                  selectedSessionId === slot.id 
                    ? "border-gray-300 bg-gray-50/80 shadow-sm" 
                    : "border-gray-100 bg-white hover:bg-gray-50"
                )}
                onClick={() => setSelectedSessionId(slot.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      selectedSessionId === slot.id ? "bg-gray-200" : "bg-gray-100"
                    )}>
                      <IconClock size={14} className={selectedSessionId === slot.id ? "text-gray-600" : "text-gray-500"} />
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                  </div>
                  
                  {selectedSessionId === slot.id && (
                    <IconCheck size={16} className="text-gray-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : selectedDate ? (
          <div className="py-3 text-center text-sm text-gray-500">
            No hay sesiones disponibles para esta fecha
          </div>
        ) : (
          <div className="py-3 text-center text-sm text-gray-500">
            Selecciona una fecha para ver las sesiones disponibles
          </div>
        )}
      </div>
      
      {/* Sección inferior con botón mover */}
      <div className="flex flex-col space-y-3">
        <Button
          onClick={handleMove}
          variant="default"
          className="w-full"
          disabled={!selectedSessionId || loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <IconLoader2 size={16} className="animate-spin" />
              <span>Procesando...</span>
            </div>
          ) : success ? (
            <div className="flex items-center gap-2">
              <IconCheck size={16} />
              <span>¡Movido correctamente!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <IconArrowRight size={16} />
              <span>Mover a esta sesión</span>
            </div>
          )}
        </Button>
      </div>
      
      {/* Modal de confirmación */}
      <SessionMoveConfirmation
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmMove}
        sessionInfo={{
          startTime: session.startTime,
          endTime: session.endTime,
          date: session.date,
          classId: classId,
          id: session.id,
          courtIds: session.courtIds
        }}
        targetSessionInfo={
          targetSession ? {
            id: targetSession.id,
            startTime: targetSession.startTime,
            endTime: targetSession.endTime,
            date: targetSession.date,
            courtIds: targetSession.courtIds
          } : null
        }
      />
    </div>
  );
}
