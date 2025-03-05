import { type Item } from './items'

export interface Rental {
  itemId: string
  quantity: number
  duration: number
  price: number
  pricePerUnit: number
}

export interface RentalWithDetails extends Rental {
  item?: Item
  totalPrice: number
  availableStock?: number
}

export interface RentalSummary {
  items: RentalWithDetails[]
  totalPrice: number
  totalQuantity: number
}

export interface RentalCreationData {
  itemId: string
  quantity: number
  duration: number
  pricePerUnit: number
}

export interface RentalAvailability {
  itemId: string
  availableStock: number
  baseStock: number
  reservedUnits: number
}

// Utilidades para cálculos de rentals
export const calculateRentalPrice = (rental: Rental): number => {
  if (!rental.quantity || !rental.pricePerUnit) return 0
  return rental.quantity * rental.pricePerUnit
}

export const calculateTotalRentalsPrice = (rentals: Rental[]): number => {
  return rentals.reduce((total, rental) => total + calculateRentalPrice(rental), 0)
}

export const validateRental = (rental: Rental): boolean => {
  return !!(
    rental.itemId &&
    rental.quantity > 0 &&
    rental.duration > 0 &&
    rental.pricePerUnit > 0
  )
}

export const validateRentalAvailability = (
  rental: Rental,
  availability: RentalAvailability
): boolean => {
  if (!rental || !availability) return false
  
  return (
    rental.itemId === availability.itemId &&
    rental.quantity <= availability.availableStock
  )
}

export const calculateAvailableStock = (
  baseStock: number,
  reservedUnits: number
): number => {
  return Math.max(0, baseStock - reservedUnits)
} 