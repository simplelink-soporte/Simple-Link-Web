import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useBranches } from "@/hooks/useBranches"
import { useCourts } from "@/hooks/useCourts"
import { Spinner } from "@/components/ui/spinner"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { useRef, useState, useEffect } from "react"
import type { Court } from "@/types/court"

interface CourtSelectorProps {
  selectedCourts: string[]
  onCourtToggle: (courtId: string) => void
}

const getCourtDescription = (court: Court) => {
  const descriptions: string[] = []

  // Añadimos el tipo de pista
  const typeMap = {
    indoor: 'Interior',
    outdoor: 'Exterior',
    covered: 'Cubierta'
  } as const

  if (court.court_type in typeMap) {
    descriptions.push(typeMap[court.court_type as keyof typeof typeMap])
  }

  // Añadimos el tipo de superficie
  const surfaceMap = {
    crystal: 'Cristal',
    synthetic: 'Sintética',
    clay: 'Tierra',
    grass: 'Césped',
    rubber: 'Goma',
    concrete: 'Cemento',
    panoramic: 'Cristal Premium'
  } as const

  if (court.surface in surfaceMap) {
    descriptions.push(surfaceMap[court.surface as keyof typeof surfaceMap])
  }

  return descriptions.join(' • ')
}

export function CourtSelector({ selectedCourts, onCourtToggle }: CourtSelectorProps) {
  const { currentBranch } = useBranches()
  const { data: courts = [], isLoading, error } = useCourts({ 
    branchId: currentBranch?.id,
    onlyActive: true // Solo canchas activas
  })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Función para verificar si se puede hacer scroll
  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5) // -5 para un pequeño margen
    }
  }

  // Verificar scroll inicial y en cambios de contenido
  useEffect(() => {
    checkScroll()
  }, [courts])

  // Escuchar eventos de scroll
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
      
      return () => {
        container.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = containerRef.current.clientWidth * 0.8 // Scroll del 80% del ancho visible
      const newScrollLeft = containerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
      
      containerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  if (!currentBranch) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-6"
      >
        <p className="text-sm text-gray-500">
          Selecciona una sede para ver las canchas disponibles
        </p>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-6"
      >
        <Spinner className="w-6 h-6" />
        <p className="text-sm text-gray-500 mt-2">Cargando canchas...</p>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-6"
      >
        <p className="text-sm text-red-500">
          Error al cargar las canchas
        </p>
      </motion.div>
    )
  }

  if (courts.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-6"
      >
        <p className="text-sm text-gray-500">
          No hay canchas disponibles en esta sede
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">
          Seleccionar Canchas
        </h3>
        <span className="text-xs text-gray-400">
          {selectedCourts.length} {selectedCourts.length === 1 ? 'cancha' : 'canchas'} seleccionada{selectedCourts.length !== 1 && 's'}
        </span>
      </div>

      {/* Contenedor del carrusel con máscara de degradado */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        
        {/* Contenedor scrolleable */}
        <div 
          ref={containerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-1 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {courts.map((court) => (
            <motion.button
              key={court.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCourtToggle(court.id)}
              className={cn(
                "relative flex items-center gap-2 py-2.5 px-4 rounded-md transition-all duration-200",
                "hover:bg-gray-50/50 flex-shrink-0",
                "border border-transparent",
                selectedCourts.includes(court.id)
                  ? "bg-gray-50 ring-1 ring-black/5"
                  : "bg-white hover:border-gray-200"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full transition-all",
                selectedCourts.includes(court.id)
                  ? "bg-black scale-110"
                  : "bg-gray-300"
              )} />
              <span className={cn(
                "text-sm transition-colors whitespace-nowrap",
                selectedCourts.includes(court.id)
                  ? "text-gray-900"
                  : "text-gray-500"
              )}>
                {court.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Controles de navegación */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={cn(
            "p-1 rounded-md transition-all duration-200",
            canScrollLeft
              ? "text-gray-600 hover:bg-gray-100"
              : "text-gray-300 cursor-not-allowed"
          )}
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={cn(
            "p-1 rounded-md transition-all duration-200",
            canScrollRight
              ? "text-gray-600 hover:bg-gray-100"
              : "text-gray-300 cursor-not-allowed"
          )}
        >
          <IconChevronRight className="w-4 h-4" />
        </button>
      </div>

      {selectedCourts.length === 0 && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[13px] text-gray-400 text-center"
        >
          Seleccione al menos una cancha para continuar
        </motion.p>
      )}
    </motion.div>
  )
}