import { motion } from "framer-motion"
import { IconPlus, IconTrash, IconCalendar } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { ClassSession } from "../../types"

interface SessionSelectorProps {
  sessions: ClassSession[]
  onAddSession: () => void
  onRemoveSession: (id: string) => void
  onUpdateSession: (id: string, updates: Partial<ClassSession>) => void
}

export function SessionSelector({ 
  sessions,
  onAddSession,
  onRemoveSession,
  onUpdateSession
}: SessionSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Sesiones de la clase
        </h3>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddSession}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <IconPlus className="h-4 w-4" />
          Agregar sesión
        </motion.button>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 border rounded-lg space-y-4"
          >
            <div className="flex items-center gap-4">
              <Input
                value={session.name}
                onChange={(e) => onUpdateSession(session.id, { name: e.target.value })}
                placeholder="Nombre de la sesión"
                className="flex-1"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onRemoveSession(session.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
              >
                <IconTrash className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
              <IconCalendar className="h-4 w-4 text-gray-400" />
              {session.date ? (
                <span className="text-sm text-gray-600">
                  {format(session.date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </span>
              ) : (
                <span className="text-sm text-gray-400">
                  Selecciona una fecha
                </span>
              )}
            </div>

            <CustomCalendar
              mode="single"
              selected={session.date || undefined}
              onSelect={(date) => onUpdateSession(session.id, { date })}
              locale={es}
              className="rounded-lg border shadow-sm"
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
} 