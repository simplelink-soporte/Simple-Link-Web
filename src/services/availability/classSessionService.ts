import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { DateTime } from 'luxon';
import bookingTransformer from './bookingTransformerService';

interface ClassSession {
  class_id: string;
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

/**
 * Servicio especializado en la gestión de sesiones de clases
 * Proporciona funcionalidades para obtener sesiones de clases para un día específico
 */
class ClassSessionService {
  private static instance: ClassSessionService;

  private constructor() {}

  public static getInstance(): ClassSessionService {
    if (!ClassSessionService.instance) {
      ClassSessionService.instance = new ClassSessionService();
    }
    return ClassSessionService.instance;
  }

  /**
   * Obtiene todas las sesiones de clases para una fecha y canchas específicas
   * Incluye tanto sesiones regulares (basadas en days) como sesiones específicas
   */
  public async getClassSessions(date: Date, courtIds: string[] = [], empresaId?: string): Promise<ClassSession[]> {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      
      console.log('ClassSessionService - getClassSessions:', {
        fecha: formattedDate,
        diaSemana: dayOfWeek,
        canchas: courtIds.length,
        empresaId: empresaId || 'no especificado'
      });

      if (!courtIds.length) {
        console.log('ClassSessionService - No hay canchas especificadas para buscar sesiones');
        return [];
      }
      
      // 1. Obtener todas las clases activas que podrían tener sesiones en esta fecha
      const classQuery = supabase
        .from('classes')
        .select('*')
        .eq('status', 'active');

      // Añadir filtro de empresa si se proporciona
      if (empresaId) {
        classQuery.eq('empresa_id', empresaId);
      }
      
      // Filtrar clases que estén vigentes en la fecha consultada
      // (fecha de inicio <= fecha consultada Y (sin fecha fin O fecha fin >= fecha consultada))
      classQuery
        .lte('start_date', formattedDate)
        .or(`end_date.is.null,end_date.gte.${formattedDate}`);

      const { data: classes, error } = await classQuery;
      
      if (error) {
        console.error('Error al obtener clases activas:', error);
        return [];
      }
      
      if (!classes || classes.length === 0) {
        console.log('ClassSessionService - No se encontraron clases activas para la fecha:', formattedDate);
        return [];
      }
      
      console.log(`ClassSessionService - Se encontraron ${classes.length} clases activas para la fecha ${formattedDate}`);

      // 2. Procesar cada clase para extraer sus sesiones
      let allSessions: ClassSession[] = [];
      // Recolectar todas las sesiones suspendidas para filtrar después
      let suspendedSessions: ClassSession[] = [];
      
      for (const classItem of classes) {
        try {
          const scheduleConfig = classItem.schedule_config;
          
          if (!scheduleConfig) {
            console.log(`ClassSessionService - La clase ${classItem.id} no tiene configuración de horarios`);
            continue;
          }
          
          // 2.1 Primero recolectamos las sesiones suspendidas para usarlas como filtro
          if (scheduleConfig.suspendedSessions && Array.isArray(scheduleConfig.suspendedSessions)) {
            const suspendedSessionsForDate = scheduleConfig.suspendedSessions.filter(
              (session: any) => session.date === formattedDate
            );
            
            if (suspendedSessionsForDate.length > 0) {
              console.log(`ClassSessionService - Se encontraron ${suspendedSessionsForDate.length} sesiones suspendidas para la fecha ${formattedDate} en la clase ${classItem.id}`);
              
              const processedSuspendedSessions = this.processSuspendedSessions(
                suspendedSessionsForDate,
                classItem.id,
                formattedDate,
                courtIds
              );
              
              suspendedSessions = [...suspendedSessions, ...processedSuspendedSessions];
            }
          }
          
          // 2.2 Procesar sesiones específicas
          if (scheduleConfig.specificSessions && Array.isArray(scheduleConfig.specificSessions)) {
            const specificSessionsForDate = scheduleConfig.specificSessions.filter(
              (session: any) => session.date === formattedDate
            );
            
            if (specificSessionsForDate.length > 0) {
              console.log(`ClassSessionService - Se encontraron ${specificSessionsForDate.length} sesiones específicas para la fecha ${formattedDate} en la clase ${classItem.id}`);
              
              const specificSessions = this.processSpecificSessions(
                specificSessionsForDate,
                classItem.id,
                formattedDate,
                courtIds
              );
              
              allSessions = [...allSessions, ...specificSessions];
            }
          }
          
          // 2.3 Procesar sesiones regulares (basadas en días de la semana)
          // Solo procesar si la clase es recurrente
          if (classItem.is_recurring) {
            const days = scheduleConfig.days || [];
            
            // Verificar si esta clase tiene sesiones en el día de la semana actual
            if (days.includes(dayOfWeek)) {
              console.log(`ClassSessionService - La clase ${classItem.id} tiene sesiones regulares los ${this.getDayName(dayOfWeek)}`);
              
              const regularSessions = this.processRegularSessions(
                scheduleConfig.timeSlots || [],
                classItem.id,
                formattedDate,
                courtIds
              );
              
              allSessions = [...allSessions, ...regularSessions];
            }
          } 
          // Si la clase no es recurrente, verificar si coincide con la fecha de inicio
          else if (classItem.start_date === formattedDate) {
            console.log(`ClassSessionService - La clase única ${classItem.id} ocurre en la fecha ${formattedDate}`);
            
            const uniqueSessions = this.processRegularSessions(
              scheduleConfig.timeSlots || [],
              classItem.id,
              formattedDate,
              courtIds
            );
            
            allSessions = [...allSessions, ...uniqueSessions];
          }
        } catch (classError) {
          console.error(`Error al procesar la clase ${classItem.id}:`, classError);
        }
      }
      
      // 3. Filtrar las sesiones para eliminar las que están suspendidas
      const filteredSessions = this.filterSuspendedSessions(allSessions, suspendedSessions);
      
      console.log(`ClassSessionService - Total de sesiones de clase encontradas: ${filteredSessions.length} (después de filtrar ${suspendedSessions.length} sesiones suspendidas)`);
      return filteredSessions;
      
    } catch (error) {
      console.error('Error en getClassSessions:', error);
      return [];
    }
  }
  
