import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ReservationStatsProps {
  stats: {
    future: number
    past: number
    cancelled: number
  }
}

export function ReservationStats({ stats }: ReservationStatsProps) {
  const total = stats.future + stats.past + stats.cancelled

  const percentages = {
    future: total > 0 ? ((stats.future / total) * 100).toFixed(1) : "0.0",
    past: total > 0 ? ((stats.past / total) * 100).toFixed(1) : "0.0",
    cancelled: total > 0 ? ((stats.cancelled / total) * 100).toFixed(1) : "0.0",
  }

  const getColor = (position: number): string => {
    if (total === 0) return "bg-gray-100"
    
    if (position <= Number(percentages.cancelled)) {
      return stats.cancelled === 0 ? "bg-gray-100" : "bg-rose-400"
    } else if (position <= Number(percentages.cancelled) + Number(percentages.past)) {
      return stats.past === 0 ? "bg-gray-100" : "bg-[#2365F1]"
    } else {
      return stats.future === 0 ? "bg-gray-100" : "bg-[#09C4A3]"
    }
  }

  const TOTAL_BARS = 64
  const BAR_WIDTH = 4
  const BAR_GAP = 3
  const TOTAL_WIDTH = (BAR_WIDTH + BAR_GAP) * TOTAL_BARS - BAR_GAP

  return (
    <div className="space-y-5">
      {/* Gráfico de líneas */}
      <motion.div 
        className="flex w-full h-[90px] justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div 
          style={{
            width: '100%',
            maxWidth: `${TOTAL_WIDTH}px`,
            display: 'flex',
            gap: `${BAR_GAP}px`,
          }}
        >
          {Array.from({ length: TOTAL_BARS }).map((_, index) => {
            const position = (index + 1) / TOTAL_BARS * 100
            const color = getColor(position)

            return (
              <motion.div
                key={index}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.004,
                  ease: [0.215, 0.61, 0.355, 1]
                }}
                style={{ 
                  width: `${BAR_WIDTH}px`,
                  originY: 1,
                  flexGrow: 1,
                  maxWidth: `${BAR_WIDTH}px`,
                }}
                className={cn(
                  "h-full",
                  "rounded-[3px]",
                  color,
                  "transition-colors duration-300"
                )}
              />
            )
          })}
        </div>
      </motion.div>

      {/* Estadísticas centradas */}
      <motion.div 
        className="flex justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="grid grid-cols-3 gap-16 max-w-[600px]">
          {/* Canceladas */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-start">
              <div className="flex items-baseline space-x-1.5">
                <span className={cn(
                  "text-[15px] tabular-nums font-medium leading-none",
                  stats.cancelled === 0 ? "text-gray-300" : "text-gray-800"
                )}>
                  {stats.cancelled}
                </span>
                <span className="text-[11px] tabular-nums font-medium text-gray-400 leading-none">
                  ({percentages.cancelled}%)
                </span>
              </div>
              <div className="flex items-center mt-1.5 space-x-1.5">
                <div className={cn(
                  "w-[2px] h-[14px]",
                  stats.cancelled === 0 ? "bg-gray-200" : "bg-rose-400"
                )} />
                <span className="text-[11px] font-medium text-gray-500 tracking-tight">
                  Canceladas
                </span>
              </div>
            </div>
          </div>

          {/* Realizadas */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-start">
              <div className="flex items-baseline space-x-1.5">
                <span className={cn(
                  "text-[15px] tabular-nums font-medium leading-none",
                  stats.past === 0 ? "text-gray-300" : "text-gray-800"
                )}>
                  {stats.past}
                </span>
                <span className="text-[11px] tabular-nums font-medium text-gray-400 leading-none">
                  ({percentages.past}%)
                </span>
              </div>
              <div className="flex items-center mt-1.5 space-x-1.5">
                <div className={cn(
                  "w-[2px] h-[14px]",
                  stats.past === 0 ? "bg-gray-200" : "bg-[#2365F1]"
                )} />
                <span className="text-[11px] font-medium text-gray-500 tracking-tight">
                  Realizadas
                </span>
              </div>
            </div>
          </div>

          {/* Próximas */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-start">
              <div className="flex items-baseline space-x-1.5">
                <span className={cn(
                  "text-[15px] tabular-nums font-medium leading-none",
                  stats.future === 0 ? "text-gray-300" : "text-gray-800"
                )}>
                  {stats.future}
                </span>
                <span className="text-[11px] tabular-nums font-medium text-gray-400 leading-none">
                  ({percentages.future}%)
                </span>
              </div>
              <div className="flex items-center mt-1.5 space-x-1.5">
                <div className={cn(
                  "w-[2px] h-[14px]",
                  stats.future === 0 ? "bg-gray-200" : "bg-[#09C4A3]"
                )} />
                <span className="text-[11px] font-medium text-gray-500 tracking-tight">
                  Próximas
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 
