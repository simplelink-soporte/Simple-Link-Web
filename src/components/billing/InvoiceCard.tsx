import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Invoice } from "@/services/billingService"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Utilidades para el manejo de invoice status
const getInvoiceStatusText = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return 'Pagada'
    case 'deposit':
      return 'Seña'
    case 'guarantee':
      return 'Garantía'
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

// Colores para los círculos de estado
const getStatusCircleColor = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return "border-[1.5px] border-[#22896F]" // Verde turquesa
    case 'deposit':
      return "border-[1.5px] border-[#F0A92E]" // Amarillo
    case 'guarantee':
      return "border-[1.5px] border-[#8A4EBC]" // Violeta
    case 'pending':
      return "border-[1.5px] border-[#E67E22]" // Naranja
    case 'overdue':
      return "border-[1.5px] border-[#E74C3C]" // Rojo
    case 'cancelled':
      return "border-[1.5px] border-[#95A5A6]" // Gris
    default:
      return "border-[1.5px] border-gray-400"
  }
}

// Colores para el texto del estado
const getStatusTextColor = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return "text-[#22896F]" // Verde turquesa
    case 'deposit':
      return "text-[#F0A92E]" // Amarillo
    case 'guarantee':
      return "text-[#8A4EBC]" // Violeta
    case 'pending':
      return "text-[#E67E22]" // Naranja
    case 'overdue':
      return "text-[#E74C3C]" // Rojo
    case 'cancelled':
      return "text-[#95A5A6]" // Gris
    default:
      return "text-gray-600"
  }
}

// Colores para el fondo rectangular suave
const getStatusBgColor = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return "bg-[#22896F]/10" // Verde turquesa con 10% de opacidad
    case 'deposit':
      return "bg-[#F0A92E]/10" // Amarillo con 10% de opacidad
    case 'guarantee':
      return "bg-[#8A4EBC]/10" // Violeta con 10% de opacidad
    case 'pending':
      return "bg-[#E67E22]/10" // Naranja con 10% de opacidad
    case 'overdue':
      return "bg-[#E74C3C]/10" // Rojo con 10% de opacidad
    case 'cancelled':
      return "bg-[#95A5A6]/10" // Gris con 10% de opacidad
    default:
      return "bg-gray-100"
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return format(date, 'dd MMM yyyy', { locale: es })
  } catch (error) {
    return dateString
  }
}

interface InvoiceCardProps {
  invoice: Invoice
  onClick: (invoice: Invoice) => void
}

export function InvoiceCard({ invoice, onClick }: InvoiceCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Si hay URL de Stripe, abrirla directamente
    if (invoice.stripe_hosted_url) {
      window.open(invoice.stripe_hosted_url, '_blank');
    } else {
      // Si no hay URL de Stripe, usar el comportamiento estándar
      onClick(invoice);
    }
  };

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-all bg-white"
    >
      <div className="space-y-1 flex items-center">
        <div className={cn(
          "h-4 w-4 rounded-full mr-3 flex-shrink-0 bg-white",
          getStatusCircleColor(invoice.status)
        )} />
        <div>
          {/* Estado con color y fondo según estado */}
          <h4 className={cn(
            "text-sm font-medium px-2 py-0.5 rounded-md inline-block",
            getStatusTextColor(invoice.status),
            getStatusBgColor(invoice.status)
          )}>
            {getInvoiceStatusText(invoice.status)}
          </h4>
          
          <p className="text-xs text-gray-500 mt-1">
            {/* Nombre y fecha con el mismo color que el número de factura */}
            {invoice.customer_name}
            <span className="mx-1 text-gray-300">•</span>
            {formatDate(invoice.date)}
            {invoice.court_type && invoice.court_time && (
              <>
                <span className="mx-1 text-gray-300">•</span>
                {invoice.court_type}
                <span className="mx-1 text-gray-300">•</span>
                {invoice.court_time}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right flex flex-col items-end">
          <Button 
            size="sm" 
            variant="ghost"
            className="hover:bg-transparent font-normal text-xs text-gray-500 hover:text-gray-700"
            onClick={handleCardClick}
          >
            Ver detalle
          </Button>
          <p className="text-xs text-gray-500 mt-1">{invoice.invoice_number}</p>
        </div>
      </div>
    </div>
  )
}
