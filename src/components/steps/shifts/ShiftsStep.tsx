"use client"

import React, { useState } from 'react'
import { ShiftsStepField } from './types'
import { Clock } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ShiftsStepProps {
  field: ShiftsStepField;
  onSettingsChange?: (settings: ShiftsStepField['settings']) => void;
}

export function ShiftsStep({ field, onSettingsChange }: ShiftsStepProps) {
  const { settings } = field;
  const [customDaysSelected, setCustomDaysSelected] = useState<string | null>(null);

  const toggleSetting = (key: 'showFullCalendar' | 'showCustomDays') => {
    if (!onSettingsChange) return;
    
    // Manejo especial para showCustomDays
    if (key === 'showCustomDays') {
      const newValue = !settings[key];
      onSettingsChange({
        ...settings,
        [key]: newValue,
        // Si se desselecciona, limpiamos la selección de días personalizados
        ...(newValue ? {} : { customDaysOption: null })
    });
    return;
  }
    
    // Para otros settings
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  const handleCustomDaysChange = (value: string) => {
    if (!onSettingsChange) return;

    // Si se selecciona "Personalizar", podríamos querer mostrar un input adicional
    onSettingsChange({
      ...settings,
      customDaysOption: value
    });
  };

  // Opciones para la sección de Calendario
  const calendarOptions = [
    { 
      key: 'showFullCalendar',
      label: 'Calendario completo',
      description: 'Posibilidad de reservar turnos hasta los proximos 30 días'
    },
    { 
      key: 'showCustomDays',
      label: 'Personalizada',
      description: 'Limitar distancia de días disponibles para reservar',
      hasCustomDaysSelect: true
    }
  ] as const;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-md">
            <Clock className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">
              Configuración de Turnos
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Personaliza las opciones de reserva de turnos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent className="p-0 space-y-6">
        {/* Sección Calendario */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-gray-700">
            Calendario
          </h3>
          <div className="space-y-3">
            {calendarOptions.map(({ key, label, description, hasCustomDaysSelect }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-start space-x-2">
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
                {hasCustomDaysSelect && settings[key] && (
                  <div className="pl-7 mt-2">
                    <Select 
                      onValueChange={handleCustomDaysChange}
                      value={settings.customDaysOption || ''}
                    >
                      <SelectTrigger className="w-full h-7 text-xs">
                        <SelectValue placeholder="Seleccionar días" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today" className="text-xs">Solo Hoy</SelectItem>
                        <SelectItem value="3days" className="text-xs">3 Días</SelectItem>
                        <SelectItem value="1week" className="text-xs">1 Semana</SelectItem>
                        <SelectItem value="custom" className="text-xs">
                          Personalizar
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Input para personalizar días cuando se selecciona "Personalizar" */}
                    {settings.customDaysOption === 'custom' && (
                      <Input
                        type="number"
                        placeholder="Días (1-30)"
                        min={1}
                        max={30}
                        className="w-full h-7 text-xs mt-2"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}