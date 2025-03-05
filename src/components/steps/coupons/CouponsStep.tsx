"use client"

import { CouponsStepField } from './types'
import { Ticket, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface CouponsStepProps {
  field: CouponsStepField;
  onSettingsChange?: (settings: CouponsStepField['settings']) => void;
}

export function CouponsStep({ field, onSettingsChange }: CouponsStepProps) {
  const { settings } = field;

  const toggleSetting = (key: keyof typeof settings) => {
    if (!onSettingsChange) return;
    
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  const configOptions = [
    { 
      key: 'showTitle',
      label: 'Título',
      description: 'Mostrar título del cupón'
    },
    { 
      key: 'showDescription',
      label: 'Descripción',
      description: 'Incluir descripción del descuento'
    },
    { 
      key: 'showValidityPeriod',
      label: 'Período de validez',
      description: 'Mostrar fechas de validez'
    },
    { 
      key: 'showDiscountAmount',
      label: 'Monto de descuento',
      description: 'Mostrar valor del descuento'
    },
    { 
      key: 'validateOnEnter',
      label: 'Validación inmediata',
      description: 'Validar al ingresar código'
    },
    { 
      key: 'allowMultiple',
      label: 'Múltiples cupones',
      description: 'Permitir usar varios cupones'
    },
    { 
      key: 'showTerms',
      label: 'Términos',
      description: 'Mostrar condiciones de uso'
    },
    { 
      key: 'showRemainingUses',
      label: 'Usos restantes',
      description: 'Mostrar cantidad disponible'
    },
    { 
      key: 'showExpiration',
      label: 'Expiración',
      description: 'Mostrar fecha de vencimiento'
    },
    { 
      key: 'requireAuthentication',
      label: 'Autenticación',
      description: 'Requerir inicio de sesión'
    }
  ] as const;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-md">
            <Ticket className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">
              Configuración de Cupones
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Personaliza cómo se manejan los cupones de descuento
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent className="p-0 space-y-6">
        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-3">Cupones Disponibles</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative flex w-full items-start gap-2 rounded-lg border border-dashed border-gray-200 p-4 hover:bg-gray-50/50">
                <div className="flex grow items-center gap-3">
                  <div className="shrink-0 p-2 bg-gray-100/50 rounded-md">
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-gray-600">
                      Agregar cupón
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Configura los cupones desde la sección Cupones
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border bg-gray-50/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Agrega items desde la sección Cupones
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  console.log('Navegar a sección de cupones');
                }}
              >
                Ir a Cupones
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-3">Configuración</h3>
          <div className="grid grid-cols-2 gap-3">
            {configOptions.map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-start space-x-2"
              >
                <Checkbox
                  id={key}
                  checked={typeof settings[key] === 'boolean' ? settings[key] as boolean : false}
                  onCheckedChange={() => toggleSetting(key as keyof typeof settings)}
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
  );
} 