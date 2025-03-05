"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

interface StatsWidgetProps {
  title: string
  value: string
  change: number
  icon: React.ReactNode
}

export function StatsWidget({ title, value, change, icon }: StatsWidgetProps) {
  return (
    <div className="h-[360px] p-8 rounded-xl border bg-card flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <h3 className="text-5xl font-semibold mb-4">{value}</h3>
        <div className="flex items-center gap-2">
          {change > 0 ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          <span className={`text-sm ${change > 0 ? "text-green-500" : "text-red-500"}`}>
            {Math.abs(change)}%
          </span>
          <span className="text-sm text-muted-foreground">vs. mes anterior</span>
        </div>
      </div>
    </div>
  )
} 