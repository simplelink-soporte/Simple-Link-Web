import { Button } from "@/components/ui/button"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface TableNavigationButtonsProps {
  totalItems: number
  visibleItems: number
  currentStart: number
  onNavigate: (direction: 'left' | 'right') => void
  className?: string
}

export function TableNavigationButtons({
  totalItems,
  visibleItems,
  currentStart,
  onNavigate,
  className
}: TableNavigationButtonsProps) {
  // No mostrar los botones si no hay suficientes items para navegar
  if (totalItems <= visibleItems) return null

  const canNavigateLeft = currentStart > 0
  const canNavigateRight = currentStart + visibleItems < totalItems

  return (
    <div className={cn(
      "flex items-center justify-end gap-2 mt-4 px-4",
      className
    )}>
      {/* Indicador de posición */}
      <span className="text-sm text-gray-500 mr-2">
        Mostrando {currentStart + 1}-{Math.min(currentStart + visibleItems, totalItems)} de {totalItems}
      </span>

      {/* Botones de navegación */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate('left')}
          disabled={!canNavigateLeft}
          className={cn(
            "h-8 w-8 transition-all duration-200",
            !canNavigateLeft && "opacity-50 cursor-not-allowed"
          )}
          title="Ver canchas anteriores"
        >
          <IconChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate('right')}
          disabled={!canNavigateRight}
          className={cn(
            "h-8 w-8 transition-all duration-200",
            !canNavigateRight && "opacity-50 cursor-not-allowed"
          )}
          title="Ver más canchas"
        >
          <IconChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 