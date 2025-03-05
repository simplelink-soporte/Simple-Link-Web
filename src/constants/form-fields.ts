import { 
  Users, 
  MapPin, 
  CalendarDays, 
  Clock, 
  Package, 
  Bell, 
  Ticket, 
  Send,
  ClipboardList,
  Hand
} from "lucide-react"

export const FIELD_TYPES = [
  { 
    id: "users", 
    label: "Usuarios", 
    icon: Users, 
    description: "Información del usuario",
    tooltip: "Recopila información personal del usuario"
  },
  { 
    id: "location", 
    label: "Ubicación", 
    icon: MapPin, 
    description: "Datos de localización",
    tooltip: "Permite seleccionar la sucursal"
  },
  { 
    id: "shifts", 
    label: "Turnos", 
    icon: Clock, 
    description: "Horarios disponibles",
    tooltip: "Permite seleccionar los horarios disponibles"
  },
  { 
    id: "items", 
    label: "Artículos", 
    icon: Package, 
    description: "Productos adicionales",
    tooltip: "Lista de equipamiento adicional"
  },
  { 
    id: "summary", 
    label: "Resumen",
    icon: ClipboardList,
    description: "Resumen de la reserva",
    tooltip: "Muestra un resumen de todos los detalles de la reserva"
  },
  { 
    id: "farewell", 
    label: "Despedida", 
    icon: Send, 
    description: "Mensaje final",
    tooltip: "Mensaje de confirmación y agradecimiento al finalizar el formulario."
  },
  {
    id: 'greeting',
    label: 'Saludo',
    description: 'Mensaje de bienvenida personalizado',
    icon: Hand,
    tooltip: 'Añade un mensaje de bienvenida al inicio del formulario',
    required: false
  }
] as const

export const DEFAULT_FIELD_ORDER = [
  "greeting",
  "users",
  "location",
  "shifts",
  "items",
  "summary",
  "farewell"
] as const

// Definimos los órdenes predeterminados para cada plantilla
export const TEMPLATE_ORDERS = {
  classic: [
    'greeting',
    'users',
    'location',
    'shifts',
    'items',
    'summary',
    'farewell'
  ],
  minimal: [
    'greeting',
    'users',
    'shifts',
    'farewell'
  ],
  fancy: [
    'greeting',
    'users',
    'location',
    'shifts',
    'items',
    'summary',
    'farewell'
  ]
} as const

// Exportamos el tipo para el campo
export type FieldType = typeof FIELD_TYPES[number]["id"]

// Exportamos el tipo para las plantillas
export type TemplateType = keyof typeof TEMPLATE_ORDERS

export const initialFields: FormStepField[] = [
  {
    id: '1',
    type: 'greeting',
    label: 'Greeting',
    settings: {
      title: "Garden Arena",
      subtitle: "Reserva tu cancha de pádel en simples pasos"
    }
  },
  // ... otros campos
];