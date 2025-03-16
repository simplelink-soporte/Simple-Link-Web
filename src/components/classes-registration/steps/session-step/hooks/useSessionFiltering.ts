import { useState, useCallback, useMemo } from 'react';
import { ClassSession } from '../../../types/models';

/**
 * Hook para filtrar sesiones basado en parámetros de búsqueda
 * 
 * Este hook proporciona:
 * - Un estado para el texto de búsqueda (query)
 * - Función para actualizar el texto de búsqueda
 * - Lógica para filtrar sesiones según criterios como fecha, instructor, etc.
 * - Sesiones filtradas como resultado
 */
export function useSessionFiltering({
  sessions = [],
}: {
  sessions?: ClassSession[];
}) {
  // Estado para la consulta de búsqueda
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Función para actualizar la consulta de búsqueda
  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  
  // Lógica de filtrado usando useMemo para optimizar rendimiento
  const filteredSessions = useMemo(() => {
    // Si no hay consulta de búsqueda, devolver todas las sesiones
    if (!searchQuery.trim()) {
      return sessions;
    }
    
    // Convertir la consulta a minúsculas para búsqueda insensible a mayúsculas
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    // Filtrar sesiones basado en múltiples criterios
    return sessions.filter((session) => {
      // Buscar en fecha (formato: YYYY-MM-DD)
      const dateMatches = session.date.toLowerCase().includes(normalizedQuery);
      
      // Buscar en rango horario
      const timeMatches = 
        session.startTime.toLowerCase().includes(normalizedQuery) || 
        session.endTime.toLowerCase().includes(normalizedQuery);
      
      // Buscar en nombre de instructor si existe
      const instructorMatches = session.instructor 
        ? session.instructor.toLowerCase().includes(normalizedQuery) 
        : false;
      
      // Buscar en nombre de cancha si existe
      const courtMatches = session.courts && session.courts.length > 0 
        ? session.courts[0].name.toLowerCase().includes(normalizedQuery) 
        : false;
      
      // Devolver true si coincide con cualquiera de los criterios
      return dateMatches || timeMatches || instructorMatches || courtMatches;
    });
  }, [sessions, searchQuery]);
  
  // Devolver los valores y funciones necesarios
  return {
    searchQuery,
    updateSearchQuery,
    filteredSessions,
    hasActiveFilter: searchQuery.trim().length > 0,
    clearFilter: () => setSearchQuery(''),
  };
}
