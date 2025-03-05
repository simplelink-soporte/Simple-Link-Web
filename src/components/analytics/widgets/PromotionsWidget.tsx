"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-2"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Filter, X } from "lucide-react"

interface PromotionData {
  id: string
  name: string
  usageCount: number
}

const promotions: PromotionData[] = [
  {
    id: "promo-1",
    name: "Happy Hour",
    usageCount: 82,
  },
  {
    id: "promo-2",
    name: "2x1 en Clases",
    usageCount: 64,
  },
  {
    id: "promo-3",
    name: "Descuento Familiar",
    usageCount: 45,
  },
  {
    id: "promo-4",
    name: "Primer Mes -50%",
    usageCount: 31,
  },
]

const filters = {
  gender: {
    all: "Todos los géneros",
    male: "Hombres",
    female: "Mujeres"
  },
  age: {
    all: "Todas las edades",
    "18-25": "18-25 años",
    "26-35": "26-35 años",
    "36-50": "36-50 años",
    "50+": "Más de 50"
  }
}

interface PromotionCardProps {
  data: PromotionData
}

function PromotionCard({ data }: PromotionCardProps) {
  return (
    <div 
      className="group flex items-center justify-between p-3 bg-white hover:bg-gray-50 border rounded-lg transition-all duration-300 animate-in fade-in-50 w-[280px]"
    >
      <span className="text-sm font-medium">{data.name}</span>
      <span className="text-sm font-medium">{data.usageCount}</span>
    </div>
  )
}

interface FilterBadgeProps {
  label: string
  onRemove: () => void
}

function FilterBadge({ label, onRemove }: FilterBadgeProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
      <span>{label}</span>
      <button 
        onClick={onRemove}
        className="text-gray-400 hover:text-gray-600"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function PromotionsWidget() {
  const [activeFilters, setActiveFilters] = React.useState({
    gender: "all",
    age: "all"
  })

  const getFilterLabel = (type: "gender" | "age", value: string) => {
    return filters[type][value as keyof typeof filters[typeof type]]
  }

  const removeFilter = (type: "gender" | "age") => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: "all"
    }))
  }

  // Ordenar promociones por usageCount de mayor a menor
  const sortedPromotions = [...promotions].sort((a, b) => b.usageCount - a.usageCount)

  return (
    <div className="h-[400px] p-6 rounded-xl border bg-card">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium mb-1">Análisis de Promociones</h3>
            <p className="text-sm text-gray-400">
              Uso de promociones activas por segmento
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 text-xs gap-2"
              >
                <Filter className="h-3 w-3" />
                Filtrar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end" sideOffset={5}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Género</label>
                  <Select
                    value={activeFilters.gender}
                    onValueChange={(value) => setActiveFilters(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" side="right" align="start" sideOffset={10}>
                      {Object.entries(filters.gender).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Edad</label>
                  <Select
                    value={activeFilters.age}
                    onValueChange={(value) => setActiveFilters(prev => ({ ...prev, age: value }))}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" side="right" align="start" sideOffset={10}>
                      {Object.entries(filters.age).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Filtros activos */}
        {(activeFilters.gender !== "all" || activeFilters.age !== "all") && (
          <div className="flex items-center gap-2">
            {activeFilters.gender !== "all" && (
              <FilterBadge 
                label={getFilterLabel("gender", activeFilters.gender)}
                onRemove={() => removeFilter("gender")}
              />
            )}
            {activeFilters.age !== "all" && (
              <FilterBadge 
                label={getFilterLabel("age", activeFilters.age)}
                onRemove={() => removeFilter("age")}
              />
            )}
          </div>
        )}

        {/* Lista de promociones */}
        <div className="space-y-2 flex flex-col items-center">
          {sortedPromotions.map((promotion) => (
            <PromotionCard 
              key={promotion.id} 
              data={promotion}
            />
          ))}
        </div>
      </div>
    </div>
  )
} 