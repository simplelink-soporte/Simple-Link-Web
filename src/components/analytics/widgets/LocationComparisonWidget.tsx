"use client"

import * as React from "react"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-2"
import { RotateCw } from "lucide-react"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
)

interface LocationData {
  name: string
  metrics: {
    reservations: {
      mean: number
      distribution: number[]
    }
    revenue: {
      mean: number
      distribution: number[]
    }
    satisfaction: {
      mean: number
      distribution: number[]
    }
    occupancy: {
      mean: number
      distribution: number[]
    }
    retention: {
      mean: number
      distribution: number[]
    }
  }
}

const locations: LocationData[] = [
  {
    name: "Sede Central",
    metrics: {
      reservations: {
        mean: 85,
        distribution: [75, 80, 85, 90, 85, 80, 75]
      },
      revenue: {
        mean: 92,
        distribution: [85, 88, 92, 95, 92, 88, 85]
      },
      satisfaction: {
        mean: 88,
        distribution: [82, 85, 88, 90, 88, 85, 82]
      },
      occupancy: {
        mean: 78,
        distribution: [70, 75, 78, 82, 78, 75, 70]
      },
      retention: {
        mean: 82,
        distribution: [75, 80, 82, 85, 82, 80, 75]
      }
    }
  },
  {
    name: "Sede Norte",
    metrics: {
      reservations: {
        mean: 75,
        distribution: [65, 70, 75, 80, 75, 70, 65]
      },
      revenue: {
        mean: 68,
        distribution: [60, 65, 68, 72, 68, 65, 60]
      },
      satisfaction: {
        mean: 92,
        distribution: [85, 88, 92, 95, 92, 88, 85]
      },
      occupancy: {
        mean: 82,
        distribution: [75, 80, 82, 85, 82, 80, 75]
      },
      retention: {
        mean: 88,
        distribution: [80, 85, 88, 90, 88, 85, 80]
      }
    }
  },
  {
    name: "Sede Sur",
    metrics: {
      reservations: {
        mean: 92,
        distribution: [85, 88, 92, 95, 92, 88, 85]
      },
      revenue: {
        mean: 85,
        distribution: [78, 82, 85, 88, 85, 82, 78]
      },
      satisfaction: {
        mean: 76,
        distribution: [70, 73, 76, 80, 76, 73, 70]
      },
      occupancy: {
        mean: 95,
        distribution: [88, 92, 95, 98, 95, 92, 88]
      },
      retention: {
        mean: 72,
        distribution: [65, 68, 72, 75, 72, 68, 65]
      }
    }
  }
]

const metrics = {
  reservations: "Reservas",
  satisfaction: "Satisfacción",
  retention: "Retención",
}

type MetricKey = keyof typeof metrics

interface OccupancyBarProps {
  location: string
  percentage: number
  color: string
  index: number
}

function OccupancyBar({ location, percentage, color, index }: OccupancyBarProps) {
  return (
    <div className="flex flex-col items-center gap-4 group">
      {/* Porcentaje con animación en hover */}
      <span className="font-medium text-xs tracking-tight transition-transform duration-300 group-hover:scale-110">
        {percentage}%
      </span>

      {/* Contenedor de la barra */}
      <div className="relative h-[140px] w-8">
        {/* Barra de fondo con efecto de hover */}
        <div 
          className="absolute bottom-0 w-full bg-gray-100 overflow-hidden transition-all duration-300 group-hover:bg-gray-200 rounded-md" 
          style={{ height: '100%' }}
        >
          {/* Barra de progreso con animación y efectos */}
          <div 
            className="absolute bottom-0 w-full transition-all duration-700 ease-in-out bg-gradient-to-t from-black/90 to-black/80 rounded-md"
            style={{ 
              height: '0%',
              transform: 'translateZ(0)',
              animation: `grow-bar 1.2s cubic-bezier(0.4, 0.0, 0.2, 1) forwards ${index * 0.15}s`,
              '--percentage': `${percentage}%`,
            } as React.CSSProperties}
          >
            {/* Efecto de brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
          </div>
          
          {/* Efecto de brillo lateral */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        </div>

        {/* Línea decorativa superior */}
        <div className="absolute -top-2 left-1/2 h-2 w-[1px] bg-gray-200" />
      </div>

      {/* Nombre de la sede */}
      <span className="text-[11px] text-muted-foreground text-center font-medium transition-colors duration-300 group-hover:text-foreground">
        {location}
      </span>

      {/* Indicador de valor actual */}
      <div className="absolute -bottom-1 left-1/2 w-1 h-1 bg-black/40 rounded-full transform -translate-x-1/2 transition-all duration-300 group-hover:scale-150 group-hover:bg-black" />
    </div>
  )
}

interface BubbleProps {
  location: string
  percentage: number
}

function ComparativeBubble({ location, percentage }: BubbleProps) {
  const size = 70 + (percentage * 0.6)
  
  return (
    <div 
      className="flex flex-col items-center group"
      style={{
        animation: 'bubble-in 0.7s ease-out forwards',
      }}
    >
      <div 
        className="relative transition-transform duration-300 group-hover:scale-105 z-10 group-hover:z-20"
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          margin: '-15px',
        }}
      >
        {/* Burbuja principal */}
        <div 
          className="absolute inset-0 bg-white rounded-full"
          style={{
            padding: '2px',
          }}
        >
          <div 
            className="w-full h-full bg-black/90 rounded-full transition-all duration-300 group-hover:bg-black"
            style={{
              transform: 'translateZ(0)',
            }}
          >
            {/* Efecto de brillo */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent opacity-50" />
          </div>
        </div>
        
        {/* Porcentaje centrado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-base font-medium transition-transform duration-300 group-hover:scale-110">
            {percentage}%
          </span>
        </div>
      </div>
      
      {/* Nombre de la sede */}
      <span className="text-xs text-muted-foreground text-center font-medium transition-colors duration-300 group-hover:text-foreground mt-5">
        {location}
      </span>
    </div>
  )
}

