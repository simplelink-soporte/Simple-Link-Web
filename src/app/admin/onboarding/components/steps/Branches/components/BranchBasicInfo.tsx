import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SingleSelect } from '@/components/ui/single-select';

/**
 * Interfaz para los datos básicos de una sede
 */
interface BranchBasicInfoData {
  name: string;
  address: string;
  phone: string;
  manager: string;
  isActive: boolean;
  timezone: string;
}

/**
 * Props para el componente BranchBasicInfo
 */
interface BranchBasicInfoProps {
  data: BranchBasicInfoData;
  onChange: (field: keyof BranchBasicInfoData, value: string | boolean) => void;
  isSubmitting?: boolean;
}

/**
 * Componente que maneja la información básica de una sede
 */
export function BranchBasicInfo({ data, onChange, isSubmitting = false }: BranchBasicInfoProps) {
  const timezones = [
    { id: 'Europe/Madrid', name: 'Europe/Madrid (UTC+1/+2)' },
    { id: 'Europe/London', name: 'Europe/London (UTC+0/+1)' },
    { id: 'America/New_York', name: 'America/New_York (UTC-5/-4)' },
    { id: 'America/Los_Angeles', name: 'America/Los_Angeles (UTC-8/-7)' },
    { id: 'America/Mexico_City', name: 'America/Mexico_City (UTC-6/-5)' },
    { id: 'America/Tijuana', name: 'America/Tijuana (UTC-8/-7)' },
    { id: 'America/Chihuahua', name: 'America/Chihuahua (UTC-7/-6)' },
    { id: 'America/Cancun', name: 'America/Cancun (UTC-5)' }
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="branch-name" className="text-sm">Nombre de la sede</Label>
        <Input
          id="branch-name"
          placeholder="Ej: Club Deportivo Central"
          value={data.name}
          onChange={(e) => onChange('name', e.target.value)}
          disabled={isSubmitting}
          className="h-9 text-sm"
          required
        />
      </div>
      
      <div className="grid gap-1.5">
        <Label htmlFor="branch-address" className="text-sm">Dirección</Label>
        <Input
          id="branch-address"
          placeholder="Ej: Calle Principal 123"
          value={data.address}
          onChange={(e) => onChange('address', e.target.value)}
          disabled={isSubmitting}
          className="h-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="branch-phone" className="text-sm">Teléfono</Label>
          <Input
            id="branch-phone"
            placeholder="Teléfono de contacto"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            disabled={isSubmitting}
            className="h-9 text-sm"
          />
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="branch-manager" className="text-sm">Encargado</Label>
          <Input
            id="branch-manager"
            placeholder="Ej: Juan Pérez"
            value={data.manager}
            onChange={(e) => onChange('manager', e.target.value)}
            disabled={isSubmitting}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="timezone" className="text-sm">Zona Horaria</Label>
        <SingleSelect
          value={data.timezone}
          onChange={(value) => onChange('timezone', value)}
          options={timezones}
          placeholder="Selecciona la zona horaria"
        />
      </div>
    </div>
  );
} 