import { cn } from "@/lib/utils"
import { Invoice } from "@/services/billingService"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check } from "lucide-react"

interface InvoiceFiltersProps {
  statusFilter: 'all' | Invoice['status']
  setStatusFilter: (status: 'all' | Invoice['status']) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}

type StatusOption = {
  value: 'all' | Invoice['status']
  label: string
  color?: string
}

export function InvoiceFilters({ 
  statusFilter, 
  setStatusFilter,
  searchTerm,
  setSearchTerm
}: InvoiceFiltersProps) {
  const statusOptions: StatusOption[] = [
    { value: 'all', label: 'Todas' },
    { value: 'paid', label: 'Pagadas', color: '#22896F' },
    { value: 'deposit', label: 'Señas', color: '#F0A92E' },
    { value: 'guarantee', label: 'Garantía', color: '#8A4EBC' },
    { value: 'pending', label: 'Pendientes', color: '#E67E22' },
  ]

  // Encontrar la opción actual seleccionada
  const currentOption = statusOptions.find(opt => opt.value === statusFilter) || statusOptions[0]

  return (
    <div className="flex items-center space-x-2 w-full">
      {/* Filtro por estado con menú desplegable */}
      <div className="flex items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs font-normal border-gray-200 hover:bg-gray-50 px-3 py-1.5 h-auto flex items-center"
            >
              {currentOption.color && (
                <div 
                  className="h-2 w-2 rounded-full mr-2" 
                  style={{ backgroundColor: currentOption.color }}
                />
              )}
              {currentOption.label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-40" align="start">
            <div className="p-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-sm hover:bg-gray-50",
                    statusFilter === option.value ? "bg-gray-50" : ""
                  )}
                  onClick={() => {
                    setStatusFilter(option.value)
                  }}
                >
                  <div className="flex items-center">
                    {option.color && (
                      <div 
                        className="h-2 w-2 rounded-full mr-2" 
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span>{option.label}</span>
                  </div>
                  
                  {statusFilter === option.value && (
                    <Check className="h-3 w-3" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar por número o cliente..."
        className="border border-gray-200 rounded-md p-2 text-xs opacity-80 focus:outline-none focus:ring-0 w-56"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  )
}
