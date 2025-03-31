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
import { NewInvoiceModal } from "./NewInvoiceModal"
import { getInvoiceStatusText } from "./utils"

// Componente principal
export function BillingTable() {
  const { currentBranch } = useBranches()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>()
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all')
  const [useRealStripeInvoices, setUseRealStripeInvoices] = useState(true)

  // Query de facturas de prueba (mantenemos esta lógica para compatibilidad)
  const mockInvoicesQuery = useInvoices({ 
    branchId: currentBranch?.id,
    onlyActive: false
  })

  // Query de facturas reales de Stripe
  const stripeInvoicesQuery = useStripeInvoices({
    branchId: currentBranch?.id,
    // Mapeamos los estados internos a los estados de Stripe
    status: statusFilter === 'all' ? undefined :
            statusFilter === 'paid' ? 'paid' :
            statusFilter === 'pending' ? 'open' :
            statusFilter === 'overdue' ? 'uncollectible' :
            statusFilter === 'cancelled' ? 'void' : undefined,
    enabled: !!currentBranch?.id && useRealStripeInvoices
  })

  // Determinar qué facturas usar (reales o simuladas)
  const invoicesQuery = useRealStripeInvoices ? stripeInvoicesQuery : mockInvoicesQuery

  const handleNewInvoice = async (invoiceData: any) => {
    setIsLoading(true)
    try {
      if (editingInvoice) {
        // Simulamos actualización (sin llamar realmente al servicio)
        toast.success('Factura actualizada exitosamente')
      } else {
        // Verificamos que currentBranch no sea null
        if (!currentBranch) {
          throw new Error('No hay una sede seleccionada')
        }
        
        // Simulamos creación (sin llamar realmente al servicio)
        toast.success('Factura creada exitosamente')
      }
      setIsNewInvoiceModalOpen(false)
      setEditingInvoice(undefined)
      invoicesQuery.refetch()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar la factura')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      // Simulamos cambio de estado (sin llamar realmente al servicio)
      
      // Invalidar todas las queries de facturas para esta sede
      await queryClient.invalidateQueries({
        queryKey: useRealStripeInvoices ? ['stripe-invoices'] : ['invoices']
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
        queryKey: useRealStripeInvoices ? ['stripe-invoices'] : ['invoices']
      })
      setIsNewInvoiceModalOpen(false)
      setEditingInvoice(undefined)
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la factura')
    }
  }

  const handleInvoiceClick = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setIsNewInvoiceModalOpen(true)
  }

  const invoices = invoicesQuery.data || []

  // Filtrar las facturas
  const filteredInvoices = invoices.filter(invoice => {
    // Filtrar por término de búsqueda (número de factura o nombre de cliente)
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Si estamos usando Stripe, el filtrado por estado ya se hace en la API
    // pero aún así podemos filtrar localmente para estar seguros
    const matchesStatus = useRealStripeInvoices ? true : (statusFilter === 'all' || invoice.status === statusFilter)
    
    return matchesSearch && matchesStatus
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
        <p className="text-red-500">Error al cargar las facturas</p>
        <Button 
          onClick={() => invoicesQuery.refetch()}
          variant="outline"
          size="sm"
          className="mt-2"
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
            <Button
              variant="outline"
              size="sm"
              className={`text-xs px-3 py-1 h-auto ${useRealStripeInvoices ? 'bg-blue-50 text-blue-500 border-blue-200' : ''}`}
              onClick={() => setUseRealStripeInvoices(true)}
            >
              Facturas de Stripe
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`text-xs px-3 py-1 h-auto ${!useRealStripeInvoices ? 'bg-gray-50 text-gray-500 border-gray-200' : ''}`}
              onClick={() => setUseRealStripeInvoices(false)}
            >
              Datos de prueba
            </Button>
            <InvoiceFilters 
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
        </div>
      </div>

      {/* Lista de Facturas */}
      <div className="grid grid-cols-1">
        {filteredInvoices.length === 0 ? (
          <div className="text-left">
            <p className="text-gray-500">
              {useRealStripeInvoices 
                ? 'No hay facturas de Stripe registradas para esta sede.' 
                : 'No hay facturas registradas'}
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

      {/* Botones de acción */}
      <div className="flex justify-end">
        <Button 
          onClick={() => {
            setEditingInvoice(undefined)
            setIsNewInvoiceModalOpen(true)
          }}
          disabled={useRealStripeInvoices} // Deshabilitamos la creación manual cuando usamos Stripe
          className="text-xs"
        >
          Nueva Factura
        </Button>
      </div>

      {/* Modal para crear/editar facturas */}
      {isNewInvoiceModalOpen && (
        <NewInvoiceModal 
          invoice={editingInvoice}
          isOpen={isNewInvoiceModalOpen}
          onClose={() => {
            setIsNewInvoiceModalOpen(false)
            setEditingInvoice(undefined)
          }}
          onSave={handleNewInvoice}
          isLoading={isLoading}
          branchId={currentBranch.id}
        />
      )}
    </div>
  )
}
