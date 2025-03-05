import { create } from 'zustand';
import { BookingParticipant, RentalItem } from '@/types/bookings';

interface Court {
  id: number;
  name: string;
  pricePerHour: number;
}

interface BookingStore {
  selectedCourt: Court | null;
  selectedDate: Date;
  selectedStartTime: string | null;
  selectedEndTime: string | null;
  participants: BookingParticipant[];
  rentalItems: RentalItem[];
  setSelectedCourt: (court: Court | null) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedStartTime: (time: string | null) => void;
  setSelectedEndTime: (time: string | null) => void;
  addParticipant: (participant: BookingParticipant) => void;
  removeParticipant: (participantId: number) => void;
  addRentalItem: (item: RentalItem) => void;
  removeRentalItem: (itemId: number) => void;
  updateRentalItemQuantity: (itemId: number, quantity: number) => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  selectedCourt: null,
  selectedDate: new Date(),
  selectedStartTime: null,
  selectedEndTime: null,
  participants: [],
  rentalItems: [],

  setSelectedCourt: (court) => set({ selectedCourt: court }),
  setSelectedDate: (date: Date) => set({ selectedDate: date }),
  setSelectedStartTime: (time) => set({ selectedStartTime: time }),
  setSelectedEndTime: (time) => set({ selectedEndTime: time }),

  addParticipant: (participant) => 
    set((state) => ({
      participants: [...state.participants, participant]
    })),

  removeParticipant: (participantId) =>
    set((state) => ({
      participants: state.participants.filter(p => p.id !== participantId)
    })),

  addRentalItem: (item) =>
    set((state) => ({
      rentalItems: [...state.rentalItems, item]
    })),

  removeRentalItem: (itemId) =>
    set((state) => ({
      rentalItems: state.rentalItems.filter(i => i.id !== itemId)
    })),

  updateRentalItemQuantity: (itemId, quantity) =>
    set((state) => ({
      rentalItems: state.rentalItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    })),

  resetBooking: () => set({
    selectedCourt: null,
    selectedDate: new Date(),
    selectedStartTime: null,
    selectedEndTime: null,
    participants: [],
    rentalItems: []
  })
})); 