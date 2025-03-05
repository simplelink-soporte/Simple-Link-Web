"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimeRangeSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const generateTimeOptions = () => {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, '0')
      const formattedMinute = minute.toString().padStart(2, '0')
      options.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

export function TimeRangeSelect({ value, onChange, className }: TimeRangeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        "w-[120px]",
        "border border-gray-200",
        "focus:ring-0 focus:ring-offset-0",
        "focus:border-gray-300",
        className
      )}>
        <SelectValue placeholder="Seleccionar hora" />
      </SelectTrigger>
      <SelectContent>
        <div className="max-h-[200px] overflow-y-auto">
          {timeOptions.map((time) => (
            <SelectItem
              key={time}
              value={time}
              className={cn(
                "cursor-pointer",
                "hover:bg-gray-50",
                "focus:bg-gray-50",
                "transition-colors"
              )}
            >
              {time}
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  )
} 