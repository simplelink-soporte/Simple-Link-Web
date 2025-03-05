import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { GuestForm, Selection } from '@/types/bookings'

interface UseBookingModalsProps {
  onModalClose?: () => void
}

export function useBookingModals({ onModalClose }: UseBookingModalsProps = {}) {
  // Estados para modales
  const [showSimpleShiftModal, setShowSimpleShiftModal] = useState(false)
  const [showNewBookingModal, setShowNewBookingModal] = useState(false)

  // Estados para invitados
  const [guests, setGuests] = useState<GuestForm[]>([])
  const [currentGuest, setCurrentGuest] = useState<GuestForm>({
    id: uuidv4(),
    fullName: '',
    dni: '',
    email: '',
    phone: ''
  })

  // Función para reiniciar estados
  const resetFormStates = useCallback(() => {
    setGuests([])
    setCurrentGuest({
      id: uuidv4(),
      fullName: '',
      dni: '',
      email: ''
    })
  }, [])

  // Manejadores de modales
  const handleSimpleShiftModalClose = useCallback(() => {
    setShowSimpleShiftModal(false)
    resetFormStates()
    onModalClose?.()
  }, [resetFormStates, onModalClose])

  const handleNewBookingModalClose = useCallback(() => {
    setShowNewBookingModal(false)
    resetFormStates()
    onModalClose?.()
  }, [resetFormStates, onModalClose])

  // Manejadores de invitados
  const handleAddGuest = useCallback((newGuest?: GuestForm) => {
    if (newGuest) {
      setGuests(prev => {
        const exists = prev.some(g => g.id === newGuest.id)
        if (exists) return prev
        return [...prev, newGuest]
      })
    } else if (currentGuest.fullName.trim()) {
      setGuests(prev => {
        const exists = prev.some(g => g.id === currentGuest.id)
        if (exists) return prev
        return [...prev, currentGuest]
      })
      setCurrentGuest({
        id: uuidv4(),
        fullName: '',
        dni: '',
        email: '',
        phone: ''
      })
    }
  }, [currentGuest])

  const handleRemoveGuest = useCallback((id: string) => {
    setGuests(prev => prev.filter(guest => guest.id !== id))
  }, [])

  return {
    showSimpleShiftModal,
    setShowSimpleShiftModal,
    showNewBookingModal,
    setShowNewBookingModal,
    handleSimpleShiftModalClose,
    handleNewBookingModalClose,
    guests,
    currentGuest,
    handleAddGuest,
    handleRemoveGuest,
    resetFormStates
  }
} 