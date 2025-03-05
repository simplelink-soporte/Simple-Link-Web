import { useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { IconX } from '@tabler/icons-react'

interface ConfigurationMenuProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  currentConfig: {
    colors: {
      shift: string
      class: string
      blocked: string
    }
  }
  onConfigChange: (config: any) => void
}

export function ConfigurationMenu({
  isOpen,
  onClose,
  position,
  currentConfig,
  onConfigChange
}: ConfigurationMenuProps) {
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

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-64"
      style={{
        top: position.y + 8,
        left: position.x - 256,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Configuración</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <IconX className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="shiftColor" className="text-xs">
            Color de turnos
          </Label>
          <Input
            id="shiftColor"
            type="color"
            value={currentConfig.colors.shift}
            onChange={(e) =>
              onConfigChange({
                ...currentConfig,
                colors: { ...currentConfig.colors, shift: e.target.value },
              })
            }
            className="h-8 p-1"
          />
        </div>

        <div>
          <Label htmlFor="classColor" className="text-xs">
            Color de clases
          </Label>
          <Input
            id="classColor"
            type="color"
            value={currentConfig.colors.class}
            onChange={(e) =>
              onConfigChange({
                ...currentConfig,
                colors: { ...currentConfig.colors, class: e.target.value },
              })
            }
            className="h-8 p-1"
          />
        </div>

        <div>
          <Label htmlFor="blockedColor" className="text-xs">
            Color de bloqueados
          </Label>
          <Input
            id="blockedColor"
            type="color"
            value={currentConfig.colors.blocked}
            onChange={(e) =>
              onConfigChange({
                ...currentConfig,
                colors: { ...currentConfig.colors, blocked: e.target.value },
              })
            }
            className="h-8 p-1"
          />
        </div>
      </div>
    </div>
  )
} 