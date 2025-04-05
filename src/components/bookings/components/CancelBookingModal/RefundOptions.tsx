import { useState, useEffect } from 'react'
import { IconArrowLeft, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatCurrencyByCountry } from '@/lib/currency-utils'

interface RefundOptionsProps {
  totalAmount: number
  country?: string | null
  onBack: () => void
  onOptionsSelected: (options: {
    refundType: 'full' | 'percentage'
    percentage?: number
    processMethod: 'stripe' | 'external'
  }) => void
  initialValues?: {
    refundType: 'full' | 'percentage'
    percentage: number
    processMethod: 'stripe' | 'external'
  }
}

export function RefundOptions({
  totalAmount,
  country,
  onBack,
  onOptionsSelected,
  initialValues = {
    refundType: 'full',
    percentage: 100,
    processMethod: 'stripe'
  }
}: RefundOptionsProps) {
  // Estados locales para las opciones de reembolso
  const [refundType, setRefundType] = useState<'full' | 'percentage'>(initialValues.refundType)
  const [refundPercentage, setRefundPercentage] = useState<number>(initialValues.percentage)
  const [refundMethod, setRefundMethod] = useState<'stripe' | 'external'>(initialValues.processMethod)
  const [openSection, setOpenSection] = useState<'type' | 'method'>('type')

  // Efecto para aplicar los valores iniciales
  useEffect(() => {
    if (initialValues) {
      setRefundType(initialValues.refundType)
      setRefundPercentage(initialValues.percentage)
      setRefundMethod(initialValues.processMethod)
    }
  }, [initialValues])

  // Función para confirmar las opciones seleccionadas
  const handleConfirm = () => {
    onOptionsSelected({
      refundType,
      percentage: refundType === 'percentage' ? refundPercentage : undefined,
      processMethod: refundMethod
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Toggle 1: Tipo de reembolso */}
        <div className="rounded-md border border-gray-200 overflow-hidden">
          <button 
            className="w-full p-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            onClick={() => setOpenSection(openSection === 'type' ? 'method' : 'type')}
          >
            <span>1. Tipo de reembolso</span>
            {openSection === 'type' ? 
              <IconChevronDown className="w-4 h-4 text-gray-500" /> : 
              <IconChevronRight className="w-4 h-4 text-gray-500" />}
          </button>
          
          {/* Contenido del tipo de reembolso */}
          {openSection === 'type' && (
            <div className="p-3 space-y-4 border-t border-gray-200 bg-white">
              <RadioGroup
                value={refundType}
                onValueChange={(value) => setRefundType(value as 'full' | 'percentage')}
                className="space-y-3"
              >
                {/* Opción de reembolso completo */}
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="full" id="full-refund" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="full-refund" className="text-sm font-medium text-gray-700">
                      Reembolso completo
                    </Label>
                    <p className="text-xs text-gray-500">
                      Monto: {formatCurrencyByCountry(totalAmount, country)}
                    </p>
                  </div>
                </div>
                
                {/* Opción de reembolso parcial */}
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="percentage" id="percentage-refund" className="mt-1" />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="percentage-refund" className="text-sm font-medium text-gray-700">
                      Reembolso parcial
                    </Label>
                    
                    {/* Slider que aparece solo cuando se selecciona reembolso parcial */}
                    {refundType === 'percentage' && (
                      <div className="mt-3 space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="percentage-slider" className="text-xs text-gray-600">
                            Porcentaje a reembolsar
                          </Label>
                          <span className="flex items-center text-xs font-medium text-gray-700">
                            {refundPercentage}%
                          </span>
                        </div>
                        <Slider
                          id="percentage-slider"
                          min={10}
                          max={100}
                          step={5}
                          value={[refundPercentage]}
                          onValueChange={(value) => setRefundPercentage(value[0])}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-500">
                          Monto: {formatCurrencyByCountry((totalAmount * refundPercentage) / 100, country)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Toggle 2: Método de procesamiento */}
        <div className="rounded-md border border-gray-200 overflow-hidden">
          <button 
            className="w-full p-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            onClick={() => setOpenSection(openSection === 'method' ? 'type' : 'method')}
          >
            <span>2. Forma de procesamiento</span>
            {openSection === 'method' ? 
              <IconChevronDown className="w-4 h-4 text-gray-500" /> : 
              <IconChevronRight className="w-4 h-4 text-gray-500" />}
          </button>
          
          {/* Contenido del método de procesamiento */}
          {openSection === 'method' && (
            <div className="p-3 space-y-4 border-t border-gray-200 bg-white">
              <RadioGroup 
                value={refundMethod} 
                onValueChange={(value) => setRefundMethod(value as 'stripe' | 'external')}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="stripe" className="text-sm font-medium text-gray-700">
                      Automático vía Stripe
                    </Label>
                    <p className="text-xs text-gray-500">
                      El reembolso se procesa instantáneamente a la tarjeta original
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="external" id="external" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="external" className="text-sm font-medium text-gray-700">
                      Procesado externamente
                    </Label>
                    <p className="text-xs text-gray-500">
                      El reembolso se gestiona manualmente fuera del sistema
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Botones de acción en la parte inferior */}
        <div className="pt-4 flex space-x-2">
          <Button 
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md transition-all" 
            onClick={onBack}
          >
            Volver
          </Button>
          
          <Button 
            className="flex-1 text-gray-700 hover:bg-gray-100 hover:text-black rounded-md transition-all" 
            variant="ghost"
            size="sm"
            onClick={handleConfirm}
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}
