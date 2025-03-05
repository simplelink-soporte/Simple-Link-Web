"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-3"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { IconHelpCircle } from "@tabler/icons-react"

interface NewMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (memberData: MemberFormData) => void
  branches: { id: number; name: string }[]
}

interface MemberFormData {
  name: string
  branch?: string
  role: 'admin' | 'manager' | 'employee'
}

const ROLES = {
  admin: {
    label: 'Administrador',
    permissions: [
      'Acceso a todas las sedes',
      'Reportes y análisis',
      'Configuración de empresa',
      'Gestión de sucursales',
      'Gestión de miembros',
      'Configuración de precios',
      'Gestión de reservas',
      'Gestión de clases',
      'Gestión de promociones'
    ]
  },
  staff: {
    label: 'Staff',
    permissions: [
      'Gestión de reservas',
      'Creación de clases',
      'Gestión de promociones',
      'Atención al cliente',
      'Reportes básicos'
    ]
  }
} as const

type RoleType = keyof typeof ROLES

interface MemberFormData {
  name: string
  branch?: string
  role: RoleType
}

const RoleOption = ({ role, label, permissions }: { 
  role: string
  label: string
  permissions: string[]
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const iconRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <SelectItem 
        value={role}
        className="flex items-center gap-2 py-2 cursor-pointer"
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium">{label}</span>
          <div 
            ref={iconRef}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="relative inline-flex items-center"
          >
            <IconHelpCircle 
              className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help" 
            />
          </div>
        </div>
      </SelectItem>

      {showTooltip && createPortal(
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="fixed bg-white p-4 rounded-lg shadow-lg border w-[280px] z-[99999]"
          style={{
            left: `${window.innerWidth - 320}px`, // Posición fija desde la derecha
            top: iconRef.current?.getBoundingClientRect().top || 0,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        >
          <div className="relative">
            <p className="font-medium text-sm mb-2">Permisos:</p>
            <div className="space-y-1.5">
              {permissions.map((permission, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 text-xs text-gray-600"
                >
                  <div className="h-1 w-1 rounded-full bg-current opacity-60" />
                  <span>{permission}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>,
        document.body
      )}
    </>
  )
}

export function NewMemberModal({ isOpen, onClose, onSave, branches }: NewMemberModalProps) {
  const [mounted, setMounted] = useState(false)
  
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    branch: undefined,
    role: 'staff'
  })

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        branch: undefined,
        role: 'staff'
      })
    }
  }, [isOpen])

  const handleSave = () => {
    if (formData.name) {
      onSave(formData)
      onClose()
    }
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
            className="fixed inset-0 bg-white/30 backdrop-blur-[2px]"
            style={{ zIndex: 9998 }}
            transition={{ duration: 0.3 }}
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
            className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l"
            style={{ zIndex: 9999 }}
          >
            <div className="h-full flex flex-col">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="p-6 border-b"
              >
                <motion.h2 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="text-xl font-semibold"
                >
                  Nuevo Miembro
                </motion.h2>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-sm text-gray-500 mt-1"
                >
                  Complete los datos del nuevo miembro
                </motion.p>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="flex-1 overflow-y-auto"
              >
                <div className="p-6 space-y-6">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre completo</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ej. Juan Pérez"
                      className="w-full pb-2 border-b border-gray-300 focus:border-black outline-none transition-colors bg-transparent"
                    />
                  </div>

                  {/* Sede */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sede</label>
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.name}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rol */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rol</label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: RoleType) => 
                        setFormData(prev => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLES).map(([role, { label, permissions }]) => (
                          <RoleOption 
                            key={role}
                            role={role}
                            label={label}
                            permissions={permissions}
                          />
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="p-6 border-t bg-white"
              >
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={!formData.name}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-md transition-colors",
                      formData.name
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    Guardar
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null

  return createPortal(modalContent, document.body)
} 