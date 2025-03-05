import { Package } from 'lucide-react';
import { ItemsStepSettings } from './types';

export const ITEMS_STEP = {
  id: "items",
  label: "Artículos",
  icon: Package,
  description: "Equipamiento adicional",
  tooltip: "Permite seleccionar equipamiento y accesorios adicionales"
} as const;

export const DEFAULT_ITEMS_SETTINGS: ItemsStepSettings = {
  isActive: true,
  showImages: true,
  showPrices: true,
  showQuantity: true,
  showDescription: true,
  showCategories: false,
  allowMultiple: true,
  showStock: true,
  showDiscount: false,
  categories: [],
  maxItemsPerOrder: 5
}; 