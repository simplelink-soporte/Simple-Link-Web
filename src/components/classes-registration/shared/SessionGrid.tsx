import { motion } from "framer-motion"
import { IconCalendar } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { ClassSession } from "../types"

interface SessionGridProps {
  sessions: ClassSession[]
  selectedSessions: string[]
  maxSessions?: number
  onSelect: (session: ClassSession) => void
}

export function SessionGrid({ sessions, selectedSessions, maxSessions = 1, onSelect }: SessionGridProps) {
  return (
    <div className="grid gap-3">
      {sessions.map((session, index) => {
        const sessionKey = `${session.date}-${session.startTime}-${session.endTime}`
        const isSelected = selectedSessions.includes(sessionKey)
        const date = new Date(session.date)
        
        return (
          <motion.button
            key={index}
            onClick={() => {
              // Solo permitir seleccionar si no hemos alcanzado el máximo
              if (!isSelected && selectedSessions.length >= maxSessions) return
              onSelect(session)
            }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative w-full p-4 rounded-lg border text-left",
              "transition-all duration-200",
              isSelected
                ? "bg-gray-50 border-gray-900/10 shadow-sm"
                : selectedSessions.length >= maxSessions && !isSelected
                ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                : "bg-white border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                {/* Fecha y hora */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <IconCalendar className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <span className="text-sm text-gray-600">
                      {date.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {session.startTime} - {session.endTime}
                  </div>
                </div>
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
} 