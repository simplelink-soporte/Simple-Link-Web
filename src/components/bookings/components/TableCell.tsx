import { cn } from "@/lib/utils"
import { DISABLED_CELL_STYLES } from "../utils"
import { Selection } from "../types"
import { BookingBlock } from "../../BookingBlock"
import { formatDuration, getSlotTime } from "../utils"
import { ExistingBooking } from "@/types/bookings"
import { Z_LAYERS } from "@/constants/zIndex"

interface TableCellProps {
  court: {
    id: string
    name: string
  }
  hour: string
  subSlots: {
    time: string
    minutes: number
    isAvailable: boolean
  }[]
  selection: Selection | null
  isMouseDown: boolean
  isDragging: boolean
  existingBooking: ExistingBooking | null
  onMouseDown: (courtId: string, hour: string, slotIndex: number, event: React.MouseEvent) => void
  onMouseMove: (courtId: string, hour: string, slotIndex: number, event: React.MouseEvent) => void
  onMouseEnter: (courtId: string, hour: string, slotIndex: number, event: React.MouseEvent) => void
  onBookingClick: (booking: ExistingBooking) => void
  isSlotSelected: (courtId: string, hour: string, slotIndex: number) => boolean
}

export function TableCell({
  court,
  hour,
  subSlots,
  selection,
  isMouseDown,
  isDragging,
  existingBooking,
  onMouseDown,
  onMouseMove,
  onMouseEnter,
  onBookingClick,
  isSlotSelected
}: TableCellProps) {
  return (
    <td className="p-0 relative">
      <div 
        className="absolute inset-0" 
        style={{ zIndex: Z_LAYERS.CELL_BASE }}
      >
        <div className="relative w-full h-full">
          <div className="absolute inset-0 grid grid-rows-4">
            {[...Array(4)].map((_, slotIndex) => {
              const isSlotAvailable = subSlots[slotIndex]?.isAvailable
              const slotTime = getSlotTime(hour, slotIndex)
              
              return (
                <div 
                  key={slotIndex}
                  className={cn(
                    "relative",
                    isSlotAvailable && !existingBooking && "hover:bg-gray-50/50 transition-colors duration-150"
                  )}
                  style={!isSlotAvailable ? DISABLED_CELL_STYLES : undefined}
                  onMouseDown={(e) => {
                    if (isSlotAvailable && !existingBooking) {
                      onMouseDown(court.id, hour, slotIndex, e)
                    }
                  }}
                  onMouseMove={(e) => {
                    if (isSlotAvailable && !existingBooking) {
                      onMouseMove(court.id, hour, slotIndex, e)
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (isMouseDown && isDragging && isSlotAvailable && !existingBooking) {
                      onMouseEnter(court.id, hour, slotIndex, e)
                    }
                  }}
                >
                  {existingBooking && (
                    <div className="absolute inset-0" style={{ zIndex: Z_LAYERS.BOOKING_BASE }}>
                      <BookingBlock
                        startTime={existingBooking.startTime}
                        endTime={existingBooking.endTime}
                        currentTime={slotTime}
                        paymentStatus={existingBooking.paymentStatus}
                        participants={existingBooking.participants}
                        onClick={(e) => {
                          e.stopPropagation()
                          onBookingClick(existingBooking)
                        }}
                      />
                    </div>
                  )}

                  {!isSlotAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center border-0">
                      <div className="w-full border-t border-gray-200/10" />
                    </div>
                  )}
                  
                  {isSlotSelected(court.id, hour, slotIndex) && (
                    <>
                      <div className="absolute inset-0 bg-gray-100 opacity-50 transition-all duration-75" />
                      
                      {selection && 
                       timeToMinutes(selection.startTime) === timeToMinutes(slotTime) && (
                        <div className={cn(
                          "absolute left-1 text-xs font-medium text-gray-900",
                          slotIndex === 3 ? "-top-3" : "top-0.5"
                        )}>
                          {selection.startTime} - {selection.endTime}
                          <span className="ml-1">
                            ({formatDuration(selection.startTime, selection.endTime)})
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </td>
  )
} 