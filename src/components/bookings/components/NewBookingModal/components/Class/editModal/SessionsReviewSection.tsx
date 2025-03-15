import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { IconClock, IconCalendar, IconChevronRight, IconAlertTriangle, IconChevronLeft, IconChevronDown } from '@tabler/icons-react'

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

interface SessionsReviewSectionProps {
  timeSlots: TimeSlot[];
  onSessionSelect: (sessionId: string, data: TimeSlot) => void;
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
}

// Función auxiliar para formatear el tiempo (HH:MM)
const formatTime = (time: string) => {
  return time.split(':').slice(0, 2).join(':')
}

// Función para formatear la fecha
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export function SessionsReviewSection({ timeSlots, onSessionSelect, selectedDate: propSelectedDate, onDateSelect }: SessionsReviewSectionProps) {
  // Estado para rastrear sobre qué elemento está el ratón
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Estado para la fecha seleccionada en el calendario
  const [selectedDate, setSelectedDate] = useState<string>(propSelectedDate || '');
  // Estado para el mes y año actuales del calendario - SIEMPRE INICIALIZAR CON EL DÍA ACTUAL
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Filtrar las sesiones por fecha seleccionada
  const filteredTimeSlots = useMemo(() => {
    if (!selectedDate) return timeSlots;
    return timeSlots.filter(slot => slot.date === selectedDate);
  }, [timeSlots, selectedDate]);

  // Función para manejar la selección de fecha
  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (onDateSelect) {
      onDateSelect(dateStr);
    }
  };

  // Función para generar los días del mes actual
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
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
  
  // Cambiar al mes anterior
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  // Cambiar al mes siguiente
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Formatear fecha YYYY-MM-DD
  const formatYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Determinar si una fecha tiene sesiones programadas
  const hasSessionsOnDate = (dateStr: string) => {
    return timeSlots.some(slot => slot.date === dateStr);
  };

  return (
    <div className="space-y-4">
      {/* Sección de información */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium text-gray-900/75">
            Sesiones programadas
          </h3>
          <p className="text-xs text-gray-500/75">
            Selecciona una sesión para ver más detalles
          </p>
        </div>
        
        {/* Calendario integrado directamente */}
        <div className="bg-white border border-gray-200 rounded-md p-2">
          {/* Encabezado del calendario */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <IconChevronLeft size={16} className="text-gray-600" />
            </button>
            <span className="text-xs font-medium text-gray-800">
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <IconChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
          
          {/* Días de la semana */}
          <div className="grid grid-cols-7 text-center">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
              <div key={index} className="text-xs text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Días del mes */}
          <div className="grid grid-cols-7 text-center">
            {getDaysInMonth().map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="h-7" />;
              }
              
              const dateStr = formatYYYYMMDD(day);
              const isSelected = dateStr === selectedDate;
              const hasSessions = hasSessionsOnDate(dateStr);
              
              return (
                <div 
                  key={dateStr} 
                  className="py-1 px-1"
                >
                  <button
                    onClick={() => handleDateSelect(dateStr)}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors",
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
          
          {/* Pie del calendario */}
          <div className="flex justify-between items-center pt-1.5">
            <button
              onClick={() => {
                setSelectedDate('');
                if (onDateSelect) onDateSelect('');
              }}
              className="text-xs text-gray-700 hover:text-gray-900 font-medium"
            >
              Ver todas
            </button>
            <button
              onClick={() => {
                const today = formatYYYYMMDD(new Date());
                setSelectedDate(today);
                if (onDateSelect) onDateSelect(today);
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded-md font-medium"
            >
              Hoy
            </button>
          </div>
        </div>
      </div>

      {/* Lista de sesiones */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-gray-900">
            Sesiones disponibles
          </h4>
          <span className="text-xs text-gray-500">
            {filteredTimeSlots.length} {filteredTimeSlots.length === 1 ? 'sesión' : 'sesiones'}
          </span>
        </div>

        {filteredTimeSlots.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-500">
            {selectedDate 
              ? "No hay sesiones programadas para esta fecha" 
              : "No hay sesiones configuradas"}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTimeSlots.map((slot) => (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "px-3 py-2 rounded-md",
                  "border transition-colors duration-200 cursor-pointer",
                  "flex items-center justify-between",
                  slot.isSuspended 
                    ? "bg-red-50/70 hover:bg-red-100/80 border-red-100"
                    : "bg-transparent hover:bg-gray-100 border-gray-100"
                )}
                onClick={() => onSessionSelect(slot.id, slot)}
                onMouseEnter={() => setHoveredId(slot.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="space-y-1.5">
                  {/* Indicador de suspensión */}
                  {slot.isSuspended && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <IconAlertTriangle size={14} className="text-red-500" />
                      <span className="text-xs font-medium text-red-600">
                        Sesión suspendida
                      </span>
                    </div>
                  )}
                  
                  {/* Horario - Información principal */}
                  <div className="flex items-center gap-1.5">
                    <IconClock size={14} className={slot.isSuspended ? "text-red-400" : "text-gray-400"} />
                    <span className={cn(
                      "text-xs font-medium", 
                      slot.isSuspended ? "text-red-700" : "text-gray-800"
                    )}>
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                  </div>
                  
                  {/* Fecha */}
                  {slot.date && (
                    <div className="flex items-center gap-1.5">
                      <IconCalendar size={14} className={slot.isSuspended ? "text-red-400" : "text-gray-400"} />
                      <span className={cn(
                        "text-xs", 
                        slot.isSuspended ? "text-red-600" : "text-gray-600"
                      )}>
                        {formatDate(slot.date)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Flecha de navegación */}
                <IconChevronRight 
                  size={16} 
                  className={cn(
                    "transition-all duration-200",
                    hoveredId === slot.id ? "transform translate-x-1" : "",
                    slot.isSuspended 
                      ? "text-red-300 hover:text-red-500" 
                      : "text-gray-300 hover:text-gray-500"
                  )}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="mt-2 text-xs text-gray-500 italic text-center">
        Haz clic en una sesión para ver todos los detalles
      </div>
    </div>
  )
} 