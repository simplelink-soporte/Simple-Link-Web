"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        "relative h-1 w-full grow overflow-hidden rounded-full",
        "bg-gray-100 dark:bg-neutral-800"
      )}>
      <SliderPrimitive.Range className={cn(
        "absolute h-full",
        "bg-zinc-400 hover:bg-zinc-500 dark:bg-neutral-600"
      )} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "block h-3 w-3 rounded-full",
        "border-2 border-zinc-400 dark:border-neutral-600",
        "bg-white dark:bg-neutral-900",
        "transition-colors",
        "focus-visible:outline-none focus-visible:ring-1",
        "focus-visible:ring-zinc-400 dark:focus-visible:ring-neutral-600",
        "disabled:pointer-events-none disabled:opacity-50"
      )} />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider } 