"use client"

import { useState } from 'react'
import { IconLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SlugInputPopoverProps {
  onGenerate: (slug: string) => void
  isLoading: boolean
  defaultSlug?: string
  mode?: 'create' | 'edit'
  children?: React.ReactNode
}

export function SlugInputPopover({ 
  onGenerate, 
  isLoading, 
  defaultSlug = '', 
  mode = 'create',
  children 
}: SlugInputPopoverProps) {
  const [slug, setSlug] = useState(defaultSlug)
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slug.trim()) {
      onGenerate(slug.trim())
      setIsOpen(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            disabled={isLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "bg-white hover:bg-white text-black border border-gray-200",
              "transition-colors duration-200"
            )}
          >
            <IconLink className="w-4 h-4" />
            <span>Generar link</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-6" 
        align="center"
        sideOffset={8}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <h4 className="font-medium text-base text-gray-900">
              Personaliza tu link
            </h4>
            <p className="text-sm text-gray-500">
              Elige un nombre único para tu link de clases
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1">
              <span className="text-sm font-normal text-gray-500">/clases/</span>
              <div className="flex-1">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="mi-empresa"
                  className={cn(
                    "h-9 bg-gray-50",
                    "placeholder:text-gray-400"
                  )}
                  pattern="[a-z0-9-]+"
                  title="Solo letras minúsculas, números y guiones"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 px-0.5">
              Solo letras minúsculas, números y guiones (-)
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "text-gray-600 hover:text-gray-900",
                  "hover:bg-gray-100"
                )}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!slug.trim() || isLoading}
                variant="ghost"
                className={cn(
                  "text-gray-900 hover:text-gray-900",
                  "hover:bg-gray-100",
                  "font-medium"
                )}
              >
                {mode === 'edit' ? 'Actualizar' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
} 