import { motion } from "framer-motion"
import { IconQuestionMark } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Coupon } from "@/types/coupon"

interface UsageLimitsProps {
  formData: Partial<Coupon>
  setFormData: (data: Partial<Coupon>) => void
}

export function UsageLimits({ formData, setFormData }: UsageLimitsProps) {
  const limitTypes = [
    {
      id: 'global',
      title: 'Límite Global de Usos',
      description: 'Establece un número máximo de veces que este cupón puede ser utilizado',
      field: 'usageLimit'
    },
    {
      id: 'perUser',
      title: 'Límite por Usuario',
      description: 'Establece cuántas veces puede usar este cupón cada usuario',
      field: 'usagePerUserLimit'
    }
  ] as const

  return (
    <div className="space-y-6">
      {limitTypes.map((limit) => (
        <motion.div
          key={limit.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-gray-900">{limit.title}</h3>
              <p className="text-sm text-gray-500">{limit.description}</p>
            </div>
            <Switch
              checked={formData[limit.field] !== undefined}
              onCheckedChange={(checked) => {
                setFormData({
                  ...formData,
                  [limit.field]: checked ? 0 : undefined
                })
              }}
              className="data-[state=checked]:bg-black"
            />
          </div>

          {formData[limit.field] !== undefined && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4"
            >
              <div className="relative w-full max-w-[200px]">
                <Input
                  type="number"
                  min="0"
                  placeholder="Ej: 50"
                  value={formData[limit.field] || ''}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    setFormData({
                      ...formData,
                      [limit.field]: value
                    })
                  }}
                  className={cn(
                    "transition-all duration-200",
                    "border-gray-200",
                    "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black",
                    "placeholder:text-gray-400",
                    "[appearance:textfield]",
                    "[&::-webkit-outer-spin-button]:appearance-none",
                    "[&::-webkit-inner-spin-button]:appearance-none"
                  )}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {limit.id === 'global' 
                    ? 'Deja en 0 para usos ilimitados'
                    : 'Deja en 0 para permitir usos ilimitados por usuario'
                  }
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  )
} 