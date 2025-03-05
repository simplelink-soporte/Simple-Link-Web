"use client"

import { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TimeRange, DayPricing, CourtPricing } from '@/types/court';
import { IconPlus, IconTrash, IconQuestionMark } from '@tabler/icons-react';
import { TimeSelect } from "@/components/ui/time-select";

interface CourtPricingConfigProps {
  pricing: CourtPricing;
  onChange: (pricing: CourtPricing) => void;
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

export function CourtPricingConfig({ pricing, onChange }: CourtPricingConfigProps) {
  const [customDayPricing, setCustomDayPricing] = useState<Record<string, boolean>>(
    Object.fromEntries(DAYS.map(day => [day.key, !!pricing.byDay?.[day.key]]))
  );

  const handleDefaultPriceChange = (value: string) => {
    onChange({
      ...pricing,
      default: Number(value) || 0
    });
  };

  const handleDayPriceChange = (day: string, value: string) => {
    onChange({
      ...pricing,
      byDay: {
        ...pricing.byDay,
        [day]: {
          ...pricing.byDay?.[day],
          default: Number(value) || 0
        }
      }
    });
  };

  const toggleCustomPricing = (day: string) => {
    setCustomDayPricing(prev => ({
      ...prev,
      [day]: !prev[day]
    }));

    if (!customDayPricing[day]) {
      // Activar precio personalizado
      onChange({
        ...pricing,
        byDay: {
          ...pricing.byDay,
          [day]: { default: pricing.default }
        }
      });
    } else {
      // Desactivar precio personalizado
      const newPricing = { ...pricing };
      if (newPricing.byDay) {
        delete newPricing.byDay[day];
        if (Object.keys(newPricing.byDay).length === 0) {
          delete newPricing.byDay;
        }
      }
      onChange(newPricing);
    }
  };

  const handleTimeRangeChange = (
    rangeIndex: number, 
    field: keyof TimeRange, 
    value: string, 
    day?: string
  ) => {
    const updateTimeRanges = (ranges: TimeRange[] = []): TimeRange[] => {
      return ranges.map((range, index) => 
        index === rangeIndex ? { ...range, [field]: field === 'price' ? Number(value) || 0 : value } : range
      );
    };

    if (day) {
      onChange({
        ...pricing,
        byDay: {
          ...pricing.byDay,
          [day]: {
            ...pricing.byDay?.[day],
            timeRanges: updateTimeRanges(pricing.byDay?.[day]?.timeRanges)
          }
        }
      });
    } else {
      onChange({
        ...pricing,
        defaultTimeRanges: updateTimeRanges(pricing.defaultTimeRanges)
      });
    }
  };

  const deleteTimeRange = (rangeIndex: number, day?: string) => {
    if (day) {
      onChange({
        ...pricing,
        byDay: {
          ...pricing.byDay,
          [day]: {
            ...pricing.byDay?.[day],
            timeRanges: pricing.byDay?.[day]?.timeRanges?.filter((_, index) => index !== rangeIndex)
          }
        }
      });
    } else {
      onChange({
        ...pricing,
        defaultTimeRanges: pricing.defaultTimeRanges?.filter((_, index) => index !== rangeIndex)
      });
    }
  };

  const addTimeRange = (day?: string) => {
    const newRange = { start: '00:00', end: '23:59', price: day ? pricing.byDay?.[day]?.default || pricing.default : pricing.default };
    
    if (day) {
      const dayPricing = pricing.byDay?.[day] || { default: pricing.default };
      onChange({
        ...pricing,
        byDay: {
          ...pricing.byDay,
          [day]: {
            ...dayPricing,
            timeRanges: [...(dayPricing.timeRanges || []), newRange]
          }
        }
      });
    } else {
      onChange({
        ...pricing,
        defaultTimeRanges: [...(pricing.defaultTimeRanges || []), newRange]
      });
    }
  };

  const TimeRangesList = ({ ranges = [], onAdd, day }: { 
    ranges: TimeRange[], 
    onAdd: () => void,
    day?: string 
  }) => (
    <div className="space-y-2">
      {ranges.map((range, index) => (
        <div key={index} className="flex items-center gap-2">
          <TimeSelect
            value={range.start}
            onChange={(value) => handleTimeRangeChange(index, 'start', value, day)}
            className="w-24"
          />
          <span>a</span>
          <TimeSelect
            value={range.end}
            onChange={(value) => handleTimeRangeChange(index, 'end', value, day)}
            className="w-24"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={range.price.toString()}
            onChange={(e) => handleTimeRangeChange(index, 'price', e.target.value, day)}
            className="w-24 focus:bg-gray-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            onClick={() => deleteTimeRange(index, day)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      ))}
      
      <button
        onClick={onAdd}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
      >
        <IconPlus className="h-4 w-4" />
        Agregar rango horario
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Precio por defecto */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Precio por defecto</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={pricing.default}
            onChange={(e) => handleDefaultPriceChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Rangos de horario por defecto */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Precios por Horario</label>
            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
              <IconQuestionMark className="h-3 w-3 text-gray-500" />
            </div>
          </div>
          <TimeRangesList 
            ranges={pricing.defaultTimeRanges || []}
            onAdd={() => addTimeRange()}
          />
        </div>
      </div>

      {/* Precios por día */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Precios personalizados por día</h4>
        
        {DAYS.map(({ key, label }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch
                checked={customDayPricing[key]}
                onCheckedChange={() => toggleCustomPricing(key)}
              />
            </div>

            {customDayPricing[key] && (
              <div className="pl-4 space-y-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.byDay?.[key]?.default || pricing.default}
                  onChange={(e) => handleDayPriceChange(key, e.target.value)}
                  className="w-full"
                />

                {/* Rangos de horario por día */}
                <TimeRangesList 
                  ranges={pricing.byDay?.[key]?.timeRanges || []}
                  onAdd={() => addTimeRange(key)}
                  day={key}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 