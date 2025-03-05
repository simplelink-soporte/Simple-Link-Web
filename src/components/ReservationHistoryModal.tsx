import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

interface Reservation {
  type: string
  date: string
  time: string
  courts: string[]
  rentedItems: number
  players: string[]
  instructor?: string
}

interface ReservationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

const MOCK_RESERVATIONS: Reservation[] = [
  {
    type: "Práctica",
    date: "2024-03-15",
    time: "10:00 - 11:00",
    courts: ["Cancha 1"],
    rentedItems: 2,
    players: ["Juan Pérez", "María García"],
    instructor: "Carlos Rodríguez"
  },
  {
    type: "Partido",
    date: "2024-03-14",
    time: "15:00 - 16:00",
    courts: ["Cancha 2"],
    rentedItems: 1,
    players: ["Ana López", "Pedro Sánchez", "Luis Torres", "Carmen Ruiz"],
  },
  {
    type: "Práctica",
    date: "2024-03-13",
    time: "09:00 - 10:00",
    courts: ["Cancha 4"],
    rentedItems: 3,
    players: ["Roberto Díaz"],
    instructor: "Ana Martínez"
  },
  {
    type: "Partido",
    date: "2024-03-12",
    time: "18:00 - 19:00",
    courts: ["Cancha 1"],
    rentedItems: 0,
    players: ["Miguel Ángel", "Laura Soto"],
  },
  {
    type: "Práctica",
    date: "2024-03-11",
    time: "11:00 - 12:00",
    courts: ["Cancha 2"],
    rentedItems: 0,
    players: ["Carolina Vega"],
    instructor: "David Jiménez"
  },
  {
    type: "Partido",
    date: "2024-03-10",
    time: "16:00 - 17:00",
    courts: ["Cancha 3"],
    rentedItems: 0,
    players: ["Fernando Ruiz", "Patricia López", "Gabriel Torres", "Sofía Morales"],
  },
  {
    type: "Práctica",
    date: "2024-03-09",
    time: "14:00 - 15:00",
    courts: ["Cancha 1"],
    rentedItems: 0,
    players: ["Isabel Castro"],
    instructor: "Ricardo Mendoza"
  },
  {
    type: "Partido",
    date: "2024-03-08",
    time: "20:00 - 21:00",
    courts: ["Cancha 2"],
    rentedItems: 0,
    players: ["Diego Herrera", "Valentina Ortiz"],
  },
  {
    type: "Partido",
    date: "2024-03-07",
    time: "17:00 - 18:00",
    courts: ["Cancha 3"],
    rentedItems: 0,
    players: ["Andrés Moreno", "Camila Vargas"],
  },
  {
    type: "Práctica",
    date: "2024-03-06",
    time: "12:00 - 13:00",
    courts: ["Cancha 4"],
    rentedItems: 0,
    players: ["Lucía Jiménez"],
    instructor: "Manuel Sánchez"
  }
]

export function ReservationHistoryModal({ isOpen, onClose }: ReservationHistoryModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5 // Fijamos exactamente 5 items por página
  const totalPages = Math.ceil(MOCK_RESERVATIONS.length / itemsPerPage)

  const getCurrentPageReservations = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return MOCK_RESERVATIONS.slice(startIndex, endIndex)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed right-[510px] top-[20%] -translate-y-1/2 w-[1000px] max-h-[80vh] bg-white rounded-lg shadow-lg z-50 flex flex-col"
          >
            <div className="p-6 flex flex-col h-full">
              {/* Encabezado */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Historial de Reservaciones
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="overflow-x-auto scrollbar-custom relative -mx-6">
                  <div className="inline-block min-w-full align-middle px-6">
                    <table className="min-w-full" style={{ minWidth: "800px" }}>
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tiempo
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cancha
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Artículos
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jugadores
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Instructor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {getCurrentPageReservations().map((reservation, index) => (
                          <tr 
                            key={index} 
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {reservation.type}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {format(new Date(reservation.date), "dd 'de' MMMM, yyyy", { locale: es })}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {reservation.time}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {reservation.courts[0]}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 text-center">
                              {reservation.rentedItems > 0 ? reservation.rentedItems : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {reservation.players.join(", ")}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {reservation.instructor || "—"}
                            </td>
                          </tr>
                        ))}
                        {/* Filas vacías con estilo mejorado */}
                        {getCurrentPageReservations().length < 5 && Array.from({ length: 5 - getCurrentPageReservations().length }).map((_, index) => (
                          <tr key={`empty-${index}`}>
                            <td colSpan={7} className="px-6 h-[53px]"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Paginación con estilo mejorado */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, MOCK_RESERVATIONS.length)} de {MOCK_RESERVATIONS.length} resultados
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    >
                      <IconChevronLeft className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    >
                      <IconChevronRight className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
