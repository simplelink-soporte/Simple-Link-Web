"use client"

import { LocationStepField } from './types'
import { MapPin } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface LocationStepProps {
  field: LocationStepField;
  onSettingsChange?: (settings: LocationStepField['settings']) => void;
}

export function LocationStep({ field, onSettingsChange }: LocationStepProps) {
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
      key: 'showAddress',
      label: 'Dirección',
      description: 'Mostrar dirección completa'
    },
    { 
      key: 'showBranches',
      label: 'Sucursales',
      description: 'Listar todas las sucursales'
    },
    { 
      key: 'showSchedule',
      label: 'Horarios',
      description: 'Mostrar horarios de atención'
    },
    { 
      key: 'showContactInfo',
      label: 'Contacto',
      description: 'Incluir información de contacto'
    }
  ] as const;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-md">
            <MapPin className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">
              Configuración de Ubicación
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Personaliza cómo se muestra la información de ubicación
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
  );
} 