"use client"



import * as React from "react"

import { useState, useEffect, useRef } from "react"

import { IconChevronDown, IconCheck } from "@tabler/icons-react"

import { cn } from "@/lib/utils"



export interface MultiSelectProps {

  value: string[]

  onChange: (value: string[]) => void

  options: { id: string; name: string }[]

  placeholder?: string

}



export function MultiSelect({ 

  value, 

  onChange, 

  options,

  placeholder = "Seleccionar..."

}: MultiSelectProps) {

  const [isOpen, setIsOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)



  // Manejar clic fuera para cerrar

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

    if (value.length === 0) return placeholder

    return options

      .filter(option => value.includes(option.id))

      .map(option => option.name)

      .join(", ")

  }



  return (

    <div ref={containerRef} className="relative">

      <div

        onClick={() => setIsOpen(!isOpen)}

        className={cn(

          "w-full px-3 py-2 rounded-lg border bg-white cursor-pointer",

          "focus:outline-none focus:border-gray-300",

          "transition-colors duration-200",

          "flex items-center justify-between"

        )}

      >

        <span className="text-sm truncate">

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

            <button

              type="button"

              onClick={(e) => {

                e.stopPropagation()

                onChange([])

                setIsOpen(false)

              }}

              className={cn(

                "w-full px-3 py-2 text-left text-sm rounded-md",

                "transition-colors duration-200",

                "hover:bg-gray-50",

                value.length === 0 ? "font-medium text-gray-900" : "text-gray-700"

              )}

            >

              Ninguna

            </button>



            {options.map((option) => (

              <button

                key={option.id}

                type="button"

                onClick={(e) => {

                  e.stopPropagation()

                  const newValue = value.includes(option.id)

                    ? value.filter(v => v !== option.id)

                    : [...value, option.id]

                  onChange(newValue)

                }}

                className={cn(

                  "w-full px-3 py-2 text-left text-sm rounded-md",

                  "transition-colors duration-200",

                  "hover:bg-gray-50",

                  value.includes(option.id) ? "font-medium text-gray-900" : "text-gray-700"

                )}

              >

                <span className="flex items-center justify-between">

                  {option.name}

                  {value.includes(option.id) && (

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