  /**
   * Procesa sesiones específicas para una fecha
   */
  private processSpecificSessions(
    specificSessions: any[],
    classId: string,
    date: string,
    courtIds: string[]
  ): ClassSession[] {
    const sessions: ClassSession[] = [];
    
    for (const session of specificSessions) {
      try {
        // Verificar que la sesión tenga los datos necesarios
        if (!session.startTime || !session.endTime) {
          console.warn('ClassSessionService - Sesión específica sin horarios definidos:', session);
          continue;
        }
        
        // En sesiones específicas, courtIds puede ser un string o un array
        let sessionCourtIds: string[] = [];
        
        if (typeof session.courtIds === 'string') {
          sessionCourtIds = [session.courtIds];
        } else if (Array.isArray(session.courtIds)) {
          sessionCourtIds = session.courtIds;
        } else {
          console.warn('ClassSessionService - Formato de courtIds no reconocido en sesión específica:', session.courtIds);
          continue;
        }
        
        // Filtrar solo las canchas que nos interesan
        const relevantCourtIds = sessionCourtIds.filter(id => courtIds.includes(id));
        
        if (relevantCourtIds.length === 0) {
          continue; // Esta sesión no afecta a ninguna de las canchas consultadas
        }
        
        // Crear una sesión por cada cancha afectada
        for (const courtId of relevantCourtIds) {
          sessions.push({
            class_id: classId,
            court_id: courtId,
            date,
            start_time: session.startTime,
            end_time: session.endTime
          });
        }
        
      } catch (error) {
        console.error('Error al procesar sesión específica:', error);
      }
    }
    
    return sessions;
  }
  
