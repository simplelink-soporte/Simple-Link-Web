"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { IconChevronDown, IconCheck } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { type ItemType } from '@/types/items'

interface Option<T = string> {
  id: T
  name: string
}

interface SingleSelectProps<T = string> {
  value: T
  onChange: (value: T) => void
  options: readonly Option<T>[]
  placeholder?: string
  className?: string
}

export function SingleSelect<T extends string>({ 
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  className
}: SingleSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDisplayValue = () => {
    if (!value) return placeholder
    const selectedOption = options.find(option => option.id === value)
    return selectedOption ? selectedOption.name : placeholder
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 rounded-lg border bg-white cursor-pointer",
          "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black",
          "transition-all duration-200",
          "flex items-center justify-between"
        )}
      >
        <span className={cn(
          "text-sm truncate",
          !value && "text-gray-400"
        )}>
          {getDisplayValue()}
        </span>
        <IconChevronDown 
          className={cn(
            "h-4 w-4 opacity-50 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )} 
        />
      </div>

      {isOpen && (
        <div 
          className={cn(
            "absolute top-full left-0 w-full mt-1",
            "bg-white border rounded-lg shadow-lg z-10",
            "animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          <div className="p-1">
            {options.map((option) => (
              <button
                key={String(option.id)}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(option.id)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm rounded-md",
                  "transition-colors duration-200",
                  "hover:bg-gray-50",
                  value === option.id ? "font-medium text-gray-900" : "text-gray-700"
                )}
              >
                <span className="flex items-center justify-between">
                  {option.name}
                  {value === option.id && (
                    <IconCheck className="h-4 w-4" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 