export type PaymentMethod = 'cash' | 'card' | 'transfer'

export interface PaymentConfig {
  price: number
  currency: string
  discounts?: {
    type: 'percentage' | 'fixed'
    value: number
    description?: string
  }[]
}

export interface PaymentOption {
  method: PaymentMethod
  title: string
  description: string
  icon: string
} 