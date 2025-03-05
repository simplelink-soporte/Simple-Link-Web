"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeatmapWidget } from "./widgets/HeatmapWidget"
import { CustomerDetailsWidget } from "./widgets/CustomerDetailsWidget"
import { RetentionWidget } from "./widgets/RetentionWidget"
import { LocationComparisonWidget } from "./widgets/LocationComparisonWidget"
import { PromotionsWidget } from "./widgets/PromotionsWidget"

export function AnalyticsWidgets() {
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: -400,
        behavior: 'smooth'
      })
    }
  }

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: 400,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="w-full -mt-14">
      {/* Controles de navegación */}
      <div className="flex justify-end mb-4 px-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={scrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contenedor del carrusel */}
      <div 
        ref={containerRef} 
        className="overflow-x-auto scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="inline-flex gap-8 px-4 pb-4">
          {/* Widget de Heatmap */}
          <div className="w-fit">
            <HeatmapWidget />
          </div>

          {/* Contenedor de widgets de análisis */}
          <div className="flex gap-8">
            <div className="w-[350px] flex-shrink-0">
              <LocationComparisonWidget />
            </div>
            <div className="w-[350px] flex-shrink-0">
              <RetentionWidget />
            </div>
            <div className="w-[350px] flex-shrink-0">
              <PromotionsWidget />
            </div>
            <div className="w-[350px] flex-shrink-0">
              <CustomerDetailsWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 