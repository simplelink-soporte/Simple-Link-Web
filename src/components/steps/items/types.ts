export interface ItemsStepSettings {
  isActive: boolean;
  showImages: boolean;
  showPrices: boolean;
  showQuantity: boolean;
  showDescription: boolean;
  showCategories: boolean;
  allowMultiple: boolean;
  showStock: boolean;
  showDiscount: boolean;
  categories: string[];
  maxItemsPerOrder: number;
}

export interface ItemsStepField {
  id: string;
  type: 'items';
  label: string;
  title: string;
  description: string;
  required: boolean;
  settings: ItemsStepSettings;
} 