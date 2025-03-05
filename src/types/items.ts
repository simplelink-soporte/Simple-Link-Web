// Tipos de artículos disponibles
export type ItemType = 'equipment' | 'accessory' | 'consumable'

// Interfaz base para los artículos
export interface Item {
  id: string
  name: string
  type: ItemType
  duration_pricing: Record<string, number>
  default_duration: number
  stock: number
  requires_deposit: boolean
  deposit_amount: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  empresa_id: string
  sede_id: string | null
}

// Interfaz para artículos con precio calculado
export interface ItemWithCalculatedPrice extends Item {
  calculatedPrice: number
}

// Interfaz para selección de artículos de alquiler
export interface RentalSelection {
  itemId: string
  quantity: number
  pricePerUnit: number
  price: number
  duration: number
  totalPrice: number
} 