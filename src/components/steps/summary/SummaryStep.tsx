"use client"

import { SummaryStepField, PaymentType } from './types'
import { DEFAULT_PAYMENT_TYPES, PAYMENT_TYPE_TOOLTIPS } from './constants'
import { ClipboardList, HelpCircle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCallback } from "react"

interface SummaryStepProps {
  field: SummaryStepField;
  onSettingsChange?: (settings: SummaryStepField['settings']) => void;
}

export function SummaryStep({ field, onSettingsChange }: SummaryStepProps) {
  const { settings } = field;
  
  // Asegurarnos de que paymentTypes esté inicializado
  const paymentTypes = settings.paymentTypes || DEFAULT_PAYMENT_TYPES;
  const guaranteeConfig = settings.guaranteeConfig || { percentage: 30 };

  const toggleSetting = useCallback((key: keyof typeof settings) => {
    if (!onSettingsChange) return;
    
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  }, [settings, onSettingsChange]);

  const togglePaymentType = useCallback((type: PaymentType) => {
    if (!onSettingsChange) return;
    
    // Crear una nueva copia del objeto paymentTypes
    const updatedPaymentTypes = {
      ...paymentTypes,
      [type]: !paymentTypes[type]
    };
    
    // Si se deshabilita la garantía, mantener la configuración
    const updatedSettings = {
      ...settings,
      paymentTypes: updatedPaymentTypes,
      // Mantener la configuración de garantía incluso si se deshabilita
      guaranteeConfig: type === 'guarantee' && !updatedPaymentTypes[type] 
        ? settings.guaranteeConfig 
        : guaranteeConfig
    };
    
    onSettingsChange(updatedSettings);
  }, [settings, paymentTypes, onSettingsChange, guaranteeConfig]);

  const updateGuaranteePercentage = useCallback((percentage: number) => {
    if (!onSettingsChange) return;
    
    onSettingsChange({
      ...settings,
      guaranteeConfig: {
        ...guaranteeConfig,
        percentage: Math.min(100, Math.max(0, percentage))
      }
    });
  }, [settings, guaranteeConfig, onSettingsChange]);

  const generalOptions = [
    { 
      key: 'showCoupons' as const,
      label: 'Permitir cupones',
      description: 'Habilita la opción de aplicar códigos de descuento'
    }
  ] as const;

  const paymentOptions = [
    { 
      value: 'club' as const,
      label: 'Pago en el club',
    },
    { 
      value: 'full' as const,
      label: 'Pago completo',
    },
    { 
      value: 'advance' as const,
      label: 'Pago de anticipo',
    },
    { 
      value: 'guarantee' as const,
      label: 'Garantía',
    },
  ] as const;

  return (
    <TooltipProvider delayDuration={0}>
      <Card className="border-none shadow-none">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-100 rounded-md">
              <ClipboardList className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                Configuración de Pago
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Personaliza las opciones de pago y visualización
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator className="mb-4" />
        <CardContent className="p-0 space-y-6">
          <div>
            <h3 className="text-xs font-medium text-gray-700 mb-3">Tipos de Pago Permitidos</h3>
            <div className="grid grid-cols-2 gap-3">
              {paymentOptions.map(({ value, label }) => (
                <div
                  key={value}
                  className="flex items-start space-x-2"
                >
                  <Checkbox
                    id={value}
                    checked={paymentTypes[value]}
                    onCheckedChange={() => togglePaymentType(value)}
                    className="mt-1 data-[state=checked]:bg-black data-[state=checked]:border-black"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <div className="flex items-center gap-1">
                      <label
                        htmlFor={value}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            type="button" 
                            className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                            onClick={(e) => e.preventDefault()}
                          >
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                            <span className="sr-only">Más información sobre {label}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          sideOffset={5}
                          className="bg-black text-white text-xs px-3 py-1.5 rounded-md shadow-lg max-w-[200px]"
                        >
                          <p>{PAYMENT_TYPE_TOOLTIPS[value]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {value === 'guarantee' && paymentTypes[value] && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={guaranteeConfig.percentage}
                            onChange={(e) => updateGuaranteePercentage(Number(e.target.value))}
                            className="w-20 h-7 text-xs"
                          />
                          <span className="text-xs text-gray-500">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Porcentaje que se retendrá como garantía
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-700 mb-3">Opciones</h3>
            <div className="grid grid-cols-2 gap-3">
              {generalOptions.map(({ key, label, description }) => (
                <div
                  key={key}
                  className="flex items-start space-x-2"
                >
                  <Checkbox
                    id={key}
                    checked={settings[key]}
                    onCheckedChange={() => toggleSetting(key)}
                    className="mt-1 data-[state=checked]:bg-black data-[state=checked]:border-black"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={key}
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {label}
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
} 