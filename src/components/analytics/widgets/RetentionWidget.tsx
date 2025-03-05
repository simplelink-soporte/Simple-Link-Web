"use client"

import * as React from "react"
import { Doughnut, Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export function RetentionWidget() {
  const doughnutData = {
    labels: ['Clientes que vuelven'],
    datasets: [
      {
        data: [78, 22],
        backgroundColor: [
          'rgb(23, 23, 23)',
          'rgb(249, 250, 251)'
        ],
        borderWidth: 0,
        spacing: 0.5,
        borderRadius: 0,
      },
    ],
  }

  const barData = {
    labels: ['2 veces', '3 veces', '4 veces', '5 veces', '6+ veces'],
    datasets: [
      {
        data: [35, 25, 20, 12, 8],
        backgroundColor: 'rgb(23, 23, 23)',
        borderRadius: 6,
        barThickness: 12,
      },
    ],
  }

  const barOptions = {
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
          title: () => '',
          label: (context: any) => `${context.raw}% de clientes que vuelven`,
        }
      },
    },
    scales: {
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
            weight: '500' as const,
          },
          color: 'rgb(156, 163, 175)',
        }
      },
      y: {
        max: 100,
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.04)',
          drawTicks: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: 'rgb(156, 163, 175)',
          padding: 8,
          callback: (value: number) => `${value}%`,
        },
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '96%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 11,
            weight: 400,
          },
          color: 'rgb(107, 114, 128)',
          filter: (legendItem: any) => legendItem.index === 0,
        },
      },
      tooltip: {
        backgroundColor: 'rgb(17, 17, 17)',
        padding: 12,
        cornerRadius: 8,
        bodyFont: {
          size: 12,
        },
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.raw}% de clientes`,
        }
      },
    },
  }

  return (
    <div className="h-[400px] p-6 rounded-xl border bg-card">
      <Tabs defaultValue="retention" className="h-full">
        <div className="flex items-center justify-end mb-4">
          <TabsList className="grid w-[300px] grid-cols-2 p-1">
            <TabsTrigger 
              value="retention" 
              className="text-xs data-[state=inactive]:text-gray-400"
            >
              Tasa de Retención
            </TabsTrigger>
            <TabsTrigger 
              value="frequency" 
              className="text-xs data-[state=inactive]:text-gray-400"
            >
              Frecuencia
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="h-[calc(400px-5rem)]">
          <TabsContent value="retention" className="h-full mt-0">
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-1">Retención de Clientes</h3>
                <p className="text-sm text-gray-400">
                  Porcentaje de clientes que continúan activos
                </p>
              </div>

              <div className="flex-1 flex items-center justify-center -mt-4">
                <div className="relative w-[240px] h-[240px]">
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="flex flex-col items-center justify-center translate-y-[-20px]">
                      <div className="text-3xl font-semibold tracking-tight leading-none mb-1">78%</div>
                      <div className="text-xs text-muted-foreground">Tasa de retención</div>
                    </div>
                  </div>
                  
                  <div className="absolute inset-0">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="frequency" className="h-full mt-0">
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-1">Frecuencia de Visitas</h3>
                <p className="text-sm text-gray-400">
                  Distribución de visitas repetidas por cliente
                </p>
              </div>

              <div className="flex-1 flex items-center -mt-6">
                <div className="w-full h-[220px]">
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