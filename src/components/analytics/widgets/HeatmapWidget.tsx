"use client"

import * as React from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { DiscountPopup } from "./DiscountPopup"
import { Droplets } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-2"
import { Filter } from "lucide-react"

interface HeatmapCell {
  hour: number
  day: number
  value: number
  bookings: number
}

interface ColorTheme {
  name: string
  from: string
  to: string
  textLight: string
  textDark: string
}

interface FilterOptions {
  timeRange: '30' | '60' | '90'
  gender: 'all' | 'male' | 'female' | 'distribution'
  ageGroup: 'all' | '18-24' | '25-34' | '35-44' | '45-54' | '55+'
}

const colorThemes: ColorTheme[] = [
  {
    name: "Negro",
    from: "rgb(23, 23, 23)",
    to: "rgb(243, 244, 246)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Índigo",
    from: "rgb(99, 102, 241)",
    to: "rgb(224, 231, 255)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Azul Noche",
    from: "rgb(30, 58, 138)",
    to: "rgb(241, 245, 249)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Esmeralda",
    from: "rgb(16, 185, 129)",
    to: "rgb(209, 250, 229)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Verde Sage",
    from: "rgb(47, 84, 74)",
    to: "rgb(236, 243, 239)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Ámbar",
    from: "rgb(245, 158, 11)",
    to: "rgb(254, 243, 199)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Borgoña",
    from: "rgb(76, 29, 49)",
    to: "rgb(248, 240, 244)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Rosa",
    from: "rgb(236, 72, 153)",
    to: "rgb(251, 207, 232)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Lavanda",
    from: "rgb(76, 61, 115)",
    to: "rgb(244, 242, 248)",
    textLight: "#1a1a1a",
    textDark: "white",
  },
  {
    name: "Turquesa",
    from: "rgb(45, 127, 132)",
    to: "rgb(236, 247, 248)",
    textLight: "#1a1a1a",
    textDark: "white",
  }
]

const genderColorThemes = {
  male: {
    from: "rgb(56, 89, 147)", // Azul oscuro elegante
    to: "rgb(236, 242, 255)", // Azul muy claro
  },
  female: {
    from: "rgb(190, 75, 119)", // Rosa elegante
    to: "rgb(253, 242, 248)", // Rosa muy claro
  }
}

