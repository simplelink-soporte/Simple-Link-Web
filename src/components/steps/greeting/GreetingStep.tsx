"use client"

import { GreetingStepField } from './types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Hand, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

interface GreetingStepProps {
  field: GreetingStepField;
  onSettingsChange?: (settings: GreetingStepField['settings']) => void;
}

const DEFAULT_TITLE = "Garden Arena";
const DEFAULT_SUBTITLE = "Reserva tu cancha de pádel en simples pasos";

export function GreetingStep({ field, onSettingsChange }: GreetingStepProps) {
  const [localSettings, setLocalSettings] = useState({
    title: field.settings?.title || DEFAULT_TITLE,
    subtitle: field.settings?.subtitle || DEFAULT_SUBTITLE
  });

  useEffect(() => {
    setLocalSettings({
      title: field.settings?.title || DEFAULT_TITLE,
      subtitle: field.settings?.subtitle || DEFAULT_SUBTITLE
    });
  }, [field.settings]);

  const handleSettingsChange = (key: keyof GreetingStepField['settings'], value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUpdate = () => {
    if (onSettingsChange) {
      console.log('GreetingStep - Enviando actualización:', localSettings);
      onSettingsChange({
        title: localSettings.title || DEFAULT_TITLE,
        subtitle: localSettings.subtitle || DEFAULT_SUBTITLE
      });
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-md">
            <Hand className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">
              Configuración de Saludo
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Personaliza el mensaje de bienvenida
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="greetingTitle" className="text-xs font-medium">
            Título de bienvenida
          </Label>
          <Input
            id="greetingTitle"
            value={localSettings.title}
            onChange={(e) => handleSettingsChange('title', e.target.value)}
            placeholder={DEFAULT_TITLE}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="greetingSubtitle" className="text-xs font-medium">
            Subtítulo
          </Label>
          <Input
            id="greetingSubtitle"
            value={localSettings.subtitle}
            onChange={(e) => handleSettingsChange('subtitle', e.target.value)}
            placeholder={DEFAULT_SUBTITLE}
            className="h-8 text-sm"
          />
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleUpdate}
            className="gap-2 text-xs h-8"
          >
            <Save className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 