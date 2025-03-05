import { motion } from "framer-motion"
import { useEffect } from "react"
import { IconQuestionMark } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MultiSelect } from '@/components/ui/multi-select';
import { useBranchContext } from '@/contexts/BranchContext';

interface PackageDetails {
  name: string
  classCount: number
  price: number
  expirationDays: number
  branchIds: string[]
}

interface PackageDetailsProps {
  details?: PackageDetails
  onChange?: (details: PackageDetails) => void
  onValidationChange?: (isValid: boolean) => void
  mode?: 'create' | 'edit'
}

export function PackageDetails({ 
  details = { 
    name: '', 
    classCount: 1,
    price: 0,
    expirationDays: 30,
    branchIds: []
  }, 
  onChange,
  onValidationChange,
  mode = 'create'
}: PackageDetailsProps) {
  const { branches } = useBranchContext();

  useEffect(() => {
    const isValid = details.name.trim().length > 0 && 
                   details.classCount > 0 && 
                   details.price > 0 && 
                   details.expirationDays > 0 && 
                   details.branchIds.length > 0;
    onValidationChange?.(isValid);
  }, [details, onValidationChange]);

  const handleChange = (field: keyof PackageDetails, value: any) => {
    if (onChange) {
      onChange({
        ...details,
        [field]: value
      });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Nombre del paquete */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Nombre del paquete
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Elige un nombre descriptivo que refleje el contenido del paquete
        </p>
        <input
          type="text"
          value={details.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ej: Paquete 10 Sesiones Premium"
          className={cn(
            "w-full px-3 py-2 rounded-lg",
            "border border-gray-200 bg-white",
            "focus:outline-none focus:border-gray-300",
            "transition-colors duration-200",
            "placeholder:text-gray-400",
            "text-sm"
          )}
        />
      </div>

      {/* Cantidad de sesiones */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Cantidad de sesiones
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <IconQuestionMark className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <p className="text-xs">
                  Número de sesiones incluidas en el paquete
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Número total de clases que el usuario podrá reservar con este paquete
        </p>
        <input
          type="number"
          min="1"
          value={details.classCount}
          onChange={(e) => handleChange('classCount', parseInt(e.target.value) || 0)}
          className={cn(
            "w-full px-3 py-2 rounded-lg",
            "border border-gray-200 bg-white",
            "focus:outline-none focus:border-gray-300",
            "transition-colors duration-200",
            "placeholder:text-gray-400",
            "text-sm"
          )}
        />
      </div>

      {/* Precio */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Precio (ARS)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <IconQuestionMark className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <p className="text-xs">
                  Precio total del paquete
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Precio total del paquete en pesos argentinos
        </p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={details.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
            className={cn(
              "w-full px-3 py-2 pl-7 rounded-lg",
              "border border-gray-200 bg-white",
              "focus:outline-none focus:border-gray-300",
              "transition-colors duration-200",
              "placeholder:text-gray-400",
              "text-sm"
            )}
          />
        </div>
      </div>

      {/* Vencimiento */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Vencimiento
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <IconQuestionMark className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <p className="text-xs">
                  Número de días durante los cuales el paquete será válido
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Período de validez del paquete desde su fecha de compra
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={details.expirationDays}
            onChange={(e) => handleChange('expirationDays', parseInt(e.target.value) || 0)}
            className={cn(
              "w-full px-3 py-2 rounded-lg",
              "border border-gray-200 bg-white",
              "focus:outline-none focus:border-gray-300",
              "transition-colors duration-200",
              "placeholder:text-gray-400",
              "text-sm"
            )}
          />
          <span className="text-sm text-gray-500 whitespace-nowrap">días</span>
        </div>
      </div>

      {/* Selección de sucursales */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Sucursales</label>
        <MultiSelect
          value={details.branchIds}
          onChange={(selected) => handleChange('branchIds', selected)}
          options={branches.map(branch => ({ id: branch.id, name: branch.name }))}
          placeholder="Seleccionar sucursales"
        />
      </div>

      {/* Mensaje de validación */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        {(!details.name.trim() || details.classCount <= 0 || details.price <= 0 || details.expirationDays <= 0) && (
          <p className="text-[13px] text-gray-400">
            {!details.name.trim()
              ? "Ingresa el nombre del paquete para continuar"
              : details.classCount <= 0
              ? "La cantidad de sesiones debe ser mayor a 0"
              : details.price <= 0
              ? "El precio debe ser mayor a 0"
              : "El vencimiento debe ser mayor a 0 días"
            }
          </p>
        )}
      </motion.div>
    </motion.div>
  )
} 