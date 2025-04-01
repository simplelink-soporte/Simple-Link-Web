import { Invoice } from "@/services/billingService"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Funciones para el manejo de datos de facturas
export const getInvoiceStatusText = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return 'Pagada'
    case 'pending':
      return 'Pendiente'
    case 'overdue':
      return 'Vencida'
    case 'cancelled':
      return 'Cancelada'
    default:
      return status
  }
}

export const getInvoiceStatusClasses = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return "border-green-300 bg-green-50 text-green-700"
    case 'pending':
      return "border-yellow-300 bg-yellow-50 text-yellow-700"
    case 'overdue':
      return "border-red-300 bg-red-50 text-red-700"
    case 'cancelled':
      return "border-gray-300 bg-gray-50 text-gray-700"
    default:
      return "border-gray-300 bg-gray-50 text-gray-700"
  }
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return format(date, 'dd MMM yyyy', { locale: es })
  } catch (error) {
    return dateString
  }
}

// Tipos para props compartidos
export interface InvoiceFilterState {
  statusFilter: 'all' | Invoice['status']
  searchTerm: string
}
