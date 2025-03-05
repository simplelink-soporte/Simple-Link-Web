"use client"

import { UserStepField } from './types'
import { Users } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { UserSettings } from '@/types/form-steps';
import { DEFAULT_USER_SETTINGS } from './defaults';
import { cn } from '@/lib/utils'

interface UsersStepProps {
  field: {
    settings: UserSettings;
  };
  onSettingsChange?: (settings: UserSettings) => void;
}

export function UsersStep({ field, onSettingsChange }: UsersStepProps) {
  const settings = {
    ...DEFAULT_USER_SETTINGS,
    ...field.settings,
    login: {
      ...DEFAULT_USER_SETTINGS.login,
      ...(field.settings?.login || {}),
      showPassword: true
    },
    register: {
      ...DEFAULT_USER_SETTINGS.register,
      ...(field.settings?.register || {}),
      showPhone: true,
      showPassword: true
    }
  };

  const toggleLoginSetting = (key: keyof UserSettings['login']) => {
    if (!onSettingsChange || key === 'showPassword') return;
    
    const wouldHaveActiveField = Object.entries(settings.login)
      .some(([k, v]) => k !== key && v);
      
    if (!settings.login[key] || wouldHaveActiveField) {
      onSettingsChange({
        ...settings,
        login: {
          ...settings.login,
          [key]: !settings.login[key]
        }
      });
    }
  };

  const toggleRegisterSetting = (key: keyof UserSettings['register']) => {
    if (!onSettingsChange) return;
    
    if (key === 'showPhone' || key === 'showPassword') return;
    
    const wouldHaveActiveField = Object.entries(settings.register)
      .some(([k, v]) => k !== key && v);
      
    if (!settings.register[key] || wouldHaveActiveField) {
      onSettingsChange({
        ...settings,
        register: {
          ...settings.register,
          [key]: !settings.register[key]
        }
      });
    }
  };

  // Opciones para el login
  const loginOptions = [
    { 
      key: 'showEmail',
      label: 'Correo electrónico',
      description: 'Requerir dirección de email'
    },
    { 
      key: 'showDNI',
      label: 'DNI',
      description: 'Solicitar documento de identidad'
    },
    { 
      key: 'showPhone',
      label: 'Teléfono',
      description: 'Incluir número de contacto'
    },
    { 
      key: 'showPassword',
      label: 'Contraseña',
      description: 'Permitir crear cuenta'
    }
  ] as const;

  // Opciones para el registro
  const registerOptions = [
    { 
      key: 'showName',
      label: 'Nombre completo',
      description: 'Solicitar nombre y apellidos'
    },
    { 
      key: 'showEmail',
      label: 'Correo electrónico',
      description: 'Requerir dirección de email'
    },
    { 
      key: 'showPhone',
      label: 'Teléfono',
      description: 'Incluir número de contacto'
    },
    { 
      key: 'showDNI',
      label: 'DNI',
      description: 'Solicitar documento de identidad'
    },
    { 
      key: 'showPassword',
      label: 'Contraseña',
      description: 'Permitir crear cuenta'
    },
    { 
      key: 'showLocation',
      label: 'Ubicación',
      description: 'Solicitar país y región'
    },
    { 
      key: 'showGender',
      label: 'Género',
      description: 'Incluir selección de género'
    },
    { 
      key: 'showBirthday',
      label: 'Nacimiento',
      description: 'Solicitar fecha de nacimiento'
    }
  ] as const;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-md">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">
              Información del Usuario
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Configura los campos que se solicitarán
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent className="p-0 space-y-6">
        {/* Sección Login */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-gray-700">
            Campos para Inicio de Sesión
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {loginOptions.map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-start space-x-2"
              >
                <Checkbox
                  id={`login-${key}`}
                  checked={settings.login[key]}
                  onCheckedChange={() => toggleLoginSetting(key as keyof UserSettings['login'])}
                  disabled={key === 'showPassword'}
                  className={cn(
                    "mt-1",
                    key === 'showPassword' 
                      ? "data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400 cursor-not-allowed"
                      : "data-[state=checked]:bg-black data-[state=checked]:border-black"
                  )}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={`login-${key}`}
                    className={cn(
                      "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
                      key === 'showPassword' && "cursor-not-allowed opacity-70"
                    )}
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

        <Separator />

        {/* Sección Register */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-gray-700">
            Campos para Registro
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {registerOptions.map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-start space-x-2"
              >
                <Checkbox
                  id={`register-${key}`}
                  checked={settings.register[key]}
                  onCheckedChange={() => toggleRegisterSetting(key as keyof UserSettings['register'])}
                  disabled={key === 'showPhone' || key === 'showPassword'}
                  className={cn(
                    "mt-1",
                    (key === 'showPhone' || key === 'showPassword')
                      ? "data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400 cursor-not-allowed"
                      : "data-[state=checked]:bg-black data-[state=checked]:border-black"
                  )}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={`register-${key}`}
                    className={cn(
                      "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
                      (key === 'showPhone' || key === 'showPassword') && "cursor-not-allowed opacity-70"
                    )}
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