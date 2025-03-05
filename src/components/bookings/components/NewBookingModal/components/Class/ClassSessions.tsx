import { motion } from "framer-motion"

import { format } from "date-fns"

import { es } from "date-fns/locale"

import { IconPlus, IconX, IconCalendar, IconClock } from "@tabler/icons-react"

import { Calendar } from "@/components/ui/calendar"

import { cn } from "@/lib/utils"

import type { TimeSelection, ClassSession } from "../../types"



interface ClassSessionsProps {

  selectedDate?: Date

  timeSelection?: TimeSelection

  sessions: ClassSession[]

  onAddSession: () => void

  onRemoveSession: (id: string) => void

  onSessionUpdate: (id: string, updates: Partial<ClassSession>) => void

  onSessionDateSelect: (id: string, date: Date) => void

  onSessionRecurringToggle: (id: string) => void

}



export function ClassSessions({

  selectedDate,

  timeSelection,

  sessions,

  onAddSession,

  onRemoveSession,

  onSessionUpdate,

  onSessionDateSelect,

  onSessionRecurringToggle

}: ClassSessionsProps) {

  return (

    <div className="space-y-6">

      {/* Lista de Sesiones */}

      <div className="space-y-2">

        <div className="flex items-center justify-between">

          <label className="text-sm font-medium text-gray-700">

            Sesiones

          </label>

          <div className="flex items-center gap-2">

            <span className="text-xs text-gray-500">

              {sessions.length} {sessions.length === 1 ? 'clase' : 'clases'}

            </span>

            {timeSelection && (

              <>

                <span className="text-xs text-gray-400">·</span>

                <span className="text-xs text-gray-500">

                  {timeSelection.startTime} a {timeSelection.endTime}

                </span>

                <span className="text-xs text-gray-400">·</span>

                <span className="text-xs text-gray-500">

                  {timeSelection.duration} minutos

                </span>

              </>

            )}

          </div>

        </div>



        <div className="space-y-3">

          {sessions.map((session, index) => (

            <motion.div

              key={session.id}

              initial={{ opacity: 0, y: 10 }}

              animate={{ opacity: 1, y: 0 }}

              className="group relative"

            >

              <div className={cn(

                "flex items-center gap-3 p-3 rounded-lg border bg-white transition-all duration-200",

                "hover:border-gray-300"

              )}>

                <div className="w-6 flex justify-center">

                  <span className="text-sm text-gray-500">

                    {index + 1}

                  </span>

                </div>

                <div className="flex-1 min-w-0">

                  <input

                    type="text"

                    value={session.name}

                    onChange={(e) => onSessionUpdate(session.id, { name: e.target.value })}

                    className={cn(

                      "w-full bg-transparent text-sm font-medium text-gray-900",

                      "focus:outline-none placeholder:text-gray-400"

                    )}

                    placeholder="Nombre de la clase"

                  />

                </div>



                <div className="flex items-center gap-2">

                  <div className="relative">

                    <Calendar

                      mode="single"

                      selected={session.date || undefined}

                      onSelect={(date) => date && onSessionDateSelect(session.id, date)}

                      locale={es}

                      className="rounded-md border"

                    />

                    {session.date && (

                      <div className="mt-1 flex items-center justify-between">

                        <button

                          onClick={() => onSessionRecurringToggle(session.id)}

                          className={cn(

                            "text-xs px-2 py-1 rounded-full transition-colors",

                            session.isRecurring

                              ? "bg-purple-100 text-purple-700 hover:bg-purple-200"

                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"

                          )}

                        >

                          {session.isRecurring ? 'Clase Fija' : 'Clase Única'}

                        </button>

                      </div>

                    )}

                  </div>



                  <button

                    onClick={() => onRemoveSession(session.id)}

                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"

                  >

                    <IconX className="w-4 h-4 text-gray-500" />

                  </button>

                </div>

              </div>



              {session.isRecurring && session.date && (

                <motion.div

                  initial={{ opacity: 0 }}

                  animate={{ opacity: 1 }}

                  className="text-xs text-gray-500 mt-1 ml-9"

                >

                  Todos los {format(session.date, "EEEE", { locale: es })}

                </motion.div>

              )}

            </motion.div>

          ))}

        </div>



        <button

          onClick={onAddSession}

          className={cn(

            "w-full mt-2 py-2 px-3 rounded-lg border border-dashed",

            "text-sm text-gray-500 hover:text-gray-700",

            "bg-gray-50/50 hover:bg-gray-50",

            "transition-all duration-200",

            "flex items-center justify-center gap-2"

          )}

        >

          <IconPlus className="w-4 h-4" />

          <span>Agregar clase</span>

        </button>

      </div>



      {/* Resumen */}

      <motion.div

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        className="p-4 bg-gray-50 rounded-lg border border-gray-100"

      >

        <div className="space-y-2">

          <h4 className="text-sm font-medium text-gray-900">

            Resumen de la Clase

          </h4>

          <div className="space-y-1">

            <p className="text-sm text-gray-600">

              {sessions.length} {sessions.length === 1 ? 'clase' : 'clases'} de {timeSelection?.duration || 0} minutos

            </p>

            <p className="text-sm text-gray-600">

              {sessions.filter(s => s.isRecurring).length} clases fijas

            </p>

          </div>

        </div>

      </motion.div>

    </div>

  )

} 
