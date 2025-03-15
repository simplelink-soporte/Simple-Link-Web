"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/supabase"
import { ClassEditBasic } from "./Classeditbasic"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData?: ClassData;
  onSuccess?: () => void;
}

interface ModalHeaderProps {
  title: string
  description: string
}

interface ModalFooterProps {
  onSave: () => void
  isValid: boolean
  isSubmitting?: boolean
}

// Componente Header interno
function ModalHeader({ title, description }: ModalHeaderProps) {
  return (
    <div className="p-6 border-b">
      <h2 className="text-xl font-semibold text-gray-900">
        {title}
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        {description}
      </p>
    </div>
  )
}

// Componente Footer interno
function ModalFooter({ onSave, isValid, isSubmitting = false }: ModalFooterProps) {
  return (
    <div className="p-6 border-t">
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={!isValid || isSubmitting}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium",
            "bg-transparent text-gray-900",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Guardando...
            </span>
          ) : (
            'Guardar Cambios'
          )}
        </button>
      </div>
    </div>
  )
}

export function EditClassModal({ isOpen, onClose, classData, onSuccess }: EditClassModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [updatedData, setUpdatedData] = useState<Partial<Database['public']['Tables']['classes']['Row']>>({})
  const supabase = createClientComponentClient<Database>()

  // Manejar montaje/desmontaje
  useState(() => {
    setMounted(true)
    return () => setMounted(false)
  })

  const handleSave = async () => {
    if (!classData?.id) return

    setIsSubmitting(true)
    try {
      // Aseguramos que updatedData contenga toda la información relacionada con las sesiones
      const finalUpdatedData = {
        ...updatedData,
        updated_at: new Date().toISOString(),
        // Verificamos si hay datos de schedule_config en updatedData
        schedule_config: updatedData.schedule_config || classData.schedule_config
      }

      const { error } = await supabase
        .from('classes')
        .update(finalUpdatedData)
        .eq('id', classData.id)

      if (error) throw error

      toast.success('Clase actualizada exitosamente')
      onClose()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar la clase')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      className="flex flex-col"
    >
      <div className="h-full flex flex-col">
        <ModalHeader 
          title="Editar Clase" 
          description="Modifica los detalles de la clase"
        />

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <ClassEditBasic
            classData={classData}
            onValidationChange={setIsValid}
            onChange={setUpdatedData}
          />
        </div>

        <ModalFooter
          onSave={handleSave}
          isValid={isValid}
          isSubmitting={isSubmitting}
        />
      </div>
    </Modal>
  )
}
