import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

interface TableNavigationButtonsProps {
  onPrevClick: () => void
  onNextClick: () => void
  hasPrev: boolean
  hasNext: boolean
  currentPage: number
  totalPages: number
  className?: string
}

export function TableNavigationButtons({
  onPrevClick,
  onNextClick,
  hasPrev,
  hasNext,
  currentPage,
  totalPages,
  className
}: TableNavigationButtonsProps) {
  return (
    <div className={cn("flex justify-center gap-2 px-4 bg-white", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevClick}
        disabled={!hasPrev}
        className="p-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200"
      >
        <IconChevronLeft className="h-5 w-5 text-gray-600" stroke={1.5} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onNextClick}
        disabled={!hasNext}
        className="p-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200"
      >
        <IconChevronRight className="h-5 w-5 text-gray-600" stroke={1.5} />
      </Button>
    </div>
  )
}