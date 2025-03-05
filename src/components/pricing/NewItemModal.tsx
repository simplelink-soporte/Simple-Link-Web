"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Switch } from "@/components/ui/switch"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-3"
import { Input } from "@/components/ui/input"
import { IconChevronDown, IconTrash, IconPlus } from "@tabler/icons-react"
import { type Item, type ItemType } from '@/types/items'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SingleSelect } from "@/components/ui/single-select"
import { motion } from "framer-motion"

// Actualizamos la interfaz ItemFormData para incluir todos los campos necesarios
interface ItemFormData {
  name: string
  type: ItemType
  prices: PriceEntry[]
  stock: number
  requires_deposit: boolean
  deposit_amount: number
  is_active: boolean
  default_duration: number
  created_at: string
  updated_at: string
  empresa_id: string
  sede_id: string | null
}

// Actualizamos el defaultFormData
const defaultFormData: ItemFormData = {
  name: '',
  type: 'equipment',
  prices: [{ duration: 60, price: 0 }],
  stock: 0,
  requires_deposit: false,
  deposit_amount: 0,
  is_active: true,
  default_duration: 60,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  empresa_id: '',
  sede_id: null
}

// Actualizamos el tipo de las opciones
interface ItemTypeOption {
  readonly id: ItemType
  readonly name: string
}

const itemTypeOptions: readonly ItemTypeOption[] = [
  { id: 'equipment', name: 'Equipamiento' },
  { id: 'accessory', name: 'Accesorio' },
  { id: 'consumable', name: 'Consumible' }
] as const

// Opciones de duración en minutos
const durationOptions = [15, 30, 45, 60, 90, 120] as const
type Duration = typeof durationOptions[number]

// Actualizamos la interfaz Item para manejar precios por duración
interface PricingByDuration {
  [duration: number]: number // duración en minutos: precio
}

interface NewItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (itemData: Omit<Item, 'id'>) => void
  onDelete?: (id: string) => void
  editingItem?: Item
  mode?: 'create' | 'edit'
}

interface PriceEntry {
  duration: number
  price: number
}

