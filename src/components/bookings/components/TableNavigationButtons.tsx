import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

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
  const canNavigateLeft = currentStart > 0
  const canNavigateRight = currentStart + visibleItems < totalItems

  return (
    <div className={cn("flex justify-center gap-2 px-4", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onNavigate('left')}
        disabled={!canNavigateLeft}
        className="p-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200"
      >
        <IconChevronLeft className="h-5 w-5 text-gray-600" stroke={1.5} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onNavigate('right')}
        disabled={!canNavigateRight}
        className="p-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200"
      >
        <IconChevronRight className="h-5 w-5 text-gray-600" stroke={1.5} />
      </Button>
    </div>
  )
} 