import { useState } from 'react'
import { Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CustomSlugInputPopoverProps {
  onUpdate: (slug: string) => void
  isLoading: boolean
  defaultSlug?: string
  linkType: 'classes' | 'bookings'
  children?: React.ReactNode
}

export function CustomSlugInputPopover({ 
  onUpdate, 
  isLoading, 
  defaultSlug = '', 
  linkType,
  children 
}: CustomSlugInputPopoverProps) {
  const [slug, setSlug] = useState(defaultSlug)
  const [isOpen, setIsOpen] = useState(false)

  const basePath = linkType === 'classes' ? '/clases/' : '/shifts/'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slug.trim()) {
      onUpdate(slug.trim())
      setIsOpen(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            disabled={isLoading}
            className="h-8 w-8 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            variant="ghost" 
            size="icon"
            title="Editar enlace"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4" 
        align="end"
        sideOffset={4}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-gray-900">
              Personaliza tu enlace
            </h4>
            <p className="text-xs text-gray-500">
              Elige un nombre único para tu enlace de {linkType === 'classes' ? 'clases' : 'reservas'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-gray-500">{basePath}</span>
              <div className="flex-1">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="mi-empresa"
                  className={cn(
                    "h-8 bg-gray-50 text-xs font-mono",
                    "placeholder:text-gray-400"
                  )}
                  pattern="[a-z0-9-]+"
                  title="Solo letras minúsculas, números y guiones"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 px-0.5">
              Solo letras minúsculas, números y guiones (-)
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "text-xs text-gray-600 hover:text-gray-900",
                  "hover:bg-gray-100",
                  "h-7 px-2"
                )}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!slug.trim() || isLoading}
                variant="ghost"
                className={cn(
                  "text-xs text-gray-900 hover:text-gray-900",
                  "hover:bg-gray-100",
                  "font-medium",
                  "h-7 px-2"
                )}
              >
                Actualizar
              </Button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
} 