  /**
   * Procesa sesiones suspendidas para una fecha
   */
  private processSuspendedSessions(
    suspendedSessions: any[],
    classId: string,
    date: string,
    courtIds: string[]
  ): ClassSession[] {
    const sessions: ClassSession[] = [];
    
    for (const session of suspendedSessions) {
      try {
        // Verificar que la sesión tenga los datos necesarios
        if (!session.startTime || !session.endTime || !session.courtId) {
          console.warn('ClassSessionService - Sesión suspendida sin datos completos:', session);
          continue;
        }
        
        // En sesiones suspendidas, courtId es un string (a diferencia de las sesiones normales que usan courtIds)
        const sessionCourtId = session.courtId;
        
        // Verificar si la cancha suspendida está entre las que nos interesan
        if (!courtIds.includes(sessionCourtId)) {
          continue; // Esta sesión no afecta a ninguna de las canchas consultadas
        }
        
        // Crear la sesión suspendida
        sessions.push({
          class_id: classId,
          court_id: sessionCourtId,
          date,
          start_time: session.startTime,
          end_time: session.endTime
        });
        
        console.log(`ClassSessionService - Procesada sesión suspendida para la fecha ${date} en cancha ${sessionCourtId}: ${session.startTime}-${session.endTime}, suspendida el ${session.suspendedAt}`);
        
      } catch (error) {
        console.error('Error al procesar sesión suspendida:', error);
      }
    }
    
    return sessions;
  }

  /**
   * Procesa los slots de tiempo regulares de una clase
   */
  private processRegularSessions(
    timeSlots: any[],
    classId: string,
    date: string,
    courtIds: string[]
  ): ClassSession[] {
    const sessions: ClassSession[] = [];
    
    for (const slot of timeSlots) {
      try {
        // Verificar que el slot tenga los datos necesarios
        if (!slot.startTime || !slot.endTime || !Array.isArray(slot.courtIds)) {
          console.warn('ClassSessionService - Slot de tiempo sin datos completos:', slot);
          continue;
        }
        
        // Filtrar solo las canchas que nos interesan
        const relevantCourtIds = slot.courtIds.filter((id: string) => courtIds.includes(id));
        
        if (relevantCourtIds.length === 0) {
          continue; // Este slot no afecta a ninguna de las canchas consultadas
        }
        
        // Crear una sesión por cada cancha afectada
        for (const courtId of relevantCourtIds) {
          sessions.push({
            class_id: classId,
            court_id: courtId,
            date,
            start_time: slot.startTime,
            end_time: slot.endTime
          });
        }
        
      } catch (error) {
        console.error('Error al procesar slot de tiempo regular:', error);
      }
    }
    
    return sessions;
  }

  /**
   * Convierte número de día de la semana a nombre
   */
  private getDayName(dayOfWeek: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek] || `Día ${dayOfWeek}`;
  }

  /**
   * Convierte sesiones de clase al formato compatible con bookings
   * para poder utilizar la lógica existente de verificación de disponibilidad
   */
  public convertSessionsToBookingFormat(sessions: ClassSession[]): any[] {
    return sessions.map(session => ({
      id: `class-session-${session.class_id}-${session.date}-${session.start_time}`,
      court_id: session.court_id,
      date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      payment_status: 'confirmed', // Marcar como confirmada para que siempre se considere ocupada
      reservation_type: 'class' // Añadir tipo para distinguir de reservas normales
    }));
  }

  /**
   * Filtra las sesiones para eliminar las que están suspendidas
   */
  private filterSuspendedSessions(allSessions: ClassSession[], suspendedSessions: ClassSession[]): ClassSession[] {
    return allSessions.filter(session => {
      const suspendedSession = suspendedSessions.find(s => 
        s.class_id === session.class_id && 
        s.court_id === session.court_id && 
        s.date === session.date && 
        s.start_time === session.start_time && 
        s.end_time === session.end_time
      );
      return !suspendedSession;
    });
  }
}

// Exportar la instancia singleton
export default ClassSessionService.getInstance();
