import { motion, AnimatePresence } from "framer-motion"
import { createPortal } from "react-dom"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { SingleSelect } from "@/components/ui/single-select"
import { useBranchContext } from "@/contexts/BranchContext"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { memberService } from "@/services/supabase"
import { toast } from "sonner"

interface NewMemberFormProps {
  isOpen: boolean
  onClose: () => void
}

// Opciones para el selector de género
const genderOptions = [
  { id: 'male', name: 'Hombre' },
  { id: 'female', name: 'Mujer' },
  { id: 'not_specified', name: 'Prefiero no decirlo' }
] as const

// Interfaz para los datos del formulario
interface FormData {
  firstName: string
  lastName: string
  phone: string
  email: string
  gender: string
  notes: string
}

export function NewMemberForm({ isOpen, onClose }: NewMemberFormProps) {
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    gender: '',
    notes: ''
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        const result = await memberService.createMember({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          gender: data.gender,
          notes: data.notes,
          status: 'Sin Plan'
        })

        return result
      } catch (error: any) {
        console.error('Error en createMutation:', error)
        throw new Error(error.message || 'Error al crear el miembro')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success('Miembro creado correctamente')
      onClose()
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        gender: '',
        notes: ''
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el miembro')
    }
  })

  // Manejador de cambios en los inputs
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Manejador del envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones básicas
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error('Por favor complete los campos requeridos')
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Por favor ingrese un email válido')
      return
    }

    createMutation.mutate(formData)
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-white/30 backdrop-blur-[2px] z-40"
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
          />

          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: "100%", 
              opacity: 0,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l z-50"
          >
            <div className="h-full flex flex-col p-6">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  delay: 0.1,
                  duration: 0.3,
                  ease: "easeOut"
                }}
                className="mb-6"
              >
                <div>
                  <motion.h2 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="text-xl font-semibold mb-1"
                  >
                    Registra un nuevo Miembro
                  </motion.h2>
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="text-sm text-gray-500"
                  >
                    Complete los datos del nuevo miembro
                  </motion.p>
                </div>
              </motion.div>

              <motion.form 
                onSubmit={handleSubmit}
                className="flex flex-col h-full"
              >
                <div className="space-y-6">
                  {/* Nombre y Apellido */}
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-medium text-gray-700">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={cn(
                          "w-full px-2 py-2",
                          "rounded-lg",
                          "border border-gray-200 bg-white",
                          "focus:outline-none focus:border-gray-300",
                          "transition-colors duration-200",
                          "placeholder:text-gray-400",
                          "text-sm"
                        )}
                        placeholder="Ingrese el nombre"
                      />
                    </motion.div>
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.35, duration: 0.3 }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-medium text-gray-700">
                        Apellido
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={cn(
                          "w-full px-2 py-2",
                          "rounded-lg",
                          "border border-gray-200 bg-white",
                          "focus:outline-none focus:border-gray-300",
                          "transition-colors duration-200",
                          "placeholder:text-gray-400",
                          "text-sm"
                        )}
                        placeholder="Ingrese el apellido"
                      />
                    </motion.div>
                  </div>

                  {/* Teléfono */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-gray-700">
                      Número de teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={cn(
                        "w-full px-2 py-2",
                        "rounded-lg",
                        "border border-gray-200 bg-white",
                        "focus:outline-none focus:border-gray-300",
                        "transition-colors duration-200",
                        "placeholder:text-gray-400",
                        "text-sm"
                      )}
                      placeholder="Ingrese el número de teléfono"
                    />
                  </motion.div>

                  {/* Email */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={cn(
                        "w-full px-2 py-2",
                        "rounded-lg",
                        "border border-gray-200 bg-white",
                        "focus:outline-none focus:border-gray-300",
                        "transition-colors duration-200",
                        "placeholder:text-gray-400",
                        "text-sm"
                      )}
                      placeholder="Ingrese el email"
                    />
                  </motion.div>

                  {/* Género */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-gray-700">
                      Género
                    </label>
                    <SingleSelect
                      value={formData.gender}
                      onChange={(value) => handleInputChange('gender', value)}
                      options={genderOptions}
                      placeholder="Seleccione el género"
                    />
                  </motion.div>

                  {/* Notas */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.55, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-gray-700">
                      Notas
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className={cn(
                        "w-full px-2 py-2",
                        "rounded-lg",
                        "border border-gray-200 bg-white",
                        "focus:outline-none focus:border-gray-300",
                        "transition-colors duration-200",
                        "placeholder:text-gray-400",
                        "text-sm",
                        "min-h-[100px] resize-none"
                      )}
                      placeholder="Agregue notas adicionales..."
                    />
                  </motion.div>
                </div>

                {/* Botones de acción */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  className="pt-6 flex gap-3 mt-auto border-t bg-white"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={createMutation.isPending}
                    className={cn(
                      "flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors",
                      createMutation.isPending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {createMutation.isPending ? 'Creando...' : 'Crear'}
                  </motion.button>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(modalContent, document.body)
}