export function LocationComparisonWidget() {
  const [selectedMetric, setSelectedMetric] = React.useState<MetricKey>("reservations")

  const getDistributionData = () => {
    const labels = locations.map(l => l.name)
    const datasets = []
    
    for (let i = 0; i < 7; i++) {
      datasets.push({
        label: i === 3 ? 'Media' : '',
        data: locations.map(l => l.metrics[selectedMetric].distribution[i]),
        backgroundColor: locations.map(l => 
          getLocationColor(l.name, i === 3 ? 1 : 0.15 + (i * 0.1))
        ),
        borderRadius: 4,
        barThickness: i === 3 ? 4 : 2,
        borderColor: 'transparent',
      })
    }

    return {
      labels,
      datasets,
    }
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgb(17, 17, 17)',
        padding: 12,
        cornerRadius: 8,
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: (items: any[]) => {
            const locationName = items[0].label
            const location = locations.find(l => l.name === locationName)
            return locationName
          },
          label: (context: any) => {
            const locationName = context.label
            const location = locations.find(l => l.name === locationName)
            if (!location) return ''
            return `${metrics[selectedMetric]}: ${location.metrics[selectedMetric].mean}%`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: 'rgb(107, 114, 128)',
          callback: (value: any) => `${value}%`,
        },
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
            weight: 500 as const,
          },
          color: 'rgb(107, 114, 128)',
        },
      },
    },
  }

  return (
    <div className="h-[400px] p-6 rounded-xl border bg-card">
      <Tabs defaultValue="status" className="h-full">
        <div className="flex items-center justify-end mb-4">
          <TabsList className="grid w-[300px] grid-cols-2 p-1">
            <TabsTrigger 
              value="status" 
              className="text-xs data-[state=inactive]:text-gray-400"
            >
              Estado
            </TabsTrigger>
            <TabsTrigger 
              value="comparison" 
              className="text-xs data-[state=inactive]:text-gray-400"
            >
              Comparativa
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="h-[calc(400px-5rem)]">
          <TabsContent value="status" className="h-full mt-0">
            <div className="h-full flex flex-col">
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-1">Ocupación Actual</h3>
                <p className="text-sm text-gray-400">
                  Porcentaje de ocupación en tiempo real de cada sede
                </p>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                <div className="flex justify-around w-full px-8 -mt-8">
                  {locations.map((location, index) => (
                    <OccupancyBar
                      key={location.name}
                      location={location.name}
                      percentage={location.metrics.occupancy.mean}
                      color={getLocationColor(location.name, 1)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="h-full mt-0">
            <div className="flex flex-col h-full">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium mb-1">Análisis Comparativo</h3>
                  <p className="text-sm text-gray-400">
                    Visualización del rendimiento relativo entre sedes
                  </p>
                </div>

                <Select
                  value={selectedMetric}
                  onValueChange={(value) => setSelectedMetric(value as MetricKey)}
                >
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue placeholder="Seleccionar métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(metrics).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contenedor de burbujas con animación */}
              <div className="flex-1 flex items-center justify-center">
                <div 
                  className="flex justify-center items-center gap-[-20px] w-full max-w-md"
                  style={{
                    perspective: '1000px',
                  }}
                >
                  {locations.map((location, index) => (
                    <div
                      key={location.name}
                      style={{
                        animation: `fade-in-bubble 0.5s ease-out forwards ${index * 0.15}s`,
                        opacity: 0,
                      }}
                    >
                      <ComparativeBubble
                        location={location.name}
                        percentage={location.metrics[selectedMetric].mean}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function getLocationColor(name: string, alpha: number): string {
  const colors = {
    "Sede Central": `rgba(23, 23, 23, ${alpha})`,
    "Sede Norte": `rgba(76, 29, 149, ${alpha})`,
    "Sede Sur": `rgba(157, 23, 77, ${alpha})`,
  }
  return colors[name as keyof typeof colors]
}

// Añadir estos estilos globales en tu archivo CSS
const styles = `
  @keyframes bubble-in {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes fade-in-bubble {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes grow-bar {
    0% {
      height: 0%;
    }
    100% {
      height: var(--percentage);
    }
  }
`

// Inyectar los estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}