"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  Copy, 
  Check, 
  MoreVertical, 
  Trash2, 
  EyeOff, 
  Eye,
  Palette, 
  Pencil, 
  FileText,
  ExternalLink 
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FormData } from "@/types/forms"

interface FormCardProps {
  form: FormData
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
  onColorChange?: (id: string, color: string) => void
  onEdit?: (id: string) => void
}

const COLORS = [
  { value: "#000000", label: "Negro" },
  { value: "#DC2626", label: "Rojo" },
  { value: "#16A34A", label: "Verde" },
  { value: "#2563EB", label: "Azul" },
  { value: "#7C3AED", label: "Violeta" },
  { value: "#BE185D", label: "Rosa" },
] as const

export function FormCard({ 
  form, 
  onDelete, 
  onToggleActive, 
  onColorChange,
  onEdit 
}: FormCardProps) {
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(form.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Error al copiar:", err)
    }
  }

  const handleDelete = () => {
    setShowDeleteDialog(false)
    onDelete(form.id)
  }

  const handleColorSelect = (color: string) => {
    onColorChange?.(form.id, color)
    setShowColorPicker(false)
    setShowDropdown(false)
  }

  const handleEdit = () => {
    onEdit?.(form.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-lg border transition-all duration-200",
        "hover:shadow-sm",
        !form.isActive && "opacity-75"
      )}
    >
      {/* Indicador de color */}
      {form.color && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all duration-200"
          style={{ backgroundColor: form.color }}
        />
      )}

      <div className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "p-1.5 rounded-md transition-colors",
              form.isActive ? "bg-gray-100" : "bg-gray-50",
              "text-gray-600"
            )}>
              <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
            </div>
            
            <div className="min-w-0">
              <h3 className="font-medium text-sm text-gray-900 truncate">
                {form.title}
              </h3>
              <p className="text-[10px] text-gray-500 truncate mt-0.5">
                {form.description}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  form.isActive 
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-600"
                )}>
                  {form.isActive ? "Activo" : "Inactivo"}
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(form.createdAt).toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              className="h-7 w-7 rounded-md"
              title="Editar formulario"
            >
              <Pencil className="h-3.5 w-3.5 text-gray-500" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-7 w-7 rounded-md"
              title={copied ? "Copiado" : "Copiar enlace"}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-gray-500" />
              )}
            </Button>

            <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7 rounded-md"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToggleActive(form.id)}
                  className="gap-2"
                >
                  {form.isActive ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Desactivar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Activar</span>
                    </>
                  )}
                </DropdownMenuItem>
                <Popover 
                  open={showColorPicker} 
                  onOpenChange={setShowColorPicker}
                  modal={false}
                >
                  <PopoverTrigger asChild>
                    <DropdownMenuItem
                      className="gap-2"
                      onSelect={(e) => {
                        e.preventDefault();
                        setShowColorPicker(true);
                      }}
                    >
                      <Palette className="h-3.5 w-3.5" />
                      <span>Color</span>
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-2" 
                    align="end" 
                    side="right"
                    sideOffset={5}
                    onInteractOutside={(e) => {
                      // Prevenir que se cierre al interactuar fuera
                      e.preventDefault();
                    }}
                  >
                    <div className="grid grid-cols-3 gap-1">
                      {COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => handleColorSelect(color.value)}
                          className={cn(
                            "h-8 w-8 rounded-md transition-all",
                            "hover:scale-105 focus:scale-105",
                            "focus:outline-none focus:ring-2 focus:ring-offset-2",
                            form.color === color.value && "ring-2 ring-black ring-offset-2"
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-500 gap-2 mt-1 border-t"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar formulario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el formulario "{form.title}".
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
} 