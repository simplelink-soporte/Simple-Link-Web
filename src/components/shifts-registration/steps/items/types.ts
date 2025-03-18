import { Item, ItemType } from '@/types/items';

// Extendemos de básico, pero proporcionamos defaults para todas las propiedades
export interface ItemWithStock {
  id: string;
  name: string;
  type: ItemType;
  availableStock: number;
  baseStock: number;
  reservedUnits: number;
  duration_pricing: Record<string, number>;
  
  // Propiedades requeridas por el tipo Item
  default_duration?: number;
  stock?: number;
  requires_deposit?: boolean;
  deposit_amount?: number;
  color?: string;
  image_url?: string;
  description?: string;
  category?: string;
  product_id?: string;
  is_active?: boolean;
}

export interface SelectedItemsState {
  [itemId: string]: number;
}
