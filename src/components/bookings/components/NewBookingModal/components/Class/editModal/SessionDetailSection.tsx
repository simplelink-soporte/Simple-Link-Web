import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { 
  IconClock, 
  IconUsers, 
  IconCoin, 
  IconUserStar, 
  IconDisc, 
  IconChevronLeft,
  IconEdit,
  IconCalendarEvent,
  IconLoader2,
  IconAlertTriangle
} from '@tabler/icons-react'
import { SessionActionButtons } from './SessionActionButtons'
import { sessionManagementService } from '@/services/sessionManagementService'
import { useBranchContext } from '@/contexts/BranchContext'
import { courtService } from '@/services/courtService'

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

interface BookingSummary {
  count: number;
  hasFutureBookings: boolean;
  reservationDates?: string[];
  uniqueDates?: number;
  earliestDate?: string;
  latestDate?: string;
}

interface SessionDetailSectionProps {
  session: TimeSlot;
  classId: string;
  onBack: () => void;
  onEdit: () => void;
  onMove?: (sessionId: string) => Promise<void>;
}

interface Court {
  id: string;
  name: string;
  sport: string;
  court_type: string;
  surface: string;
}

// Función auxiliar para formatear el tiempo (HH:MM)
const formatTime = (time: string) => {
  return time.split(':').slice(0, 2).join(':')
}

