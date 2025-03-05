import { FormStepField } from '@/types/form-steps';
import { LocationStepField, LocationStepSettings } from '@/components/steps/location/types';
import { ShiftsStepField, ShiftsStepSettings } from '@/components/steps/shifts/types';
import { ItemsStepField, ItemsStepSettings } from '@/components/steps/items/types';
import { SummaryStepField, SummaryStepSettings } from '@/components/steps/summary/types';
import { GreetingStepField } from '@/components/steps/greeting/types';
import { FarewellStepField, FarewellStepSettings } from '@/components/steps/farewell/types';
import * as PreviewComponents from '@/components/preview/steps';

// Definición de la secuencia de pasos
const STEP_SEQUENCE = {
  GREETING: 'greeting',
  LOCATION: 'location',
  SHIFTS: 'shifts',
  ITEMS: 'items',
  SUMMARY: 'summary',
  FAREWELL: 'farewell'
} as const;

type StepType = typeof STEP_SEQUENCE[keyof typeof STEP_SEQUENCE];

// Orden estricto de los pasos
const STEP_ORDER = [
  STEP_SEQUENCE.GREETING,
  STEP_SEQUENCE.LOCATION,
  STEP_SEQUENCE.SHIFTS,
  STEP_SEQUENCE.ITEMS,
  STEP_SEQUENCE.SUMMARY,
  STEP_SEQUENCE.FAREWELL
];

// Mapeo bidireccional de tipos con transformaciones
const TYPE_MAPPINGS = {
  toSystem: {
    'date': {
      type: STEP_SEQUENCE.LOCATION,
      transform: (field: FormStepField): LocationStepField => {
        const defaultSettings: LocationStepSettings = {
          isActive: true,
          showMap: true,
          showAddress: true,
          showDirections: true,
          defaultLocation: { lat: 0, lng: 0 },
          showBranches: true,
          showSchedule: true,
          showContactInfo: true,
          allowMultipleBranches: false
        };

        return {
          ...field,
          type: 'location',
          title: field.title || 'Seleccionar Ubicación',
          description: field.description || 'Elige la sede más conveniente para ti',
          required: field.required ?? true,
          settings: {
            ...defaultSettings,
            ...field.settings
          }
        };
      }
    },
    'court': {
      type: STEP_SEQUENCE.SHIFTS,
      transform: (field: FormStepField): ShiftsStepField => {
        const defaultSettings: ShiftsStepSettings = {
          isActive: true,
          showFullCalendar: true,
          showTimeSlots: true,
          showDuration: true,
          showCapacity: true,
          showPrice: true,
          allowMultipleSlots: false,
          minDuration: {
            value: 60,
            unit: 'minutes'
          },
          maxDuration: {
            value: 180,
            unit: 'minutes'
          },
          allowDurationChange: true,
          showAvailability: true
        };

        return {
          ...field,
          type: 'shifts',
          title: field.title || 'Seleccionar Turno',
          description: field.description || 'Elige el horario que mejor se adapte a tu agenda',
          required: field.required ?? true,
          settings: {
            ...defaultSettings,
            ...field.settings
          }
        };
      }
    },
    'players': {
      type: STEP_SEQUENCE.ITEMS,
      transform: (field: FormStepField): ItemsStepField => {
        const defaultSettings: ItemsStepSettings = {
          isActive: true,
          showImages: true,
          showPrices: true,
          showQuantity: true,
          showDiscount: true,
          showCategories: true,
          allowMultiple: true,
          showStock: true,
          categories: [],
          maxItemsPerOrder: 10,
          showDescription: true
        };

        return {
          ...field,
          type: 'items',
          title: field.title || 'Seleccionar Artículos',
          description: field.description || 'Elige los artículos que desees agregar',
          required: field.required ?? true,
          settings: {
            ...defaultSettings,
            ...field.settings
          }
        };
      }
    },
    'summary': {
      type: STEP_SEQUENCE.SUMMARY,
      transform: (field: FormStepField): SummaryStepField => {
        const defaultSettings: SummaryStepSettings = {
          isActive: true,
          showCoupons: true,
          paymentTypes: {
            booking: true,
            guarantee: true
          },
          sections: {
            summary: true,
            payment: true
          }
        };

        return {
          ...field,
          type: 'summary',
          title: field.title || 'Resumen de Reserva',
          description: field.description || 'Revisa los detalles de tu reserva',
          required: field.required ?? true,
          settings: {
            ...defaultSettings,
            ...field.settings
          }
        };
      }
    },
    'farewell': {
      type: STEP_SEQUENCE.FAREWELL,
      transform: (field: FormStepField): FarewellStepField => {
        const defaultSettings: FarewellStepSettings = {
          isActive: true,
          showConfirmationNumber: true,
          showBookingSummary: true,
          showContactInfo: true,
          showSocialShare: true,
          showQRCode: true,
          showDirections: true,
          showCalendarAdd: true,
          showPrint: true,
          showEmail: true
        };

        return {
          ...field,
          type: 'farewell',
          title: field.title || '¡Reserva Exitosa!',
          description: field.description || 'Tu reserva ha sido confirmada',
          required: field.required ?? true,
          settings: {
            ...defaultSettings,
            ...field.settings
          }
        };
      }
    }
  }
};

// Componentes por tipo del sistema
const componentMap: Record<StepType, any> = {
  [STEP_SEQUENCE.GREETING]: PreviewComponents.GreetingPreview,
  [STEP_SEQUENCE.LOCATION]: PreviewComponents.LocationPreview,
  [STEP_SEQUENCE.SHIFTS]: PreviewComponents.ShiftsPreview,
  [STEP_SEQUENCE.ITEMS]: PreviewComponents.ItemsPreview,
  [STEP_SEQUENCE.SUMMARY]: PreviewComponents.SummaryPreview,
  [STEP_SEQUENCE.FAREWELL]: PreviewComponents.FarewellPreview,
};

