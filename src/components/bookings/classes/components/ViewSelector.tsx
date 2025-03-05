"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface ViewSelectorProps {
  value: 'classes' | 'packages'
  onValueChange: (value: 'classes' | 'packages') => void
}

export function ViewSelector({ value, onValueChange }: ViewSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-mono text-gray-500">
        Cambiar vista
      </span>
      <div className="inline-flex h-7 rounded-lg bg-gray-100/75 p-0.5">
        <RadioGroup
          value={value}
          onValueChange={onValueChange}
          className={cn(
            "group relative inline-grid grid-cols-[1fr_1fr] items-center gap-0",
            "after:absolute after:inset-y-0 after:w-1/2 after:rounded-md",
            "after:bg-white after:shadow-sm after:shadow-black/[0.03]",
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
            "whitespace-nowrap px-3 transition-colors",
            "text-[0.8125rem] font-mono tracking-wide",
            "group-data-[state=packages]:text-muted-foreground/60"
          )}>
            Clases
            <RadioGroupItem value="classes" className="sr-only" />
          </label>
          <label className={cn(
            "relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center",
            "whitespace-nowrap px-3 transition-colors",
            "text-[0.8125rem] font-mono tracking-wide",
            "group-data-[state=classes]:text-muted-foreground/60"
          )}>
            Paquetes
            <RadioGroupItem value="packages" className="sr-only" />
          </label>
        </RadioGroup>
      </div>
    </div>
  )
} 