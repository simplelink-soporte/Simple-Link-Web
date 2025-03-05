import { createContext, useContext, useState, useCallback } from 'react'
import type { RentalSelection } from '@/types/items'

interface RentalContextType {
  rentals: RentalSelection[]
  totalPrice: number
  updateRentals: (rentals: RentalSelection[]) => void
  calculateTotalPrice: () => number
  validateRental: (rental: RentalSelection) => boolean
}

const RentalContext = createContext<RentalContextType | undefined>(undefined)

export function RentalProvider({ children }: { children: React.ReactNode }) {
  const [rentals, setRentals] = useState<RentalSelection[]>([])
  const [totalPrice, setTotalPrice] = useState(0)

  const validateRental = useCallback((rental: RentalSelection): boolean => {
    // Validación exhaustiva de cada rental
    if (!rental.itemId || rental.quantity === undefined || rental.pricePerUnit === undefined) {
      console.warn('Rental inválido - campos faltantes:', rental)
      return false
    }

    if (typeof rental.quantity !== 'number' || rental.quantity <= 0) {
      console.warn('Rental inválido - cantidad inválida:', rental)
      return false
    }

    if (typeof rental.pricePerUnit !== 'number' || rental.pricePerUnit <= 0) {
      console.warn('Rental inválido - precio inválido:', rental)
      return false
    }

    // Calcular y validar el precio total
    const calculatedTotal = Number((rental.quantity * rental.pricePerUnit).toFixed(2))
    
    // Validar que el precio total sea un número válido
    if (isNaN(calculatedTotal) || calculatedTotal <= 0) {
      console.warn('Rental inválido - precio total inválido:', {
        rental,
        calculatedTotal
      })
      return false
    }
    
    // Asignar el precio total calculado
    rental.totalPrice = calculatedTotal
    rental.price = calculatedTotal // Mantener compatibilidad con ambas propiedades

    // Asegurar que la duración esté presente
    if (!rental.duration || rental.duration <= 0) {
      console.warn('Rental inválido - duración inválida:', rental)
      return false
    }

    console.log('Rental validado:', {
      itemId: rental.itemId,
      quantity: rental.quantity,
      pricePerUnit: rental.pricePerUnit,
      calculatedTotal,
      duration: rental.duration,
      totalPrice: rental.totalPrice
    })

    return true
  }, [])

  const calculateTotalPrice = useCallback(() => {
    const total = rentals.reduce((sum, rental) => {
      if (!validateRental(rental)) return sum
      // En este punto sabemos que rental.quantity y rental.pricePerUnit son números válidos
      const itemTotal = (rental.quantity as number) * (rental.pricePerUnit as number)
      console.log('Calculando precio para rental:', {
        itemId: rental.itemId,
        quantity: rental.quantity,
        pricePerUnit: rental.pricePerUnit,
        itemTotal
      })
      return sum + itemTotal
    }, 0)
    console.log('Precio total calculado:', total)
    return total
  }, [rentals, validateRental])

  const updateRental = (rental: RentalSelection) => {
    if (!rental.quantity || rental.quantity <= 0) {
      console.error('Cantidad inválida:', rental)
      return
    }

    if (!rental.pricePerUnit || rental.pricePerUnit <= 0) {
      console.error('Precio por unidad inválido:', rental)
      return
    }

    const calculatedTotal = Number((rental.quantity * rental.pricePerUnit).toFixed(2))
    
    console.log('Actualizando precio de rental:', {
      itemId: rental.itemId,
      basePrice: rental.pricePerUnit,
      quantity: rental.quantity,
      totalPrice: calculatedTotal
    })

    const updatedRental: RentalSelection = {
      ...rental,
      totalPrice: calculatedTotal,
      price: calculatedTotal // Mantener compatibilidad con ambas propiedades
    }

    setRentals(prev => {
      const existing = prev.find(r => r.itemId === rental.itemId)
      if (existing) {
        return prev.map(r => r.itemId === rental.itemId ? updatedRental : r)
      }
      return [...prev, updatedRental]
    })
  }

  const updateRentals = useCallback((newRentals: RentalSelection[]) => {
    console.log('Actualizando rentals:', newRentals)
    // Filtrar rentals inválidos y asegurar que tengan precio total
    const validRentals = newRentals.filter(rental => {
      if (!validateRental(rental)) return false
      
      // Asegurar que el precio total esté presente y sea válido
      const calculatedTotal = Number((rental.quantity * rental.pricePerUnit).toFixed(2))
      rental.totalPrice = calculatedTotal
      rental.price = calculatedTotal
      
      return true
    })
    
    if (validRentals.length !== newRentals.length) {
      console.warn('Se eliminaron rentals inválidos:', {
        original: newRentals.length,
        valid: validRentals.length
      })
    }

    setRentals(validRentals)
    const newTotal = validRentals.reduce((sum, rental) => sum + rental.totalPrice, 0)
    console.log('Nuevo precio total:', newTotal)
    setTotalPrice(newTotal)
  }, [validateRental])

  return (
    <RentalContext.Provider value={{
      rentals,
      totalPrice,
      updateRentals,
      calculateTotalPrice,
      validateRental
    }}>
      {children}
    </RentalContext.Provider>
  )
}

export function useRentalContext() {
  const context = useContext(RentalContext)
  if (context === undefined) {
    throw new Error('useRentalContext must be used within a RentalProvider')
  }
  return context
} 