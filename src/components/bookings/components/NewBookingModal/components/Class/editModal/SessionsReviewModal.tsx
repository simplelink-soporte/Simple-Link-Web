import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconX, IconArrowRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { SessionsReviewSection } from "./SessionsReviewSection"
import { SessionDetailSection } from "./SessionDetailSection"
import { SessionMoveSection } from "./SessionMoveSection"
import { DateTime } from "luxon"

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

interface SessionsReviewModalProps {
  isOpen: boolean
  onClose: () => void
  timeSlots: TimeSlot[]
  classId: string
  selectedDate?: string
  onSessionsUpdate?: (updatedTimeSlots: TimeSlot[]) => void
  suspendedSessions?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    courtId: string;
  }>
  isRecurring?: boolean
  startDate?: string
  endDate?: string
  scheduleDays?: number[]
  specificSessions?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    price: number;
    instructors: string[];
    courtIds: string | string[];
    createdAt?: string;
  }>
}

type Step = "review" | "detail" | "edit" | "move"

export function SessionsReviewModal({
  isOpen,
  onClose,
  timeSlots,
  classId,
  selectedDate,
  onSessionsUpdate,
  suspendedSessions = [],
  isRecurring = false,
  startDate,
  endDate,
  scheduleDays = [],
  specificSessions = []
}: SessionsReviewModalProps) {
  const [step, setStep] = useState<Step>("review")
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  
  // Generar todas las sesiones basadas en la recurrencia si es necesario
  const [generatedTimeSlots, setGeneratedTimeSlots] = useState<TimeSlot[]>([]);
  
  useEffect(() => {
    if (isRecurring && startDate) {
      // Para clases recurrentes, generamos sesiones para cada día configurado
      const slots = generateRecurringSessions(timeSlots, startDate, endDate, scheduleDays);
      
      // Procesamos las sesiones específicas
      const specificTimeSlots = processSpecificSessions(specificSessions);
      
      // Combinamos ambos tipos de sesiones
      setGeneratedTimeSlots([...slots, ...specificTimeSlots]);
    } else {
      // Para clases únicas, simplemente usamos los slots proporcionados y las sesiones específicas
      const specificTimeSlots = processSpecificSessions(specificSessions);
      setGeneratedTimeSlots([...timeSlots, ...specificTimeSlots]);
    }
  }, [timeSlots, isRecurring, startDate, endDate, scheduleDays, specificSessions]);
  
  // Función para procesar las sesiones específicas
  const processSpecificSessions = (
    sessions: Array<{
      date: string;
      startTime: string;
      endTime: string;
      capacity: number;
      price: number;
      instructors: string[];
      courtIds: string | string[];
      createdAt?: string;
    }>
  ): TimeSlot[] => {
    if (!sessions.length) return [];
    
    return sessions.map((session, index) => {
      // Aseguramos que courtIds sea siempre un array
      const courtIdsArray = Array.isArray(session.courtIds) 
        ? session.courtIds 
        : [session.courtIds];
      
      return {
        id: `specific_${index}_${session.date}_${session.startTime}`,
        startTime: session.startTime,
        endTime: session.endTime,
        capacity: session.capacity,
        price: session.price,
        instructors: session.instructors,
        courtIds: courtIdsArray,
        date: session.date,
        // Verificamos si la sesión específica está suspendida
        isSuspended: suspendedSessions.some(
          suspended => 
            suspended.date === session.date && 
            suspended.startTime === session.startTime && 
            suspended.endTime === session.endTime && 
            courtIdsArray.some(courtId => courtId === suspended.courtId)
        )
      };
    });
  };
  
  // Función para generar sesiones recurrentes
  const generateRecurringSessions = (
    baseTimeSlots: TimeSlot[], 
    start: string, 
    end: string | undefined, 
    days: number[]
  ): TimeSlot[] => {
    if (!baseTimeSlots.length || !days.length) return [];
    
    const generatedSlots: TimeSlot[] = [];
    
    // Convertimos las fechas a objetos DateTime de luxon
    const startDateTime = DateTime.fromISO(start);
    const endDateTime = end ? DateTime.fromISO(end) : DateTime.now().plus({ months: 6 }); // Si no hay fecha final, usamos 6 meses desde hoy
    
    // Para mantener el ID original en sesiones generadas
    let idCounter = 0;
    
    // Iterar por cada día desde startDate hasta endDate
    let currentDate = startDateTime;
    while (currentDate <= endDateTime) {
      // Obtener el día de la semana (0-6, donde 0 es domingo)
      let weekday = currentDate.weekday === 7 ? 0 : currentDate.weekday % 7;
      
      // Verificar si este día de la semana está en la configuración
      if (days.includes(weekday)) {
        // Para cada día válido, generamos una sesión por cada timeSlot base
        for (const baseSlot of baseTimeSlots) {
          const dateStr = currentDate.toISODate() || '';
          
          // Verificar si esta sesión específica está suspendida
          const isSuspended = suspendedSessions.some(
            suspended => 
              suspended.date === dateStr && 
              suspended.startTime === baseSlot.startTime && 
              suspended.endTime === baseSlot.endTime && 
              baseSlot.courtIds.some(courtId => courtId === suspended.courtId)
          );
          
          // Crear una nueva sesión con la fecha específica
          generatedSlots.push({
            ...baseSlot,
            id: `${baseSlot.id}_${idCounter++}`,
            date: dateStr,
            isSuspended: isSuspended || baseSlot.isSuspended
          });
        }
      }
      
      // Avanzar al siguiente día
      currentDate = currentDate.plus({ days: 1 });
    }
    
    return generatedSlots;
  };
  
  // Preparar los time slots con la fecha si está disponible y marcando los suspendidos
  const timeSlotsWithDate = generatedTimeSlots.map(slot => {
    const date = slot.date || selectedDate || '';
    
    // Verificar si alguna sesión está suspendida
    const isSuspended = suspendedSessions.some(
      suspended => 
        suspended.date === date && 
        suspended.startTime === slot.startTime && 
        suspended.endTime === slot.endTime && 
        slot.courtIds.includes(suspended.courtId)
    );
    
    return {
      ...slot,
      date,
      isSuspended: isSuspended || slot.isSuspended
    };
  });
  
  // Estado interno para la fecha seleccionada
  const [internalSelectedDate, setInternalSelectedDate] = useState<string>(selectedDate || '');
  
  // Función para manejar la selección de una sesión
  const handleSessionSelect = (sessionId: string, sessionData: TimeSlot) => {
    setSelectedSessionId(sessionId)
    setStep("detail")
  }
  
  // Función para suspender una sesión
  const handleSuspendSession = async (sessionId: string) => {
    const sessionToSuspend = timeSlotsWithDate.find(slot => slot.id === sessionId);
    if (!sessionToSuspend) return Promise.resolve();
    
    try {
      // Aquí iría la llamada real a la API
      console.log(`Suspendiendo sesión ${sessionId}`);
      
      // Actualizamos el estado local para reflejar la suspensión
      const updatedTimeSlots = timeSlotsWithDate.map(slot => 
        slot.id === sessionId ? { ...slot, isSuspended: true } : slot
      );
      
      setGeneratedTimeSlots(updatedTimeSlots);
      
      // Si la sesión suspendida es la seleccionada, actualizamos su estado también
      if (selectedSessionId === sessionId) {
        // No necesitamos setSelectedSession ya que el estado se actualiza a través de timeSlotsWithDate
        // y eso se refleja cuando se accede a selectedSession mediante getSelectedSession()
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al suspender la sesión:', error);
      return Promise.reject(error);
    }
  };

  // Función para mover una sesión a otra fecha/hora
  const handleMoveSession = (sessionId: string): Promise<void> => {
    // Obtener la sesión seleccionada
    const sessionToMove = timeSlotsWithDate.find(slot => slot.id === sessionId);
    if (!sessionToMove) return Promise.resolve();
    
    // Actualizar el estado
    setSelectedSessionId(sessionId);
    setStep('move');
    
    return Promise.resolve();
  };

  // Función para completar el movimiento de la sesión
  const handleCompleteMove = async (targetSessionId: string, suspendOriginal: boolean) => {
    console.log(`Moviendo reservas de la sesión ${selectedSessionId} a la sesión ${targetSessionId}`);
    console.log(`¿Suspender sesión original? ${suspendOriginal ? 'Sí' : 'No'}`);
    
    try {
      // Aquí iría la lógica real para mover las reservas
      // Por ejemplo, una llamada a API similar a:
      // await api.moveSessionBookings(selectedSessionId, targetSessionId);
      
      // Simulamos un delay para la operación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Si se eligió suspender la original, llamamos a handleSuspendSession
      if (suspendOriginal && selectedSessionId) {
        await handleSuspendSession(selectedSessionId);
      }
      
      // Actualizamos el estado global si es necesario
      if (onSessionsUpdate) {
        onSessionsUpdate(generatedTimeSlots);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al mover la sesión:', error);
      return Promise.reject(error);
    }
  };

  // Función para manejar la selección de fecha
  const handleDateSelect = (date: string) => {
    setInternalSelectedDate(date);
  }
  
  // Función para cerrar el modal y reiniciar el estado
  const handleClose = () => {
    onClose()
    setStep("review")
    setSelectedSessionId(null)
  }
  
  // Función para volver al paso anterior
  const handleBack = () => {
    if (step === "detail") {
      setStep("review")
    } else if (step === "edit" || step === "move") {
      setStep("detail")
    }
  }
  
  // Obtener la sesión seleccionada
  const selectedSession = selectedSessionId 
    ? timeSlotsWithDate.find(slot => slot.id === selectedSessionId) 
    : null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 20 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }}
          className="fixed right-[520px] top-[10%] w-full max-w-sm bg-white rounded-xl shadow-lg z-50 border border-gray-100/50"
          style={{ transform: 'translateX(-100%)' }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">
                {step === "review" ? "Sesiones de Clase" : 
                 step === "detail" ? "Detalle de Sesión" : 
                 step === "move" ? "Mover Sesión" :
                 "Editar Sesión"}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 rounded-lg p-1 hover:bg-gray-50 transition-colors duration-200"
              >
                <IconX size={16} />
              </button>
            </div>
            
            <div className="mt-2">
              <AnimatePresence mode="wait">
                {step === "review" ? (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <SessionsReviewSection 
                      timeSlots={timeSlotsWithDate}
                      onSessionSelect={handleSessionSelect}
                      selectedDate={internalSelectedDate}
                      onDateSelect={handleDateSelect}
                    />
                  </motion.div>
                ) : step === "detail" && selectedSession ? (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <SessionDetailSection 
                      session={selectedSession}
                      classId={classId}
                      onBack={handleBack}
                      onEdit={() => setStep("edit")}
                      onMove={handleMoveSession}
                    />
                  </motion.div>
                ) : step === "move" && selectedSession ? (
                  <motion.div
                    key="move"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <SessionMoveSection
                      session={selectedSession}
                      classId={classId}
                      availableSessions={timeSlotsWithDate}
                      onBack={handleBack}
                      onMove={handleCompleteMove}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="p-4 flex justify-between">
                      <button
                        onClick={handleBack}
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          "text-xs font-medium text-gray-700",
                          "px-3 py-1.5 rounded-md",
                          "hover:bg-gray-50",
                          "transition-colors duration-200"
                        )}
                      >
                        Volver
                      </button>
                      
                      <button
                        onClick={() => setStep("detail")}
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          "text-xs font-medium text-gray-900",
                          "px-3 py-1.5 rounded-md",
                          "hover:bg-gray-50",
                          "transition-colors duration-200"
                        )}
                      >
                        Guardar
                        <IconArrowRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 