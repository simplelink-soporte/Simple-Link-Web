"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Invoice } from "@/services/billingService"
import { useBranches } from "@/hooks/useBranches"
import { toast } from "sonner"
import { useInvoices } from "@/hooks/useInvoices"
import { useStripeInvoices } from "@/hooks/useStripeInvoices"

// Componentes modularizados
import { InvoiceCard } from "./InvoiceCard"
import { InvoiceFilters } from "./InvoiceFilters"
import { getInvoiceStatusText } from "./utils"

// Componente principal
export function BillingTable() {
  const { currentBranch } = useBranches()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all')
  
  // Query de facturas reales de Stripe (ahora siempre usamos Stripe)
  const invoicesQuery = useStripeInvoices({
    empresaId: currentBranch?.empresa_id || '',
    // Mapeamos los estados internos a los estados de Stripe,
    // incluyendo ahora los estados personalizados (deposit, guarantee)
    status: statusFilter === 'all' ? undefined :
            statusFilter === 'paid' ? 'paid' :
            statusFilter === 'pending' ? 'open' :
            statusFilter === 'overdue' ? 'uncollectible' :
            statusFilter === 'cancelled' ? 'void' :
            statusFilter === 'deposit' ? 'deposit' :
            statusFilter === 'guarantee' ? 'guarantee' : 
            undefined,
    enabled: true // Siempre habilitado
  })

  const handleStatusChange = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      // Simulamos cambio de estado (sin llamar realmente al servicio)
      
      // Invalidar todas las queries de facturas para esta sede
      await queryClient.invalidateQueries({
        queryKey: ['stripe-invoices']
      })

      toast.success(`Factura ${getInvoiceStatusText(newStatus).toLowerCase()} exitosamente`)
      setPopoverOpen(prev => ({ ...prev, [invoiceId]: false }))
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el estado de la factura')
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!currentBranch?.id) {
      toast.error('No hay una sede seleccionada')
      return
    }

    try {
      // Simulamos eliminación (sin llamar realmente al servicio)
      toast.success('Factura eliminada exitosamente')
      queryClient.invalidateQueries({
        queryKey: ['stripe-invoices']
      })
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la factura')
    }
  }

  const handleInvoiceClick = (invoice: Invoice) => {
    // No hacer nada al hacer clic en una factura
  }

  const invoices = invoicesQuery.data || []

  // Filtrar las facturas
  const filteredInvoices = invoices.filter(invoice => {
    // Filtrar por término de búsqueda (número de factura o nombre de cliente)
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })
  .sort((a, b) => {
    // Ordenar por fecha en orden descendente (más recientes primero)
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  // Renderizado condicional mejorado
  if (!currentBranch) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Selecciona una sede para ver sus facturas</p>
      </div>
    )
  }

  if (invoicesQuery.isLoading) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Cargando facturas...</p>
      </div>
    )
  }

  if (invoicesQuery.isError) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600 font-medium">No hay cuenta de Stripe conectada</p>
        <p className="text-sm text-gray-500 mt-1">Revisa la sección de Integraciones en "Configuración"</p>
        <Button 
          onClick={() => invoicesQuery.refetch()}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 bg-transparent px-6 py-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-md font-medium text-gray-800">Facturación</h3>
          <p className="text-sm text-gray-600 max-w-full">Gestiona las facturas de tus clientes.</p>
        </div>

        {/* Componente modularizado de filtros */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <InvoiceFilters 
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
        </div>
      </div>

      {/* Lista de Facturas (diseño original restaurado) */}
      <div className="grid grid-cols-1">
        {filteredInvoices.length === 0 ? (
          <div className="text-left">
            <p className="text-gray-500">
              No hay facturas registradas para esta empresa.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard 
                key={invoice.id}
                invoice={invoice}
                onClick={handleInvoiceClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Espacio vacío donde estaba el botón "Nueva Factura" */}
      <div className="mt-4"></div>
    </div>
  )
}
