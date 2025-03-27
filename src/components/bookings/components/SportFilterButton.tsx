import { Button } from "@/components/ui/button"
import { IconSwimming, IconBallTennis } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

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

  // Estilos condicionales basados en el deporte seleccionado
  const buttonStyles = {
    racket: "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-400",
    swimming: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400"
  }

  // El contenido interno del botón (icono y texto)
  const buttonContent = currentSport === "racket" 
    ? { 
        icon: <IconBallTennis className="h-4 w-4 mr-1.5" stroke={1.5} />, 
        text: "Raqueta",
        color: "text-orange-700" 
      }
    : { 
        icon: <IconSwimming className="h-4 w-4 mr-1.5" stroke={1.5} />, 
        text: "Natación",
        color: "text-blue-700" 
      };

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-10 px-3 text-sm font-medium",
        "transition-all duration-300 ease-in-out",
        "flex items-center gap-1",
        "shadow-sm",
        buttonStyles[currentSport]
      )}
      onClick={handleClick}
    >
      <motion.div 
        key={currentSport}
        initial={{ scale: 0.8, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center"
      >
        {buttonContent.icon}
        <span className={buttonContent.color}>{buttonContent.text}</span>
      </motion.div>
    </Button>
  )
}