// Función para formatear fechas en español
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export function SessionDetailSection({ 
  session, 
  classId,
  onBack, 
  onEdit,
  onMove
}: SessionDetailSectionProps) {
  const { currentBranch } = useBranchContext();
  const [bookingSummary, setBookingSummary] = useState<BookingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courts, setCourts] = useState<Record<string, Court>>({});
  const [loadingCourts, setLoadingCourts] = useState(false);
  
  // Si no hay fecha en la sesión, usar la fecha actual para tener una por defecto
  const sessionDate = session.date || new Date().toISOString().split('T')[0];
  
  // Efecto para cargar las reservas afectadas al cargar el componente
  useEffect(() => {
    const fetchBookings = async () => {
      if (!classId || !session) {
        setIsLoading(false);
        return;
      }
      
      try {
        const courtId = session.courtIds && session.courtIds.length > 0 
          ? session.courtIds[0] 
          : undefined;
        
        const result = await sessionManagementService.checkSessionBookings({
          classId,
          sessionId: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          courtId,
          date: sessionDate
        });
        
        if (result.success && result.data) {
          setBookingSummary(result.data);
        } else {
          setError(result.error?.message || 'Error al consultar reservas');
        }
      } catch (err) {
        setError('Error al consultar reservas afectadas');
        console.error('Error al consultar reservas:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookings();
  }, [classId, session, sessionDate]);
  
  // Efecto para cargar información de las pistas
  useEffect(() => {
    const fetchCourts = async () => {
      if (!session.courtIds || session.courtIds.length === 0) return;
      
      setLoadingCourts(true);
      try {
        const courtPromises = session.courtIds.map(async (courtId) => {
          const result = await courtService.getCourtById(courtId);
          if (result.data) {
            return { [courtId]: result.data };
          }
          return {}; // Retornamos un objeto vacío en lugar de null
        });
        
        const courtResults = await Promise.all(courtPromises);
        const courtsData = courtResults.reduce((acc, curr) => {
          return { ...acc, ...curr };
        }, {} as Record<string, Court>);
        
        setCourts(courtsData);
      } catch (err) {
        console.error('Error al cargar información de pistas:', err);
      } finally {
        setLoadingCourts(false);
      }
    };
    
    fetchCourts();
  }, [session.courtIds]);

  return (
    <div className="space-y-5">
      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-xs"
        >
          <IconChevronLeft size={14} />
          <span>Volver</span>
        </button>
        
        <h3 className="text-sm font-medium text-gray-900">
          Detalles de la sesión
        </h3>
      </div>

      {/* Indicador de sesión suspendida */}
      {session.isSuspended && (
        <div className={cn(
          "bg-red-50 border border-red-100 rounded-lg p-3",
          "flex items-start gap-2.5"
        )}>
          <div className="mt-0.5">
            <IconAlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-red-700">
              Sesión suspendida
            </h4>
            <p className="text-xs text-red-600 mt-0.5">
              Esta sesión ha sido suspendida y no estará disponible para reservas.
            </p>
          </div>
        </div>
      )}

      {/* Información principal en una única tarjeta */}
      <div className={cn(
        "bg-white border rounded-lg p-4 shadow-sm",
        session.isSuspended ? "border-red-100" : "border-gray-100"
      )}>
        {/* Horario de la sesión - encabezado */}
        <div className="flex items-center space-x-3 mb-3">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            session.isSuspended 
              ? "bg-red-50 border border-red-100" 
              : "bg-blue-50 border border-blue-100"
          )}>
            <IconClock size={16} className={session.isSuspended ? "text-red-500" : "text-blue-500"} />
          </div>
          <div>
            <h3 className={cn(
              "text-sm font-medium",
              session.isSuspended ? "text-red-800" : "text-gray-900"
            )}>
              {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </h3>
            <p className={cn(
              "text-xs",
              session.isSuspended ? "text-red-500" : "text-gray-500"
            )}>
              {calculateDuration(session.startTime, session.endTime)}
            </p>
          </div>
        </div>
        
        {/* Detalles de la sesión */}
        <div className="space-y-4 mt-4">
          {/* Capacidad */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconUsers size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Capacidad</span>
            </div>
            <span className="text-sm text-gray-900">
              {session.capacity} participantes
            </span>
          </div>
          
          {/* Precio */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCoin size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Precio</span>
            </div>
            <span className="text-sm text-gray-900">
              ${session.price.toFixed(2)}
            </span>
          </div>
        </div>
        
        {/* Instructores */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <IconUserStar size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">Instructores</span>
          </div>
          
          {session.instructors && session.instructors.length > 0 ? (
            <div className="space-y-2 mt-2">
              {session.instructors.map((instructor, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 py-1.5 px-2 border border-gray-100 rounded-md"
                >
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                    {instructor.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-800">{instructor}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">
              No hay instructores asignados
            </p>
          )}
        </div>
        
        {/* Pistas asignadas */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <IconDisc size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">Pistas asignadas</span>
          </div>
          
          {session.courtIds && session.courtIds.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {session.courtIds.map((courtId, index) => (
                <div 
                  key={index} 
                  className="text-xs py-1 px-2 border border-gray-100 rounded-md text-gray-800 bg-gray-50"
                >
                  {loadingCourts ? (
                    <div className="flex items-center">
                      <IconLoader2 size={12} className="animate-spin mr-1" />
                      <span>Cargando...</span>
                    </div>
                  ) : courts[courtId] ? (
                    courts[courtId].name
                  ) : (
                    `Pista ${index + 1}`
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">
              No hay pistas asignadas
            </p>
          )}
        </div>
        
        {/* Reservas afectadas */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <IconCalendarEvent size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">
              Reservas asociadas
            </span>
          </div>
          
          {isLoading ? (
            <div className="py-4 flex items-center justify-center">
              <IconLoader2 size={16} className="animate-spin mr-2 text-gray-400" />
              <span className="text-xs text-gray-500">Consultando reservas...</span>
            </div>
          ) : error ? (
            <div className="py-2 text-xs text-red-500">
              {error}
            </div>
          ) : bookingSummary ? (
            <div className="mt-2">
              {bookingSummary.hasFutureBookings ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-amber-50/50 rounded-md py-1.5 px-3 border border-amber-100/50">
                    <span className="text-xs font-medium text-amber-700">
                      Reservas activas
                    </span>
                    <span className="text-xs font-bold text-amber-700">
                      {bookingSummary.count}
                    </span>
                  </div>
                  
                  {bookingSummary.reservationDates && bookingSummary.reservationDates.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500 mb-2">Fechas con reservas:</p>
                      <div className="space-y-1">
                        {bookingSummary.reservationDates.map((date, index) => (
                          <div key={index} className="text-xs py-1 px-2 bg-gray-50 border border-gray-100 rounded-md">
                            {formatDate(date)}
                          </div>
                        ))}
                        {bookingSummary.uniqueDates && bookingSummary.uniqueDates > 5 && (
                          <div className="text-xs text-center text-gray-500 italic mt-1">
                            Y {bookingSummary.uniqueDates - 5} fechas más...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50/50 rounded-md py-1.5 px-3 border border-green-100/50">
                  <span className="text-xs font-medium text-green-700">
                    No hay reservas activas
                  </span>
                  <span className="text-xs font-bold text-green-700">
                    0
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 text-xs text-gray-500 italic">
              No hay información de reservas disponible
            </div>
          )}
        </div>
      </div>
      
      {/* Componente de botones de acción - solo mostrar si la sesión no está suspendida */}
      {!session.isSuspended && (
        <SessionActionButtons 
          sessionId={session.id}
          classId={classId}
          startTime={session.startTime}
          endTime={session.endTime}
          courtId={session.courtIds && session.courtIds.length > 0 ? session.courtIds[0] : undefined}
          bookingSummary={bookingSummary || undefined}
          date={sessionDate}
          onMove={onMove ? () => onMove(session.id) : undefined}
        />
      )}
      
      {/* Mensaje informativo cuando la sesión está suspendida */}
      {session.isSuspended && (
        <div className="mt-4 bg-red-50/70 rounded-lg p-3 border border-red-100 text-center">
          <p className="text-xs text-red-600">
            Las acciones no están disponibles para sesiones suspendidas
          </p>
        </div>
      )}
      
      {/* Botón de edición */}
      <div className="flex justify-end mt-4">
        <button
          onClick={onEdit}
          className={cn(
            "inline-flex items-center gap-1.5",
            "text-xs font-medium text-white",
            "px-3 py-1.5 rounded-md",
            "bg-blue-500 hover:bg-blue-600",
            "transition-colors duration-200"
          )}
        >
          <IconEdit size={14} />
          Editar sesión
        </button>
      </div>
    </div>
  )
}

// Función para calcular la duración entre dos horas
function calculateDuration(startTime: string, endTime: string): string {
  try {
    // Convertir a minutos
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    // Calcular diferencia
    let diffMinutes = endMinutes - startMinutes;
    
    // Si es negativo, asumir que cruza la medianoche
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }
    
    // Formatear resultado
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours === 0) {
      return `${minutes} minutos`;
    } else if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} y ${minutes} minutos`;
    }
  } catch (error) {
    return "Duración no disponible";
  }
} 