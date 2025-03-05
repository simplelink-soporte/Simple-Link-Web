"use client"

import { FarewellStepField } from './types'
import { Send } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FarewellStepProps {
  field: FarewellStepField;
  onSettingsChange?: (settings: FarewellStepField['settings']) => void;
}

export function FarewellStep({ field, onSettingsChange }: FarewellStepProps) {
  const { settings } = field;

  const toggleSetting = (key: keyof typeof settings) => {
    if (!onSettingsChange) return;
    
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  const handleStyleChange = (value: "success" | "info") => {
    if (!onSettingsChange) return;
    
    onSettingsChange({
      ...settings,
      messageStyle: value
    });
  };

  const generalOptions = [
    { 
      key: 'showConfirmationNumber',
      label: 'Número de confirmación',
      description: 'Mostrar código de reserva'
    },
    { 
      key: 'showBookingSummary',
      label: 'Resumen de reserva',
      description: 'Mostrar detalles de la reserva'
    },
    { 
      key: 'showContactInfo',
      label: 'Información de contacto',
      description: 'Mostrar datos de contacto'
    },
    { 
      key: 'showSocialShare',
      label: 'Compartir',
      description: 'Permitir compartir en redes sociales'
    },
  ] as const;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-md">
            <Send className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">
              Configuración de Despedida
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Personaliza el mensaje de confirmación final
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-xs font-medium">
              Estilo del mensaje
            </p>
            <p className="text-[10px] text-muted-foreground">
              Apariencia del mensaje final
            </p>
          </div>
          <Select
            value={settings.messageStyle}
            onValueChange={handleStyleChange}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="success">Éxito</SelectItem>
              <SelectItem value="info">Informativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-3">Contenido</h3>
          <div className="grid grid-cols-2 gap-3">
            {generalOptions.map(({ key, label, description }) => (
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