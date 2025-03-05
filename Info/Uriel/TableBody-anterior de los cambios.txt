import { cn } from "@/lib/utils"
import { Court } from "@/types/courts"
import { Selection, SelectedBooking } from "@/types/bookings"
import { BookingBlock } from "./BookingBlock/BookingBlock"
import { Z_LAYERS } from "@/constants/zIndex"

interface TimeSlot {
  hour: string
  subSlots: {
    time: string
    minutes: number
    isAvailable: boolean
  }[]
}

interface TableBodyProps {
  timeSlots: TimeSlot[]
  visibleCourts: Court[]
  selection: Selection | null
  isMouseDown: boolean
  isDragging: boolean
  getExistingBooking: (courtId: string, time: string) => any
  onMouseDown: (courtId: string, hour: string, slotIndex: number, event: React.MouseEvent) => void
  onMouseMove: (courtId: string, hour: string, slotIndex: number, event: React.MouseEvent) => void
  onMouseEnter: (courtId: string, hour: string, slotIndex: number, event: React.MouseEvent) => void
  onBookingClick: (booking: SelectedBooking) => void
  isSlotSelected: (courtId: string, hour: string, slotIndex: number) => boolean
  getCourtColumnWidth: () => string
}

const TIME_COLUMN_WIDTH = 60
const CELL_HEIGHT = 48
const DISABLED_CELL_STYLES = {
  background: "repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #f9fafb 4px, #f9fafb 8px)",
  opacity: "0.6",
  borderColor: "transparent"
}

export function TableBody({
  timeSlots,
  visibleCourts,
  selection,
  isMouseDown,
  isDragging,
  getExistingBooking,
  onMouseDown,
  onMouseMove,
  onMouseEnter,
  onBookingClick,
  isSlotSelected,
  getCourtColumnWidth
}: TableBodyProps) {
  return (
    <table className="w-full border-collapse">
      <colgroup>
        <col style={{ width: `${TIME_COLUMN_WIDTH}px`, minWidth: `${TIME_COLUMN_WIDTH}px` }} />
        {visibleCourts.map(court => (
          <col 
            key={court.id} 
            style={{ 
              width: getCourtColumnWidth(),
              minWidth: "150px"
            }} 
          />
        ))}
      </colgroup>
      
      <thead>
        <tr className="bg-gray-50">
          <th 
            className={cn(
              "sticky left-0 text-left font-semibold text-sm text-gray-900 p-3",
              "border-b border-r border-gray-200/60 bg-gray-50"
            )}
            style={{ zIndex: Z_LAYERS.STICKY_HEADER }}
          >
            Horario
          </th>
          {visibleCourts.map((court, index) => (
            <th 
              key={court.id}
              className={cn(
                "text-center font-semibold text-sm text-gray-900 p-3 border-b border-gray-200",
                index < visibleCourts.length - 1 && "border-r"
              )}
            >
              {court.name}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {timeSlots.map((slot, rowIndex) => (
          <tr key={slot.hour}>
            <td 
              className="sticky left-0 z-10 text-sm font-medium text-gray-900 p-3 border-r border-gray-200 bg-white"
              style={{ zIndex: Z_LAYERS.STICKY_HEADER }}
            >
              {slot.hour}
            </td>
            {visibleCourts.map((court, colIndex) => (
              <td 
                key={`${court.id}-${slot.hour}`}
                className={cn(
                  "p-0 relative",
                  slot.subSlots.some(subSlot => !subSlot.isAvailable) 
                    ? "cursor-not-allowed" 
                    : "cursor-pointer"
                )}
                style={{ height: `${CELL_HEIGHT}px` }}
              >
                <div className="absolute inset-0 pointer-events-none">
                  {colIndex < visibleCourts.length - 1 && (
                    <div className="absolute right-0 inset-y-0 border-r border-gray-200/60" />
                  )}
                  {rowIndex < timeSlots.length - 1 && (
                    <div className="absolute bottom-0 inset-x-0 border-b border-gray-200/60" />
                  )}
                </div>

                <div className="absolute inset-0">
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 grid grid-rows-4">
                      {[...Array(4)].map((_, slotIndex) => {
                        const isSlotAvailable = slot.subSlots[slotIndex]?.isAvailable
                        const slotTime = slot.subSlots[slotIndex]?.time
                        const existingBooking = getExistingBooking(court.id, slotTime)
                        
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
                                onMouseDown(court.id, slot.hour, slotIndex, e)
                              }
                            }}
                            onMouseMove={(e) => {
                              if (isSlotAvailable && !existingBooking) {
                                onMouseMove(court.id, slot.hour, slotIndex, e)
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (isMouseDown && isDragging && isSlotAvailable && !existingBooking) {
                                onMouseEnter(court.id, slot.hour, slotIndex, e)
                              }
                            }}
                          >
                            {existingBooking && (
                              <BookingBlock
                                startTime={existingBooking.startTime}
                                endTime={existingBooking.endTime}
                                currentTime={slotTime}
                                paymentStatus={existingBooking.paymentStatus}
                                participants={existingBooking.participants}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onBookingClick({
                                    id: existingBooking.id,
                                    date: new Date().toISOString(),
                                    startTime: existingBooking.startTime,
                                    endTime: existingBooking.endTime,
                                    court: existingBooking.courtId,
                                    price: existingBooking.price || 0,
                                    totalAmount: existingBooking.totalAmount || existingBooking.price || 0,
                                    depositAmount: existingBooking.depositAmount || 0,
                                    paymentMethod: existingBooking.paymentMethod || '',
                                    participants: existingBooking.participants || [],
                                    paymentStatus: existingBooking.paymentStatus || 'pending',
                                    rentedItems: existingBooking.rentedItems || []
                                  })
                                }}
                              />
                            )}

                            {!isSlotAvailable && (
                              <div className="absolute inset-0 flex items-center justify-center border-0">
                                <div className="w-full border-t border-gray-200/10" />
                              </div>
                            )}
                            
                            {isSlotSelected(court.id, slot.hour, slotIndex) && (
                              <>
                                <div className="absolute inset-0 bg-gray-100 opacity-50 transition-all duration-75" />
                                
                                {selection && 
                                 timeToMinutes(selection.startTime) === timeToMinutes(slotTime) && (
                                  <div className={cn(
                                    "absolute left-1 text-xs font-medium text-gray-900 z-[30]",
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
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function timeToMinutes(time: string): number {
  if (!time) return 0
  const [hours, minutes] = time.split(':').map(Number)
  return (hours * 60) + minutes
}

function formatDuration(startTime: string, endTime: string): string {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const durationInMinutes = end - start

  const hours = Math.floor(durationInMinutes / 60)
  const minutes = durationInMinutes % 60

  if (hours === 0) {
    return `${minutes} minutos`
  } else if (minutes === 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`
  } else {
    return `${hours}h ${minutes}min`
  }
} 