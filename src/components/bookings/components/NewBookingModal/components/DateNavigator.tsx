import { format } from "date-fns"
import { es } from "date-fns/locale"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

interface DateNavigatorProps {
  date: Date
  onPrevDay: () => void
  onNextDay: () => void
}

export function DateNavigator({ date, onPrevDay, onNextDay }: DateNavigatorProps) {
  return (
    <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-1 w-full">
      <button
        onClick={onPrevDay}
        className="p-2 hover:bg-gray-50 rounded-md transition-colors"
      >
        <IconChevronLeft className="h-4 w-4 text-gray-600" />
      </button>
      <div className="flex items-center gap-2 flex-1 justify-center">
        <span className="text-base font-normal inline-flex items-center capitalize">
          {format(date, "MMM", { locale: es })}
        </span>
        <span className="text-base font-normal">
          {format(date, "d")}
        </span>
      </div>
      <button
        onClick={onNextDay}
        className="p-2 hover:bg-gray-50 rounded-md transition-colors"
      >
        <IconChevronRight className="h-4 w-4 text-gray-600" />
      </button>
    </div>
  )
} 