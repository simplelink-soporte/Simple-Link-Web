"use client"

import { AnnouncementsStepField } from './types'
import { Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface AnnouncementsStepProps {
  field: AnnouncementsStepField;
  onSettingsChange?: (settings: AnnouncementsStepField['settings']) => void;
}

export function AnnouncementsStep({ field, onSettingsChange }: AnnouncementsStepProps) {
  const { settings } = field;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-md">
            <Bell className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">
              Configuración de Anuncios
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Personaliza cómo se muestran los anuncios
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent className="p-0 space-y-6">
        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-3">Anuncios Disponibles</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative flex w-full items-start gap-2 rounded-lg border border-dashed border-gray-200 p-4 hover:bg-gray-50/50">
                <div className="flex grow items-center gap-3">
                  <div className="shrink-0 p-2 bg-gray-100/50 rounded-md">
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-gray-600">
                      Agregar anuncio
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Configura los anuncios desde la sección Anuncios
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border bg-gray-50/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Agrega anuncios desde la sección Anuncios
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  console.log('Navegar a sección de anuncios');
                }}
              >
                Ir a Anuncios
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 