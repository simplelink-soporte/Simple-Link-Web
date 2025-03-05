"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { IconCheck } from "@tabler/icons-react"

interface ColorOption {
  id: string
  name: string
  value: string
  description: string
}

interface ConfigurationMenuProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  onConfigChange: (config: {
    colors: {
      shift: string
      class: string
      blocked: string
    }
  }) => void
  currentConfig: {
    colors: {
      shift: string
      class: string
      blocked: string
    }
  }
}

const colorOptions: ColorOption[] = [
  { id: 'red', name: 'Rojo', value: '#EF4444', description: 'Color de alerta y bloqueo' },
  { id: 'yellow', name: 'Amarillo', value: '#FBD950', description: 'Color cálido y energético' },
  { id: 'blue', name: 'Azul', value: '#60A5FA', description: 'Color profesional y sereno' },
  { id: 'green', name: 'Verde', value: '#34D399', description: 'Color fresco y natural' },
  { id: 'purple', name: 'Morado', value: '#A78BFA', description: 'Color elegante y creativo' },
  { id: 'pink', name: 'Rosa', value: '#F472B6', description: 'Color dinámico y amigable' },
  { id: 'orange', name: 'Naranja', value: '#FB923C', description: 'Color vibrante y activo' },
]

export function ConfigurationMenu({
  isOpen,
  onClose,
  position,
  onConfigChange,
  currentConfig,
}: ConfigurationMenuProps) {
  const [selectedColors, setSelectedColors] = useState({
    shift: currentConfig.colors.shift,
    class: currentConfig.colors.class,
    blocked: currentConfig.colors.blocked,
  })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleApplyChanges = () => {
    onConfigChange({
      colors: selectedColors
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="absolute bg-white rounded-xl shadow-lg border border-gray-200 w-[320px] z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: position.y + 8,
        left: position.x - 320 + 40,
        zIndex: 10000
      }}
    >
      <div 
        className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45"
      />

      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Personalización</h3>
          <p className="text-sm text-gray-500">Personaliza los colores de las reservas</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Colores de reserva</h4>
          
          {/* Color para turnos */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Turnos</label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={`shift-${color.id}`}
                  className={cn(
                    "w-6 h-6 rounded-full relative transition-transform hover:scale-110",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400",
                    selectedColors.shift === color.value && "ring-2 ring-gray-400"
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColors(prev => ({ ...prev, shift: color.value }))}
                  title={`${color.name} - ${color.description}`}
                >
                  {selectedColors.shift === color.value && (
                    <IconCheck className="w-4 h-4 text-gray-900/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color para clases */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Clases</label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={`class-${color.id}`}
                  className={cn(
                    "w-6 h-6 rounded-full relative transition-transform hover:scale-110",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400",
                    selectedColors.class === color.value && "ring-2 ring-gray-400"
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColors(prev => ({ ...prev, class: color.value }))}
                  title={`${color.name} - ${color.description}`}
                >
                  {selectedColors.class === color.value && (
                    <IconCheck className="w-4 h-4 text-gray-900/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color para bloqueados */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Bloqueados</label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={`blocked-${color.id}`}
                  className={cn(
                    "w-6 h-6 rounded-full relative transition-transform hover:scale-110",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400",
                    selectedColors.blocked === color.value && "ring-2 ring-gray-400"
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColors(prev => ({ ...prev, blocked: color.value }))}
                  title={`${color.name} - ${color.description}`}
                >
                  {selectedColors.blocked === color.value && (
                    <IconCheck className="w-4 h-4 text-gray-900/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-gray-600"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleApplyChanges}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            Aplicar Cambios
          </Button>
        </div>
      </div>
    </div>
  )
} 