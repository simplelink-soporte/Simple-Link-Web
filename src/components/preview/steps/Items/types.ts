import { FormStepField } from '@/types/form-steps';
import { Item, ItemType } from '@/types/items';

export interface ItemsPreviewProps {
  field: FormStepField;
  theme: 'light' | 'dark';
  viewType: 'mobile' | 'desktop';
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isPublicView?: boolean;
  branchId?: string;
  selectedSlot?: any;
}

export interface ItemWithStock extends Item {
  availableStock: number;
  baseStock: number;
  reservedUnits: number;
  id: string;
  name: string;
  type: ItemType;
  duration_pricing: Record<string, number>;
}

export * from './mobile/MobileItemsPreview';