import { Item, ItemType } from '@/types/items';

// Define la interfaz de un ítem con información de stock
export interface ItemWithStock {
  // Campos obligatorios
  id: string;
  name: string;
  type: ItemType;
  availableStock: number;
  baseStock: number;
  reservedUnits: number;
  duration_pricing: Record<string, number>;
  
  // Campos opcionales provenientes de Item
  default_duration?: number;
  stock?: number;
  requires_deposit?: boolean;
  deposit_amount?: number | null;
  color?: string;
  image_url?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
  product_id?: string;
  empresa_id?: string;
  sede_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Estado de ítems seleccionados
export interface SelectedItemsState {
  [itemId: string]: number;
}
