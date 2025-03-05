"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IconLoader } from "@tabler/icons-react"

interface GroupedOption {
  label: string
  options: {
    value: string
    label: string
  }[]
}

interface GroupedMultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  options: GroupedOption[]
  placeholder?: string
  isLoading?: boolean
  error?: Error | null
}

export function GroupedMultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = "Seleccionar...",
  isLoading = false,
  error = null
}: GroupedMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  // Obtener las etiquetas seleccionadas
  const getSelectedLabels = () => {
    const selectedLabels: string[] = []
    options.forEach(group => {
      group.options.forEach(option => {
        if (value.includes(option.value)) {
          selectedLabels.push(option.label)
        }
      })
    })
    return selectedLabels
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <IconLoader className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Cargando...</span>
            </div>
          ) : value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {getSelectedLabels().map((label) => (
                <span
                  key={label}
                  className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-sm"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          {options.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    const newValue = value.includes(option.value)
                      ? value.filter((v) => v !== option.value)
                      : [...value, option.value]
                    onChange(newValue)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 