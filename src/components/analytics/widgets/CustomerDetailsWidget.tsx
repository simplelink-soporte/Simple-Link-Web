"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTooltip,
)

interface GenderData {
  label: string
  count: number
  total: number
  color: string
}

interface AgeData {
  range: string
  count: number
  percentage: number
}

export function CustomerDetailsWidget() {
  const genderData: GenderData[] = [
    {
      label: "Masculino",
      count: 643,
      total: 1429,
      color: "rgb(56, 89, 147)",
    },
    {
      label: "Femenino",
      count: 686,
      total: 1429,
      color: "rgb(190, 75, 119)",
    },
    {
      label: "Otros",
      count: 100,
      total: 1429,
      color: "rgb(107, 114, 128)",
    },
  ]

  const ageData: AgeData[] = [
    { range: "18-24", count: 286, percentage: 20 },
    { range: "25-34", count: 500, percentage: 35 },
    { range: "35-44", count: 357, percentage: 25 },
    { range: "45-54", count: 214, percentage: 15 },
    { range: "55+", count: 72, percentage: 5 },
  ]

  const barData = {
    labels: ageData.map(d => d.range),
    datasets: [
      {
        data: ageData.map(d => d.percentage),
        backgroundColor: 'rgb(23, 23, 23)',
        borderRadius: 6,
        barThickness: 12,
      },
    ],
  }

  const barOptions = {
    indexAxis: 'y' as const,
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
        titleFont: {
          size: 13,
          weight: 500,
        },
        bodyFont: {
          size: 12,
        },
        displayColors: false,
        callbacks: {
          title: (items: any) => ageData[items[0].dataIndex].range + ' años',
          label: (context: any) => {
            const count = ageData[context.dataIndex].count;
            return [
              `${context.raw}% de clientes`,
              `${count.toLocaleString()} personas`
            ];
          },
        }
      },
    },
    scales: {
      x: {
        max: 100,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: 'rgb(156, 163, 175)',
          callback: (value: number) => `${value}%`,
        },
      },
      y: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
            weight: '500',
          },
          color: 'rgb(156, 163, 175)',
        }
      },
    },
  }

  const calculatePercentage = (count: number, total: number) => {
    return Math.round((count / total) * 100)
  }

  return (
    <div className="h-[400px] p-6 rounded-xl border bg-card">
      <Tabs defaultValue="gender" className="h-full">
        <div className="flex items-center justify-end mb-4">
          <TabsList className="grid w-[300px] grid-cols-2 p-1">
            <TabsTrigger 
              value="gender" 
              className="text-xs data-[state=inactive]:text-gray-400"
            >
              Género
            </TabsTrigger>
            <TabsTrigger 
              value="age" 
              className="text-xs data-[state=inactive]:text-gray-400"
            >
              Grupos de Edad
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="h-[calc(400px-5rem)]">
          <TabsContent value="gender" className="h-full mt-0">
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-1">Distribución por Género</h3>
                <p className="text-sm text-gray-400">
                  Segmentación de clientes según identificación de género
                </p>
              </div>

              <div className="flex-1 pt-2 -mt-2">
                <div className="w-full space-y-6">
                  {genderData.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="text-lg font-medium text-muted-foreground">
                          {calculatePercentage(item.count, item.total)}%
                        </span>
                      </div>
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger className="w-full" asChild>
                            <div className="relative cursor-help">
                              <div className="h-1 w-full rounded-full bg-muted/20" />
                              <div 
                                className="absolute top-0 left-0 h-1 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${calculatePercentage(item.count, item.total)}%`,
                                  backgroundColor: item.color,
                                  boxShadow: `0 1px 2px ${item.color}20`,
                                }}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="text-xs font-medium"
                            sideOffset={4}
                          >
                            {item.count.toLocaleString()} clientes
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="age" className="h-full mt-0">
            <div className="h-full flex flex-col">
              <div className="mb-5">
                <h3 className="text-sm font-medium mb-1">Rangos de Edad</h3>
                <p className="text-sm text-gray-400">
                  Distribución demográfica por grupos etarios
                </p>
              </div>

              <div className="flex-1 -mt-5">
                <div className="w-full h-[250px]">
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
} 