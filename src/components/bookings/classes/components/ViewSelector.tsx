"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface ViewSelectorProps {
  value: 'classes' | 'packages'
  onValueChange: (value: 'classes' | 'packages') => void
}

export function ViewSelector({ value, onValueChange }: ViewSelectorProps) {
  return (
    <div className="bg-white/70 rounded-md border border-gray-50/80 shadow-[0_1px_1px_rgba(0,0,0,0.005)] overflow-hidden p-2.5">
      <div className="flex flex-col gap-1.5">
        <div className="inline-flex h-7 rounded-md bg-gray-50/40 p-0.5">
          <RadioGroup
            value={value}
            onValueChange={onValueChange}
            className={cn(
              "group relative inline-grid grid-cols-2 items-center gap-0 w-full",
              "after:absolute after:inset-y-0 after:w-1/2 after:rounded-md",
              "after:bg-white after:shadow-[0_1px_1px_rgba(0,0,0,0.01)]",
              "after:outline-offset-2 after:transition-transform after:duration-300",
              "after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
              "has-[:focus-visible]:after:outline has-[:focus-visible]:after:outline-2",
              "has-[:focus-visible]:after:outline-ring/70",
              "data-[state=classes]:after:translate-x-0",
              "data-[state=packages]:after:translate-x-full"
            )}
            data-state={value}
          >
            <label className={cn(
              "relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center",
              "whitespace-nowrap px-2 transition-colors",
              "text-xs font-medium",
              "group-data-[state=packages]:text-gray-500"
            )}>
              Clases
              <RadioGroupItem value="classes" className="sr-only" />
            </label>
            <label className={cn(
              "relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center",
              "whitespace-nowrap px-2 transition-colors",
              "text-xs font-medium",
              "group-data-[state=classes]:text-gray-500"
            )}>
              Paquetes
              <RadioGroupItem value="packages" className="sr-only" />
            </label>
          </RadioGroup>
        </div>
      </div>
    </div>
  )
} 