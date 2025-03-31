import { Button } from "@/components/ui/button"
import { IconSwimming, IconBallTennis } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type SportType = "racket" | "swimming"

interface SportFilterButtonProps {
  currentSport: SportType
  onSportChange: (sport: SportType) => void
}

export function SportFilterButton({
  currentSport,
  onSportChange
}: SportFilterButtonProps) {
  const handleClick = () => {
    // Alternar entre los tipos de deporte: racket <-> swimming
    const nextSport: SportType = currentSport === "racket" ? "swimming" : "racket"
    onSportChange(nextSport)
  }

  // Colores sutiles para los iconos
  const iconColors = {
    racket: "text-orange-500",
    swimming: "text-blue-500"
  }

  // Fondos extremadamente sutiles
  const bgColors = {
    racket: "bg-orange-50/10",
    swimming: "bg-blue-50/10"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="inline-flex h-10 rounded-md border border-gray-200 bg-white overflow-hidden cursor-pointer"
            onClick={handleClick}
          >
            {/* Opción Raqueta */}
            <div 
              className={cn(
                "flex items-center px-3 transition-all duration-200 h-full",
                currentSport === "racket" 
                  ? `${bgColors.racket} text-gray-700 font-medium` 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <IconBallTennis 
                className={cn(
                  "h-4 w-4 mr-1.5",
                  currentSport === "racket" ? iconColors.racket : "text-gray-400"
                )} 
                stroke={1.5} 
              />
              <span className="text-xs">Raqueta</span>
            </div>

            {/* Separador */}
            <div className="w-px h-full bg-gray-200"></div>

            {/* Opción Natación */}
            <div 
              className={cn(
                "flex items-center px-3 transition-all duration-200 h-full",
                currentSport === "swimming" 
                  ? `${bgColors.swimming} text-gray-700 font-medium` 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <IconSwimming 
                className={cn(
                  "h-4 w-4 mr-1.5",
                  currentSport === "swimming" ? iconColors.swimming : "text-gray-400"
                )} 
                stroke={1.5} 
              />
              <span className="text-xs">Natación</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>Cambiar entre vistas de deportes</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