// Función para obtener el tipo de paso normalizado
export function getStepType(type: string): StepType {
  const mapping = TYPE_MAPPINGS.toSystem[type as keyof typeof TYPE_MAPPINGS.toSystem];
  const systemType = mapping ? mapping.type : type as StepType;
  
  console.log('[StepType] Normalizando tipo:', {
    original: type,
    systemType,
    hasMapping: !!mapping
  });
  
  return systemType;
}

// Validación de orden de pasos
export function validateStepOrder(currentType: string, nextType: string): boolean {
  const currentSystemType = getStepType(currentType);
  const nextSystemType = getStepType(nextType);

  console.log('[StepOrder] Validando orden:', {
    currentType: currentSystemType,
    nextType: nextSystemType,
    STEP_ORDER,
    totalSteps: STEP_ORDER.length
  });

  const currentOrder = STEP_ORDER.indexOf(currentSystemType);
  const nextOrder = STEP_ORDER.indexOf(nextSystemType);

  // Validar que ambos tipos existan en el orden
  if (currentOrder === -1 || nextOrder === -1) {
    console.warn('[StepOrder] Tipo de paso no encontrado en el orden:', {
      currentOrder,
      nextOrder,
      currentType: currentSystemType,
      nextType: nextSystemType
    });
    return false;
  }

  // Permitir la navegación si:
  // 1. El siguiente paso es el siguiente en la secuencia, o
  // 2. Estamos en summary y el siguiente es farewell
  const isValid = nextOrder === currentOrder + 1 || 
    (currentSystemType === STEP_SEQUENCE.SUMMARY && nextSystemType === STEP_SEQUENCE.FAREWELL);

  console.log('[StepOrder] Resultado de validación:', {
    currentOrder,
    nextOrder,
    isValid,
    isSummaryToFarewell: currentSystemType === STEP_SEQUENCE.SUMMARY && nextSystemType === STEP_SEQUENCE.FAREWELL
  });

  return isValid;
}

// Función para obtener el componente público
export function getPublicComponent(field: FormStepField) {
  const originalType = field.type;
  const systemType = getStepType(originalType);
  
  console.log('[ComponentMapper] Mapeando componente:', {
    originalType,
    systemType,
    availableTypes: Object.keys(componentMap)
  });

  const component = componentMap[systemType];
  
  if (!component) {
    console.error(`[ComponentMapper] No se encontró componente para: ${originalType} -> ${systemType}`);
    return null;
  }

  console.log('[ComponentMapper] Componente encontrado:', {
    originalType,
    systemType,
    component: component.name
  });

  return component;
}

// Función para mapear y transformar el campo
function mapField(field: FormStepField): FormStepField {
  const mapping = TYPE_MAPPINGS.toSystem[field.type as keyof typeof TYPE_MAPPINGS.toSystem];
  
  if (!mapping) {
    console.log(`[TypeMapper] Usando tipo original para: ${field.type}`);
    return {
      ...field,
      title: field.title || '',
      description: field.description || '',
      required: field.required ?? true
    };
  }

  console.log(`[TypeMapper] Mapeando tipo: ${field.type} -> ${mapping.type}`);
  return {
    ...field,
    ...mapping.transform(field),
    title: field.title || '',
    description: field.description || '',
    required: field.required ?? true
  };
}

// Función para obtener el orden de un tipo
function getStepOrder(type: string): number {
  const systemType = getStepType(type);
  const order = STEP_ORDER.indexOf(systemType);
  
  console.log(`[OrderMapper] Orden para ${type} -> ${systemType}: ${order}`);
  return order === -1 ? 999 : order;
}

// Función para ordenar los campos según el orden definido
export function sortFormFields(fields: FormStepField[]): FormStepField[] {
  if (!fields || !Array.isArray(fields)) {
    console.warn('[FieldSorter] No hay campos para ordenar o formato inválido');
    return [];
  }

  console.log('[FieldSorter] Campos originales:', fields.map(f => f.type));

  // Asegurar que farewell esté incluido
  const hasFarewell = fields.some(f => getStepType(f.type) === STEP_SEQUENCE.FAREWELL);
  if (!hasFarewell) {
    console.log('[FieldSorter] Agregando paso farewell');
    fields = [...fields, {
      id: 'farewell',
      type: 'farewell',
      title: '¡Reserva Exitosa!',
      description: 'Tu reserva ha sido confirmada',
      required: true,
      settings: {
        isActive: true,
        showConfirmationNumber: true,
        showBookingSummary: true,
        showContactInfo: true,
        showSocialShare: true,
        showQRCode: true,
        showDirections: true,
        showCalendarAdd: true,
        showPrint: true,
        showEmail: true
      }
    } as FarewellStepField];
  }

  // Mapear y transformar campos
  const mappedFields = fields.map(field => {
    const mappedField = mapField(field);
    const order = getStepOrder(field.type);
    
    console.log(`[FieldSorter] Mapeando campo: ${field.type} -> ${mappedField.type} (orden: ${order})`);
    
    return mappedField;
  });

  // Ordenar por el orden explícito
  const sortedFields = [...mappedFields].sort((a, b) => {
    const orderA = getStepOrder(a.type);
    const orderB = getStepOrder(b.type);
    
    console.log(`[FieldSorter] Comparando: ${a.type}(${orderA}) vs ${b.type}(${orderB})`);
    
    return orderA - orderB;
  });

  console.log('[FieldSorter] Campos ordenados:', sortedFields.map(f => ({ 
    type: f.type, 
    order: getStepOrder(f.type)
  })));
  
  return sortedFields;
}