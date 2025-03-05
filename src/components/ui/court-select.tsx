"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { IconChevronDown } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { courts } from "@/lib/data"

interface CourtSelectProps {
  value: string[]
  onChange: (courts: string[]) => void
}

export function CourtSelect({ value, onChange }: CourtSelectProps) {
  const handleValueChange = (courtId: string) => {
    if (courtId === 'none') {
      onChange([])
      return
    }

    const newSelection = value.filter(id => id !== 'none')

    if (newSelection.includes(courtId)) {
      onChange(newSelection.filter(id => id !== courtId))
    } else {
      onChange([...newSelection, courtId])
    }
  }

  const getDisplayValue = () => {
    if (value.length === 0) return "Seleccionar cancha"
    return courts
      .filter(court => value.includes(court.id))
      .map(court => court.name)
      .join(", ")
  }

  return (
    <SelectPrimitive.Root
      value={value.length === 0 ? 'none' : value[0]}
      onValueChange={handleValueChange}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "w-full px-3 py-2 rounded-lg border bg-white",
          "focus:outline-none focus:border-gray-300",
          "transition-colors duration-200",
          "flex items-center justify-between"
        )}
      >
        <SelectPrimitive.Value>
          {getDisplayValue()}
        </SelectPrimitive.Value>
        <IconChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="relative z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-md animate-in fade-in-80"
          position="popper"
          sideOffset={5}
        >
          <SelectPrimitive.Viewport className="p-1">
            <SelectPrimitive.Item
              value="none"
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none",
                "transition-colors duration-200",
                "hover:bg-gray-50",
                value.length === 0 ? "font-medium text-gray-900" : "text-gray-700"
              )}
            >
              <SelectPrimitive.ItemText>
                Ninguna
              </SelectPrimitive.ItemText>
            </SelectPrimitive.Item>

            {courts.map((court) => (
              <SelectPrimitive.Item
                key={court.id}
                value={court.id}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none",
                  "transition-colors duration-200",
                  "hover:bg-gray-50",
                  value.includes(court.id) ? "font-medium text-gray-900" : "text-gray-700"
                )}
              >
                <SelectPrimitive.ItemText>
                  {court.name}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
} 