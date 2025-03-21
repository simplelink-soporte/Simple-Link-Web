import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { IconMail, IconPhone, IconUser, IconChevronRight, IconSearch, IconX } from '@tabler/icons-react'
import type { Participant } from '@/types/bookings'
import { useEffect, useState } from 'react'
import { ClassParticipantService, ClassParticipant } from '@/services/classParticipantService'

interface EnrolledParticipantsSectionProps {
  participants: Participant[]
  classId?: string
  date?: string        // Fecha de la sesión
  startTime?: string   // Hora de inicio de la sesión
  endTime?: string     // Hora de fin de la sesión
  branchId?: string    // ID de la sede para la conversión de zona horaria
  onSelectParticipant: (participant: ClassParticipant) => void
}

export function EnrolledParticipantsSection({ 
  participants, 
  classId,
  date,
  startTime,
  endTime,
  branchId,
  onSelectParticipant 
}: EnrolledParticipantsSectionProps) {
  const [classParticipants, setClassParticipants] = useState<ClassParticipant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<ClassParticipant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassParticipants = async () => {
      if (classId) {
        setIsLoading(true);
        setError(null);
        
        try {
          const participantService = new ClassParticipantService();
          
          // Pasamos los parámetros de filtrado si están disponibles
          const fetchedParticipants = await participantService.getClassParticipants(
            classId, 
            {
              date,
              startTime,
              endTime,
              branchId
            }
          );
          
          setClassParticipants(fetchedParticipants);
          setFilteredParticipants(fetchedParticipants);
          
          // Mostrar información sobre los filtros aplicados
          const filterInfo = [];
          if (date) filterInfo.push(`fecha: ${date}`);
          if (startTime) filterInfo.push(`inicio: ${startTime}`);
          if (endTime) filterInfo.push(`fin: ${endTime}`);
          
          console.log(`Participantes cargados: ${fetchedParticipants.length}${filterInfo.length > 0 ? ' (filtros: ' + filterInfo.join(', ') + ')' : ''}`);
        } catch (err) {
          console.error('Error al obtener participantes:', err);
          setError('No se pudieron cargar los participantes de la clase');
        } finally {
          setIsLoading(false);
        }
      } else if (participants.length > 0) {
        // Si no hay classId pero tenemos participantes directamente
        const mappedParticipants = participants.map(p => ({
          id: p.id,
          userId: p.memberId || '',
          fullName: p.firstName && p.lastName 
            ? `${p.firstName} ${p.lastName}` 
            : p.name,
          email: p.email,
          phone: p.phone,
          role: p.role as any
        }));
        
        setClassParticipants(mappedParticipants);
        setFilteredParticipants(mappedParticipants);
      }
    };

    fetchClassParticipants();
  }, [classId, participants, date, startTime, endTime, branchId]);

  // Filtrar participantes cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredParticipants(classParticipants);
    } else {
      const filtered = classParticipants.filter(participant => 
        participant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (participant.email && participant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (participant.phone && participant.phone.includes(searchTerm))
      );
      setFilteredParticipants(filtered);
    }
  }, [searchTerm, classParticipants]);

  const handleParticipantClick = (participant: ClassParticipant) => {
    onSelectParticipant(participant);
  };

  // Función para obtener el color de la barra indicadora lateral según el estado de pago
  const getBorderColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/60';
      case 'partial': return 'bg-blue-500/60';
      case 'completed': return 'bg-green-500/60';
      case 'cancelled': return 'bg-red-500/60';
      default: return 'bg-gray-400/60';
    }
  };

  // Función para obtener el color de fondo sutil según el estado
  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50';
      case 'partial': return 'bg-blue-50';
      case 'completed': return 'bg-green-50';
      case 'cancelled': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };

  // Función para obtener el texto del estado de pago en español
  const getPaymentStatusText = (status?: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'partial': return 'Parcial';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  // Función para verificar si una reserva tiene garantía
  const hasGuarantee = (bookingDetails?: any) => {
    return bookingDetails?.payment_type === 'guarantee';
  };

  // Función para obtener el texto de garantía
  const getGuaranteeText = () => {
    return 'Con garantía';
  };

  // Limpiar el campo de búsqueda
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="space-y-4">
      {/* Header con información */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-gray-900/75">
          Participantes inscriptos
        </h3>
        <p className="text-xs text-gray-500/75">
          Lista de participantes actualmente inscriptos en la clase
        </p>
      </div>

      {/* Buscador */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <IconSearch size={16} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar participante..."
          className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-2 flex items-center"
          >
            <IconX size={14} className="text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Estado de carga */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-pulse space-y-2">
            <div className="h-2 w-32 mx-auto bg-gray-200 rounded"></div>
            <div className="h-2 w-24 mx-auto bg-gray-200 rounded"></div>
            <div className="h-2 w-28 mx-auto bg-gray-200 rounded"></div>
            <div className="text-xs text-gray-400 mt-2 text-center">
              Cargando participantes...
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && !isLoading && (
        <div className="p-3 rounded-md bg-red-50 border border-red-100 text-xs text-red-600">
          <p className="text-sm font-medium text-red-800 mb-1">Error al cargar participantes</p>
          {error}
        </div>
      )}

      {/* Lista de participantes */}
      {!isLoading && !error && (
        <div className="space-y-1.5">
          {filteredParticipants.length === 0 ? (
            searchTerm ? (
              <div className="text-center py-6">
                <p className="text-xs text-gray-500">
                  No se encontraron participantes que coincidan con "{searchTerm}"
                </p>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
                  <IconUser size={16} className="text-gray-400" />
                </div>
                <p className="text-xs text-gray-500">
                  No hay participantes inscriptos en esta clase
                </p>
              </div>
            )
          ) : (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-medium text-gray-900">
                  Lista de participantes
                </h4>
                <span className="text-xs text-gray-500">
                  {filteredParticipants.length} {filteredParticipants.length === 1 ? 'participante' : 'participantes'}
                </span>
              </div>
              <div className="relative">
                {filteredParticipants.length > 5 && (
                  <div className="absolute -bottom-0.5 left-0 right-1.5 h-6 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
                )}
                <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1.5 rounded-md">
                  {filteredParticipants.map((participant) => (
                    <motion.button
                      key={participant.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "w-full px-2.5 py-1.5 rounded-md text-left relative overflow-hidden",
                        "border border-gray-100/75 bg-white",
                        "transition-all duration-200 hover:bg-gray-50/70",
                        "focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      )}
                      onClick={() => handleParticipantClick(participant)}
                    >
                      {/* Barra indicadora lateral */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-[4px]",
                        participant.bookingDetails ? getBorderColor(participant.bookingDetails.payment_status) : 'bg-gray-200'
                      )} />
                      <div className="flex items-center gap-2 pl-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {participant.fullName}
                          </p>
                          
                          {/* Estado del pago como texto gris y más pequeño */}
                          {participant.bookingDetails && (
                            <div className="flex flex-wrap gap-1 items-center mt-0.5">
                              <span className="text-[10px] text-gray-500 block">
                                {getPaymentStatusText(participant.bookingDetails.payment_status)}
                              </span>
                              
                              {/* Indicador de garantía */}
                              {hasGuarantee(participant.bookingDetails) && (
                                <span className="text-[10px] bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded-full border border-purple-200">
                                  {getGuaranteeText()}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {participant.email && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 truncate mt-0.5">
                              <IconMail size={11} />
                              <span className="truncate">{participant.email}</span>
                            </div>
                          )}
                        </div>
                        
                        <IconChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}