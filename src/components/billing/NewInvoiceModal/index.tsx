import { Button } from "@/components/ui/button"
import { Invoice } from "@/services/billingService"

interface NewInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  onDelete: (id: string) => void
  editingInvoice?: Invoice
  mode: 'create' | 'edit'
  isLoading: boolean
}

export function NewInvoiceModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  editingInvoice,
  mode,
  isLoading
}: NewInvoiceModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-md">
        <h3 className="text-lg font-medium mb-4">{mode === 'create' ? 'Nueva Factura' : 'Editar Factura'}</h3>
        
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'create' 
            ? 'Completa los datos para crear una nueva factura.' 
            : 'Modifica los datos de la factura seleccionada.'}
        </p>

        <div className="text-center">
          <p className="text-xs text-gray-500 italic">
            Aquu00ed iru00eda el formulario para {mode === 'create' ? 'crear' : 'editar'} la factura
          </p>
        </div>
        
        <div className="flex justify-between mt-6">
          {mode === 'edit' && (
            <Button
              variant="destructive"
              onClick={() => editingInvoice && onDelete(editingInvoice.id)}
              className="text-xs"
              disabled={isLoading}
            >
              Eliminar
            </Button>
          )}
          
          <div className="flex space-x-2 ml-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-xs"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={() => onSave({})}
              className="text-xs"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