export function HeatmapWidget() {
  const [heatmapData, setHeatmapData] = React.useState<HeatmapCell[]>([])
  const [hoveredCell, setHoveredCell] = React.useState<{ hour: number; day: number } | null>(null)
  const [selectedCell, setSelectedCell] = React.useState<{
    day: string;
    hour: string;
    bookings: number;
    position: { x: number; y: number };
  } | null>(null)
  const [selectedTheme, setSelectedTheme] = React.useState<ColorTheme>(colorThemes[0])
  const [filters, setFilters] = React.useState<FilterOptions>({
    timeRange: '30',
    gender: 'all',
    ageGroup: 'all'
  })

  React.useEffect(() => {
    const data: HeatmapCell[] = []
    
    // Generar datos más simples pero variados
    for (let day = 0; day < 7; day++) {
      for (let hour = 8; hour <= 22; hour++) {
        // Generar un número aleatorio entre 1 y 8
        const bookings = Math.floor(Math.random() * 8) + 1
        
        data.push({
          hour,
          day,
          bookings,
          value: (bookings / 8) * 100
        })
      }
    }
    
    setHeatmapData(data)
  }, [])

  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const hours = Array.from({ length: 15 }, (_, i) => 8 + i)
  
  const getColor = (cell: HeatmapCell | undefined, filters: FilterOptions) => {
    if (!cell) return 'rgba(243, 244, 246, 0.1)';

    // Cuando se selecciona "Distribución" en género
    if (filters.gender === 'distribution') {
      const seed = cell.hour + cell.day * 24;
      const random = Math.sin(seed) * 10000;
      const malePercentage = ((random - Math.floor(random)) * 100) % 100;
      const femalePercentage = 100 - malePercentage;

      const opacity = Math.max(0.1, Math.min(0.9, cell.value / 100));

      if (Math.abs(malePercentage - femalePercentage) > 20) {
        if (malePercentage > femalePercentage) {
          return `rgba(${hexToRgb(genderColorThemes.male.from)}, ${opacity})`;
        } else {
          return `rgba(${hexToRgb(genderColorThemes.female.from)}, ${opacity})`;
        }
      } else {
        const maleColor = hexToRgb(genderColorThemes.male.from);
        const femaleColor = hexToRgb(genderColorThemes.female.from);
        
        const maleRatio = malePercentage / 100;
        const [mR, mG, mB] = maleColor.split(',').map(n => parseInt(n));
        const [fR, fG, fB] = femaleColor.split(',').map(n => parseInt(n));
        
        const r = Math.round(mR * maleRatio + fR * (1 - maleRatio));
        const g = Math.round(mG * maleRatio + fG * (1 - maleRatio));
        const b = Math.round(mB * maleRatio + fB * (1 - maleRatio));
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }

    // Cuando se selecciona "Todos", usar el tema seleccionado
    if (filters.gender === 'all') {
      const opacity = Math.max(0.1, Math.min(0.9, cell.value / 100));
      return `rgba(${hexToRgb(selectedTheme.from)}, ${opacity})`;
    }

    // Lógica para género específico
    if (filters.gender === 'male') {
      const opacity = Math.max(0.1, Math.min(0.9, cell.value / 100));
      return `rgba(${hexToRgb(genderColorThemes.male.from)}, ${opacity})`;
    }
    if (filters.gender === 'female') {
      const opacity = Math.max(0.1, Math.min(0.9, cell.value / 100));
      return `rgba(${hexToRgb(genderColorThemes.female.from)}, ${opacity})`;
    }

    return `rgba(${hexToRgb(selectedTheme.from)}, ${opacity})`;
  }

  function hexToRgb(color: string): string {
    if (color.startsWith("rgb")) return color.slice(4, -1)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color)
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "99, 102, 241"
  }

  const formatHour = (hour: number) => {
    return `${hour}:00`
  }

  const getProximityEffect = (cellHour: number, cellDay: number) => {
    if (!hoveredCell) return { opacity: 0, glow: 0 };
    
    const distance = Math.sqrt(
      Math.pow(cellHour - hoveredCell.hour, 2) + 
      Math.pow(cellDay - hoveredCell.day, 2)
    );
    
    // Ajustado para mejor alcance diagonal
    return {
      opacity: Math.max(0, 1 - distance * 0.65),
      glow: Math.max(0, 1 - distance * 0.55)
    };
  };

  const shouldShowValue = (cellHour: number, cellDay: number) => {
    if (!hoveredCell) return false;
    
    const distance = Math.sqrt(
      Math.pow(cellHour - hoveredCell.hour, 2) + 
      Math.pow(cellDay - hoveredCell.day, 2)
    );
    
    return distance <= 1.5;
  };

  if (heatmapData.length === 0) {
    return (
      <div className="h-[340px] w-full p-8 rounded-xl border bg-card flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Cargando datos...</div>
      </div>
    )
  }

  return (
    <div className="h-[400px] p-6 rounded-xl border bg-card flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold">Ocupación por Horario</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted/50"
              >
                <Droplets className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-2">
              <div className="grid grid-cols-2 gap-1">
                {colorThemes.map((theme) => (
                  <Button
                    key={theme.name}
                    variant="ghost"
                    className="w-full justify-start gap-2 h-9"
                    onClick={() => setSelectedTheme(theme)}
                  >
                    <div
                      className="h-4 w-4 rounded flex-shrink-0"
                      style={{
                        background: `linear-gradient(to right, ${theme.from}, ${theme.to})`,
                      }}
                    />
                    <span className="text-sm truncate">{theme.name}</span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Nuevo Popover para filtros */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted/50"
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-3">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium">Rango de Tiempo</h4>
                  <Select
                    value={filters.timeRange}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, timeRange: value as FilterOptions['timeRange'] }))
                    }
                  >
                    <SelectTrigger className="w-full h-8">
                      <SelectValue placeholder="Seleccionar período" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                      <SelectItem value="30">Últimos 30 días</SelectItem>
                      <SelectItem value="60">Últimos 60 días</SelectItem>
                      <SelectItem value="90">Últimos 90 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium">Género</h4>
                  <Select
                    value={filters.gender}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, gender: value as FilterOptions['gender'] }))
                    }
                  >
                    <SelectTrigger className="w-full h-8">
                      <SelectValue placeholder="Seleccionar género" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="distribution">Distribución por género</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium">Grupo de Edad</h4>
                  <Select
                    value={filters.ageGroup}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, ageGroup: value as FilterOptions['ageGroup'] }))
                    }
                  >
                    <SelectTrigger className="w-full h-8">
                      <SelectValue placeholder="Seleccionar edad" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                      <SelectItem value="all">Todas las edades</SelectItem>
                      <SelectItem value="18-24">18-24 años</SelectItem>
                      <SelectItem value="25-34">25-34 años</SelectItem>
                      <SelectItem value="35-44">35-44 años</SelectItem>
                      <SelectItem value="45-54">45-54 años</SelectItem>
                      <SelectItem value="55+">55+ años</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Menor</span>
          <div
            className="w-14 h-1.5 rounded"
            style={{
              background: `linear-gradient(to right, ${selectedTheme.to}, ${selectedTheme.from})`,
            }}
          />
          <span>Mayor</span>
        </div>
      </div>

      <div className="relative flex-1 flex">
        {/* Columna de días (eje Y) */}
        <div className="flex flex-col w-9 flex-shrink-0 z-10 pt-7">
          <div 
            className="grid gap-[3px]"
            style={{ 
              gridTemplateRows: `repeat(${days.length}, 35px)`
            }}
          >
            {days.map((day) => (
              <div 
                key={day} 
                className="relative flex items-center"
              >
                <span className="absolute right-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contenedor principal del heatmap */}
        <div className="flex-1 flex flex-col min-w-fit">
          {/* Contenedor de horas y celdas */}
          <div 
            className="grid gap-[3px]"
            style={{ 
              gridTemplateColumns: `repeat(${hours.length}, 35px)`,
              gridTemplateRows: `auto repeat(${days.length}, 35px)`
            }}
          >
            {/* Fila de horas (eje X) */}
            <div className="contents">
              {hours.map((hour) => (
                <div 
                  key={hour} 
                  className="h-7 flex items-center justify-center relative"
                >
                  <span className="absolute whitespace-nowrap text-xs font-medium text-gray-500">
                    {formatHour(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid de celdas del heatmap */}
            {days.map((_, dayIndex) => (
              <div key={dayIndex} className="contents">
                {hours.map((hour) => {
                  const cell = heatmapData.find(
                    (c) => c.hour === hour && c.day === dayIndex
                  );
                  const isHovered = hoveredCell?.hour === hour && hoveredCell?.day === dayIndex;
                  const { opacity, glow } = getProximityEffect(hour, dayIndex);
                  
                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className="aspect-square relative group transition-all duration-300 rounded-sm overflow-visible cursor-pointer"
                      style={{ 
                        backgroundColor: getColor(cell, filters),
                      }}
                      onMouseEnter={() => setHoveredCell({ hour, day: dayIndex })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={(e) => {
                        setSelectedCell({
                          day: days[dayIndex],
                          hour: formatHour(hour),
                          bookings: cell?.bookings || 0,
                          position: {
                            x: 0,
                            y: 0
                          }
                        });
                      }}
                    >
                      {/* Efecto de iluminación focal */}
                      <div 
                        className="absolute inset-0 transition-all duration-300"
                        style={{ 
                          background: isHovered 
                            ? `radial-gradient(circle at center, 
                                rgba(255, 255, 255, 0.3) 0%, 
                                rgba(255, 255, 255, 0.1) 50%, 
                                rgba(255, 255, 255, 0) 80%)`
                            : glow > 0 
                              ? `radial-gradient(circle at center, 
                                  rgba(255, 255, 255, ${glow * 0.12}) 0%, 
                                  rgba(255, 255, 255, ${glow * 0.04}) 50%, 
                                  rgba(255, 255, 255, 0) 80%)`
                              : 'transparent',
                          opacity: 1,
                          mixBlendMode: 'soft-light'
                        }}
                      />

                      {/* Efecto de brillo */}
                      <div 
                        className="absolute inset-0 transition-all duration-300"
                        style={{ 
                          background: `radial-gradient(circle at center, 
                            rgba(255, 255, 255, ${isHovered ? 0.15 : glow * 0.08}) 0%, 
                            transparent 70%)`,
                          opacity: isHovered ? 1 : glow,
                        }}
                      />

                      {/* Valor de la celda */}
                      <div 
                        className="absolute inset-0 flex items-center justify-center text-xs font-medium transition-all duration-300"
                        style={{
                          opacity: isHovered ? 1 : Math.min(0.9, opacity * 0.9),
                          transform: `scale(${isHovered ? 1.1 : 1})`,
                          color: (cell?.value || 0) > 50 ? selectedTheme.textDark : selectedTheme.textLight,
                          mixBlendMode: 'normal',
                          isolation: 'isolate'
                        }}
                      >
                        {cell?.bookings || 0}
                      </div>

                      {/* Borde luminoso en hover */}
                      <div 
                        className="absolute inset-0 transition-all duration-300 rounded-sm"
                        style={{
                          opacity: isHovered ? 0.3 : 0,
                          boxShadow: `
                            inset 0 0 0 1px rgba(255, 255, 255, 0.5),
                            inset 0 0 4px rgba(255, 255, 255, 0.3)
                          `
                        }}
                      />

                      {/* Renderizar el popup directamente en la celda cuando está seleccionada */}
                      {selectedCell?.hour === formatHour(hour) && selectedCell?.day === days[dayIndex] && (
                        <DiscountPopup
                          onClose={() => setSelectedCell(null)}
                          day={selectedCell.day}
                          hour={selectedCell.hour}
                          currentBookings={selectedCell.bookings}
                          position={selectedCell.position}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 