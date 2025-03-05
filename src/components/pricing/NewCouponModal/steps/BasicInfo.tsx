import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { IconQuestionMark } from "@tabler/icons-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Coupon } from "@/types/coupon"
import { cn } from "@/lib/utils"

interface BasicInfoProps {
  formData: Partial<Coupon>
  setFormData: (data: Partial<Coupon>) => void
}

export function BasicInfo({ formData, setFormData }: BasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* Nombre del Cupón */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Nombre del Cupón
        </label>
        <Input
          placeholder="Ej: Descuento para verano"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={cn(
            "transition-all duration-200",
            "border-gray-200",
            "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black",
            "placeholder:text-gray-400"
          )}
        />
      </div>

      {/* Código del Cupón */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">
            Código del Cupón
          </label>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-4 w-4 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                  <IconQuestionMark className="h-2.5 w-2.5 text-gray-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                className="bg-white p-3 shadow-lg border rounded-lg max-w-xs"
                side="right"
              >
                <p className="text-xs text-gray-600 leading-relaxed">
                  Código que los usuarios ingresarán para activar el descuento. 
                  Se convertirá automáticamente a mayúsculas y los espacios se 
                  reemplazarán por guiones bajos.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          placeholder="Ej: VERANO20"
          value={formData.code || ''}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().replace(/\s+/g, '_')
            setFormData({ ...formData, code: value })
          }}
          className={cn(
            "uppercase",
            "transition-all duration-200",
            "border-gray-200",
            "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black",
            "placeholder:text-gray-400"
          )}
        />
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Descripción
          </label>
          <span className="text-xs text-gray-500">
            Opcional
          </span>
        </div>
        <Textarea
          placeholder="Ej: 20% de descuento en clases privadas durante julio"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={cn(
            "min-h-[100px] resize-none",
            "transition-all duration-200",
            "border-gray-200",
            "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black",
            "placeholder:text-gray-400"
          )}
        />
      </div>
    </div>
  )
}


