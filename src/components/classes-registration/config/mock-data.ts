import type { PublicClass, ClassPackage } from "../types"
import { PRICE_CONFIG } from "./constants"

// Datos de prueba para clases
export const mockClasses: PublicClass[] = [
  {
    id: "1",
    title: "Masterclass de Pádel para Todas las Edades",
    description: `¡Bienvenido a nuestra clase especial de pádel diseñada para toda la familia! 

Esta experiencia única está adaptada para participantes de todas las edades y niveles, desde principiantes hasta jugadores intermedios. Los niños aprenderán las bases del deporte de una manera divertida y dinámica, mientras que los adultos podrán perfeccionar su técnica a su propio ritmo.

Durante las sesiones, trabajaremos en:
• Técnicas básicas y avanzadas de golpes
• Posicionamiento en la cancha y estrategia de juego
• Ejercicios específicos adaptados a cada nivel
• Dinámicas grupales y mini-torneos`,
    schedule: {
      days: [1, 3, 5], // Lunes, Miércoles, Viernes
      timeSlots: [
        {
          startTime: "09:00",
          endTime: "10:00",
          capacity: 10,
          spotsLeft: 5,
          instructors: ["Juan Pérez"],
          courtIds: ["court-1"],
          price: PRICE_CONFIG.DEFAULT_PRICE
        }
      ]
    },
    price: PRICE_CONFIG.DEFAULT_PRICE,
    spotsLeft: 5,
    instructor: "Juan Pérez",
    sessions: [],
    branchName: "Sede Central",
    courts: ["court-1"],
    visibility: 'public'
  }
]

// Datos de prueba para paquetes
export const mockPackages: ClassPackage[] = [
  {
    id: "basic",
    title: "Paquete Básico",
    subtitle: "Ideal para principiantes",
    description: "Perfecto para quienes están comenzando",
    price: 15000,
    numberOfClasses: 4,
    features: [
      { icon: 'calendar', text: '4 clases mensuales' },
      { icon: 'clock', text: 'Validez por 30 días' },
      { icon: 'check', text: 'Acceso a clases básicas' }
    ],
    expiration_days: 30,
    advance_booking_days: 7,
    include_private_classes: false,
    available_payment_methods: ['cash', 'card'],
    branch_ids: ['branch-1'],
    tag: null,
    status: 'active'
  },
  {
    id: "premium",
    title: "Paquete Premium",
    subtitle: "La mejor experiencia",
    description: "Para jugadores comprometidos",
    price: 25000,
    numberOfClasses: 8,
    isPopular: true,
    features: [
      { icon: 'calendar', text: '8 clases mensuales' },
      { icon: 'clock', text: 'Validez por 45 días' },
      { icon: 'check', text: 'Acceso a todas las clases' },
      { icon: 'star', text: 'Clases privadas incluidas' }
    ],
    expiration_days: 45,
    advance_booking_days: 14,
    include_private_classes: true,
    available_payment_methods: ['cash', 'card', 'transfer'],
    branch_ids: ['branch-1', 'branch-2'],
    tag: 'popular',
    status: 'active'
  }
] 