"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { IconPlus, IconTrash, IconEdit, IconDots, IconHelpCircle } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-3"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NewMemberModal } from "./NewMemberModal"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Member {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'staff'
  branch?: string
  isActive: boolean
  permissions: {
    users: boolean
    bookings: boolean
    pricing: boolean
    tournaments: boolean
    promotions: boolean
    analytics: boolean
    settings: boolean
  }
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

const RoleSelect = ({ value, onChange }: { value: RoleType, onChange: (value: RoleType) => void }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingRole, setPendingRole] = useState<RoleType | null>(null)
  const tooltipRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const handleRoleChange = (newRole: RoleType) => {
    if (newRole !== value) {
      setPendingRole(newRole)
      setShowConfirmation(true)
    }
  }

  const confirmRoleChange = () => {
    if (pendingRole) {
      onChange(pendingRole)
      setShowConfirmation(false)
      setPendingRole(null)
    }
  }

  return (
    <div className="relative">
      <Popover open={showConfirmation} onOpenChange={setShowConfirmation}>
        <PopoverTrigger asChild>
          <div>
            <Select
              value={value}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger className="w-[120px] border-0 p-0 h-auto bg-transparent hover:bg-transparent focus:ring-0 shadow-none gap-1">
                <SelectValue>
                  <span className="text-gray-700 font-normal">
                    {ROLES[value].label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLES).map(([role, { label, permissions }]) => (
                  <div key={role} className="relative">
                    <SelectItem 
                      value={role}
                      className="flex items-center gap-2 py-2 cursor-pointer pr-8"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-normal text-gray-700">{label}</span>
                        <div 
                          ref={el => tooltipRefs.current[role] = el}
                          onMouseEnter={() => setActiveTooltip(role)}
                          onMouseLeave={() => setActiveTooltip(null)}
                          className="relative flex items-center justify-center ml-2"
                        >
                          <IconHelpCircle 
                            className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help" 
                          />
                        </div>
                      </div>
                    </SelectItem>

                    {activeTooltip === role && tooltipRefs.current[role] && createPortal(
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="fixed bg-white p-4 rounded-lg shadow-lg border w-[280px] z-[99999]"
                        style={{
                          left: `${window.innerWidth - 450}px`,
                          top: tooltipRefs.current[role]?.getBoundingClientRect().top || 0,
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
                                <span className="font-normal">{permission}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>,
                      document.body
                    )}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="center">
          <div className="space-y-3">
            <p className="text-sm font-medium">¿Confirmar cambio de rol?</p>
            <p className="text-xs text-gray-500">
              Esta acción modificará los permisos del usuario.
              {pendingRole && (
                <span className="block mt-1">
                  Nuevo rol: <span className="font-medium">{ROLES[pendingRole].label}</span>
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  setPendingRole(null)
                }}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRoleChange}
                className="px-3 py-1.5 text-xs bg-black text-white hover:bg-gray-800 rounded-md transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function MembersSettings() {
  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan@padelclub.com',
      phone: '+34 123 456 789',
      role: 'admin',
      branch: 'Sede Principal',
      isActive: true,
      permissions: {
        users: true,
        bookings: true,
        pricing: true,
        tournaments: true,
        promotions: true,
        analytics: true,
        settings: false
      }
    },
    {
      id: '2',
      name: 'María García',
      email: 'maria@padelclub.com',
      phone: '+34 987 654 321',
      role: 'staff',
      branch: 'Sede Norte',
      isActive: true,
      permissions: {
        users: false,
        bookings: true,
        pricing: false,
        tournaments: false,
        promotions: false,
        analytics: false,
        settings: false
      }
    }
  ])

  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false)

  const handleRoleChange = (memberId: string, newRole: Member['role']) => {
    setMembers(prev => prev.map(member => 
      member.id === memberId 
        ? { ...member, role: newRole }
        : member
    ))
  }

  const handleSaveMember = (memberData: any) => {
    setMembers(prev => [...prev, {
      id: String(prev.length + 1),
      ...memberData,
      email: `${memberData.name.toLowerCase().replace(/\s+/g, '.')}@padelclub.com`,
      phone: '',
      isActive: true,
      permissions: {
        users: memberData.role === 'admin',
        bookings: true,
        pricing: memberData.role !== 'employee',
        tournaments: memberData.role !== 'employee',
        promotions: memberData.role !== 'employee',
        analytics: memberData.role !== 'employee',
        settings: memberData.role === 'admin'
      }
    }])
  }

  // Lista de sucursales disponibles
  const availableBranches = [
    { id: 1, name: "Sede Principal" },
    { id: 2, name: "Sede Norte" },
    { id: 3, name: "Sede Sur" }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-xl font-medium">Miembros del Equipo</h3>
        </div>
        <Button 
          onClick={() => setIsNewMemberModalOpen(true)}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center gap-2 text-sm shadow-sm transition-all duration-200"
        >
          <IconPlus className="h-5 w-5" />
          <span>Nuevo Miembro</span>
        </Button>
      </div>

      {/* Tabla de miembros con menos columnas */}
      <div className="relative overflow-x-auto rounded-md border">
        <table className="min-w-full table-fixed bg-white">
          <thead>
            <tr>
              <th className="w-1/3 px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="w-1/3 px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Sede
              </th>
              <th className="w-1/3 px-6 py-3 border-b border-gray-200 bg-white text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rol
              </th>
              <th className="w-20 px-4 py-3 border-b border-gray-200 bg-white"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr 
                key={member.id}
                className="group hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-gray-600">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div className="font-normal text-gray-900">
                      {member.name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 align-middle">
                  <span className="text-gray-600">{member.branch || '—'}</span>
                </td>
                <td className="px-6 py-4 align-middle">
                  <RoleSelect 
                    value={member.role as RoleType}
                    onChange={(value) => handleRoleChange(member.id, value)}
                  />
                </td>
                <td className="px-4 py-4 align-middle">
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none">
                        <div className="p-2 hover:bg-gray-100 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <IconDots className="h-4 w-4 text-gray-500" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem className="text-sm cursor-pointer">
                          <IconEdit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-sm cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <IconTrash className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewMemberModal 
        isOpen={isNewMemberModalOpen}
        onClose={() => setIsNewMemberModalOpen(false)}
        onSave={handleSaveMember}
        branches={availableBranches}
      />
    </div>
  )
} 