export function NewItemModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingItem,
  mode = 'create'
}: NewItemModalProps) {
  const [mounted, setMounted] = React.useState(false)
  const [formData, setFormData] = useState<ItemFormData>(defaultFormData)

  // Efecto para manejar el montaje
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Efecto para cargar datos de edición o reiniciar al cerrar
  useEffect(() => {
    if (isOpen) {
      if (editingItem && mode === 'edit') {
        console.log('Cargando item para edición:', editingItem)
        
        // Asegurarnos de que duration_pricing existe y es un objeto
        const duration_pricing = editingItem.duration_pricing || {}
        console.log('Duration pricing:', duration_pricing)
        
        // Convertir el duration_pricing object a array de prices
        const prices = Object.entries(duration_pricing).map(([duration, price]) => ({
          duration: Number(duration),
          price: Number(price) // Asegurarnos que el precio es un número
        })).filter(price => !isNaN(price.duration) && !isNaN(price.price)) // Filtrar valores inválidos
        
        console.log('Precios transformados:', prices)
        
        setFormData({
          ...defaultFormData,
          name: editingItem.name || '',
          type: editingItem.type || 'equipment',
          prices: prices.length > 0 ? prices : [{ duration: 60, price: 0 }],
          stock: editingItem.stock || 0,
          requires_deposit: editingItem.requires_deposit || false,
          deposit_amount: editingItem.deposit_amount || 0,
          is_active: editingItem.is_active ?? true,
          default_duration: editingItem.default_duration || 60,
          created_at: editingItem.created_at || new Date().toISOString(),
          updated_at: editingItem.updated_at || new Date().toISOString(),
          empresa_id: editingItem.empresa_id || '',
          sede_id: editingItem.sede_id
        })
      }
    } else {
      setFormData(defaultFormData)
    }
  }, [isOpen, editingItem, mode])

  const handleAddPrice = () => {
    setFormData(prev => ({
      ...prev,
      prices: [...prev.prices, { duration: 30, price: 0 }]
    }))
  }

  const handleRemovePrice = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prices: prev.prices.filter((_, i) => i !== index)
    }))
  }

  const handlePriceChange = (index: number, field: keyof PriceEntry, value: number) => {
    setFormData(prev => ({
      ...prev,
      prices: prev.prices.map((price, i) => 
        i === index ? { ...price, [field]: value } : price
      )
    }))
  }

  const handleSave = () => {
    if (!formData.name.trim()) return

    console.log('Guardando formulario:', formData)

    // Asegurarnos que los precios son válidos antes de transformarlos
    const validPrices = formData.prices.filter(p => p.duration > 0 && p.price >= 0)
    
    // Convertir el array de precios a objeto duration_pricing
    const duration_pricing = validPrices.reduce<Record<string, number>>((acc, { duration, price }) => {
      acc[duration.toString()] = price
      return acc
    }, {})

    console.log('Duration pricing generado:', duration_pricing)

    const currentDate = new Date().toISOString()

    const itemData = {
      name: formData.name,
      type: formData.type,
      duration_pricing, // Usar el objeto generado
      default_duration: formData.default_duration,
      stock: formData.stock,
      requires_deposit: formData.requires_deposit,
      deposit_amount: formData.deposit_amount,
      is_active: formData.is_active,
      created_at: formData.created_at,
      updated_at: currentDate,
      empresa_id: formData.empresa_id,
      sede_id: formData.sede_id
    }

    console.log('Datos a guardar:', itemData)
    onSave(itemData)
    onClose()
  }

  const renderPricingSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Precios por duración</label>
        <Button
          onClick={handleAddPrice}
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-3",
            "border border-gray-200",
            "text-gray-600 text-xs",
            "bg-white hover:bg-gray-50",
            "transition-all duration-200",
            "flex items-center gap-1.5",
            "shadow-sm",
            "hover:border-gray-300"
          )}
        >
          <IconPlus className="h-3.5 w-3.5" stroke={1.5} />
          <span>Añadir precio</span>
        </Button>
      </div>

      <div className="space-y-3">
        {formData.prices.map((price, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  value={price.duration}
                  onChange={(e) => handlePriceChange(index, 'duration', Number(e.target.value))}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "border border-gray-200 bg-white",
                    "focus:outline-none focus:border-gray-300",
                    "transition-colors duration-200",
                    "placeholder:text-gray-400",
                    "text-sm",
                    "[appearance:textfield]",
                    "[&::-webkit-outer-spin-button]:appearance-none",
                    "[&::-webkit-inner-spin-button]:appearance-none"
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Precio (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price.price}
                  onChange={(e) => handlePriceChange(index, 'price', Number(e.target.value))}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "border border-gray-200 bg-white",
                    "focus:outline-none focus:border-gray-300",
                    "transition-colors duration-200",
                    "placeholder:text-gray-400",
                    "text-sm",
                    "[appearance:textfield]",
                    "[&::-webkit-outer-spin-button]:appearance-none",
                    "[&::-webkit-inner-spin-button]:appearance-none"
                  )}
                />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemovePrice(index)}
              className={cn(
                "h-9 w-9",
                "text-gray-400 hover:text-red-500",
                "hover:bg-red-50",
                "transition-colors duration-200",
                "rounded-lg"
              )}
              disabled={formData.prices.length === 1}
            >
              <IconTrash className="h-4 w-4" stroke={1.5} />
            </Button>
          </motion.div>
        ))}
      </div>

      {formData.prices.length > 1 && (
        <p className="text-xs text-gray-500 italic">
          * Los precios se ordenarán automáticamente por duración
        </p>
      )}
    </div>
  )

  if (!mounted) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      className="w-[500px]"
    >
      <div className="h-full flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Agregar Nuevo Artículo' : 'Editar Artículo'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'create' 
              ? 'Complete los datos del nuevo artículo'
              : 'Modifique los datos del artículo'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Nombre del artículo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Nombre del artículo
              </label>
              <input
                type="text"
                placeholder="Ej: Raqueta Pro"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={cn(
                  "w-full px-3 py-2 rounded-lg",
                  "border border-gray-200 bg-white",
                  "focus:outline-none focus:border-gray-300",
                  "transition-colors duration-200",
                  "placeholder:text-gray-400",
                  "text-sm"
                )}
              />
            </div>

            {/* Tipo de artículo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tipo de artículo
              </label>
              <SingleSelect
                value={formData.type}
                onChange={(value: ItemType) => setFormData(prev => ({ 
                  ...prev, 
                  type: value 
                }))}
                options={itemTypeOptions}
                placeholder="Seleccionar tipo de artículo"
              />
            </div>

            {/* Stock disponible */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Stock disponible
              </label>
              <input
                type="number"
                min="0"
                placeholder="Cantidad disponible"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  stock: Number(e.target.value) 
                }))}
                className={cn(
                  "w-full px-3 py-2 rounded-lg",
                  "border border-gray-200 bg-white",
                  "focus:outline-none focus:border-gray-300",
                  "transition-colors duration-200",
                  "placeholder:text-gray-400",
                  "text-sm",
                  "[appearance:textfield]",
                  "[&::-webkit-outer-spin-button]:appearance-none",
                  "[&::-webkit-inner-spin-button]:appearance-none"
                )}
              />
            </div>

            {/* Depósito */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Requiere depósito</label>
                  <p className="text-sm text-gray-500">
                    El cliente deberá dejar un depósito como garantía
                  </p>
                </div>
                <Switch
                  checked={formData.requires_deposit}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, requires_deposit: checked }))
                  }
                />
              </div>

              {formData.requires_deposit && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Monto del depósito
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ingrese el monto del depósito"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      deposit_amount: Number(e.target.value) 
                    }))}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg",
                      "border border-gray-200 bg-white",
                      "focus:outline-none focus:border-gray-300",
                      "transition-colors duration-200",
                      "placeholder:text-gray-400",
                      "text-sm",
                      "[appearance:textfield]",
                      "[&::-webkit-outer-spin-button]:appearance-none",
                      "[&::-webkit-inner-spin-button]:appearance-none"
                    )}
                  />
                </div>
              )}
            </div>

            {/* Sección de precios */}
            {renderPricingSection()}
          </div>
        </div>

        <div className="p-6 border-t bg-white">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
            >
              {mode === 'create' ? 'Guardar' : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
} 