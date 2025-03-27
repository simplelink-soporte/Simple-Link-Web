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
import { IconTrash, IconChevronDown } from "@tabler/icons-react"
import { CourtPricingConfig } from './CourtPricingConfig'
import { type Court, type SurfaceType, type DurationOption, type CourtPricing } from '@/types/court'
import { SingleSelect } from "@/components/ui/single-select"
import { cn } from "@/lib/utils"
import { CategoryMultiSelect } from "@/components/ui/category-multi-select"
import { DurationPricing } from "./DurationPricing"
import { CustomPricing } from "./CustomPricing"
import { AnimatePresence, motion } from "framer-motion"

interface NewCourtModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (courtData: Omit<Court, 'id'>) => void
  onDelete?: (id: string) => void
  editingCourt?: Court
  mode?: 'create' | 'edit'
  isLoading?: boolean
}

const surfaceOptions = [
  { value: 'crystal', label: 'Cristal Panorámico' },
  { value: 'panoramic', label: 'Cristal Premium' },
  { value: 'premium', label: 'Cristal Pro' },
  { value: 'synthetic', label: 'Césped Sintético' },
  { value: 'clay', label: 'Tierra Batida' },
  { value: 'grass', label: 'Césped Natural' },
  { value: 'rubber', label: 'Goma Profesional' },
  { value: 'concrete', label: 'Hormigón Pulido' }
]

const defaultPricing: CourtPricing = {
  default: 0,
};

const durationOptions: DurationOption[] = [30, 45, 60, 90, 120];

const sportOptions = [
  { id: 'racket', name: 'Raqueta' },
  { id: 'swimming', name: 'Natación' },
]

const courtTypeOptions = [
  { id: 'indoor', name: 'Interior' },
  { id: 'outdoor', name: 'Exterior' },
  { id: 'covered', name: 'Cubierta' },
]

const courtFeatures = [
  {
    id: 'walls',
    name: 'Tipo de Paredes',
    options: [
      { id: 'wall-concrete', name: 'Muro de Hormigón' },
      { id: 'wall-glass', name: 'Cristal Estándar' },
      { id: 'wall-panoramic', name: 'Cristal Panorámico' },
    ]
  },
  {
    id: 'floor',
    name: 'Tipo de Suelo',
    options: [
      { id: 'floor-synthetic', name: 'Césped Sintético' },
      { id: 'floor-clay', name: 'Tierra Batida' },
      { id: 'floor-concrete', name: 'Hormigón Pulido' },
      { id: 'floor-rubber', name: 'Goma Profesional' },
    ]
  }
]

// Añadimos un tipo para los pasos
type Step = 'court' | 'pricing';

const defaultFormData: Omit<Court, 'id'> = {
  name: '',
  branch_id: '',
  sport: 'racket',
  court_type: 'indoor',
  surface: 'crystal',
  is_active: true,
  duration_pricing: {},
  custom_pricing: {} as Court['custom_pricing'],
  available_durations: [60],
  features: []
}

export function NewCourtModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  editingCourt,
  mode = 'create' 
}: NewCourtModalProps) {
  const [formData, setFormData] = useState<Omit<Court, 'id'>>(defaultFormData)
  const [currentStep, setCurrentStep] = useState<Step>('court')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newDuration, setNewDuration] = useState<number | null>(null)
  const isRacketSport = formData.sport === 'racket'

  useEffect(() => {
    if (isOpen && editingCourt) {
      setFormData({
        ...editingCourt,
        duration_pricing: editingCourt.duration_pricing || {},
        custom_pricing: editingCourt.custom_pricing || {},
        available_durations: editingCourt.available_durations || [60],
        // Si no es un deporte de raqueta, asegurar que sea 'swimming' o 'racket'
        sport: ['racket', 'swimming'].includes(editingCourt.sport) ? 
          editingCourt.sport : 'racket'
      })
    } else {
      setFormData(defaultFormData)
    }
    setCurrentStep('court')
  }, [isOpen, editingCourt])

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false)
      setCurrentStep('court')
    }
  }, [isOpen])

  const isFirstStepValid = () => {
    if (formData.sport === 'swimming') {
      return formData.name.trim() !== ''
    }
    return formData.name.trim() !== '' && formData.available_durations.length > 0
  }

  const handleNext = () => {
    if (currentStep === 'court' && isFirstStepValid()) {
      if (isRacketSport) {
        setCurrentStep('pricing')
      } else {
        handleSave() // Para natación guardar directamente
      }
    }
  }

  const handleBack = () => {
    if (currentStep === 'pricing') {
      setCurrentStep('court')
    }
  }

  const handleSave = () => {
    if (!isFirstStepValid()) return

    // Asegurarse de que cada duración tenga un precio solo para deportes de raqueta
    let courtData = { ...formData }
    
    if (isRacketSport) {
      const duration_pricing = { ...formData.duration_pricing }
      formData.available_durations.forEach(duration => {
        const key = duration.toString()
        if (!(key in duration_pricing)) {
          duration_pricing[key] = 0
        }
      })
      courtData.duration_pricing = duration_pricing
    } else {
      // Para natación, establecer valores por defecto
      courtData = {
        ...courtData,
        available_durations: [60],
        duration_pricing: { '60': 0 },
        custom_pricing: {},
        features: []
      }
    }

    onSave(courtData)
  }

  const handleDelete = () => {
    if (editingCourt?.id && onDelete) {
      setShowDeleteConfirm(false)
      setTimeout(() => {
        onDelete(editingCourt.id)
        onClose()
      }, 200)
    }
  }

  const handleSurfaceChange = (value: SurfaceType) => {
    setFormData(prev => ({
      ...prev,
      surface: value
    }))
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      className="w-screen max-w-md"
    >
      <div className="flex h-full flex-col bg-white">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {mode === 'create' ? 'Agregar Nueva Pista' : 'Editar Pista'}
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {currentStep === 'court' 
              ? 'Configure los datos básicos de la pista'
              : 'Configure los precios de la pista'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentStep === 'court' ? (
              <motion.div
                key="court-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nombre de la pista
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pista Principal"
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Deporte
                    </label>
                    {mode === 'edit' ? (
                      // Campo de solo lectura para modo edición
                      <div className={cn(
                        "w-full px-3 py-2 rounded-lg border bg-gray-50",
                        "text-sm text-gray-700"
                      )}>
                        {sportOptions.find(option => option.id === formData.sport)?.name || formData.sport}
                      </div>
                    ) : (
                      // Selector normal para modo creación
                      <SingleSelect
                        value={formData.sport}
                        onChange={(value: any) => {
                          const sportValue = value as Court['sport'];
                          setFormData(prev => ({ 
                            ...prev, 
                            sport: sportValue,
                            // Reset features if cambia a natación
                            ...(sportValue === 'swimming' ? { features: [] } : {})
                          }));
                        }}
                        options={sportOptions}
                        placeholder="Seleccionar deporte"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Tipo de Pista
                    </label>
                    <SingleSelect
                      value={formData.court_type}
                      onChange={(value: any) => setFormData(prev => ({ ...prev, court_type: value as Court['court_type'] }))}
                      options={courtTypeOptions}
                      placeholder="Seleccionar tipo"
                    />
                  </div>
                </div>

                {/* Características de la Pista - Solo visible para deportes de raqueta */}
                {isRacketSport && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Características de la Pista
                    </label>
                    <CategoryMultiSelect
                      value={formData.features || []}
                      onChange={(features) => setFormData(prev => ({ ...prev, features }))}
                      categories={courtFeatures}
                      placeholder="Seleccionar características"
                    />
                  </div>
                )}

                {/* Duraciones disponibles - Solo visible para deportes de raqueta */}
                {isRacketSport && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Duraciones disponibles</h3>
                        {formData.available_durations.length > 0 && (
                          <button
                            onClick={() => setFormData(prev => ({ ...prev, available_durations: [] }))}
                            className={cn(
                              "text-xs text-gray-400",
                              "hover:text-gray-600",
                              "transition-colors duration-200",
                              "flex items-center gap-1"
                            )}
                          >
                            <span>Limpiar</span>
                          </button>
                        )}
                      </div>

                      {/* Duraciones predefinidas */}
                      <div className="flex flex-wrap gap-2">
                        {durationOptions.map((duration) => (
                          <button
                            key={duration}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                available_durations: prev.available_durations.includes(duration)
                                  ? prev.available_durations.filter(d => d !== duration)
                                  : [...prev.available_durations, duration].sort((a, b) => a - b)
                              }))
                            }}
                            className={cn(
                              "h-9 px-4 rounded-md text-sm transition-all duration-200",
                              "border hover:border-gray-400",
                              formData.available_durations.includes(duration)
                                ? "bg-gray-900 text-white border-transparent hover:bg-gray-800"
                                : "bg-white text-gray-700 border-gray-200"
                            )}
                          >
                            {duration} min
                          </button>
                        ))}
                      </div>

                      {/* Duración personalizada */}
                      <div className="space-y-1">
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Añadir duración personalizada"
                            value={newDuration || ''}
                            onChange={(e) => setNewDuration(parseInt(e.target.value) || null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newDuration) {
                                e.preventDefault()
                                // Validar que la duración sea válida
                                if (newDuration >= 1) {
                                  setFormData(prev => ({
                                    ...prev,
                                    available_durations: prev.available_durations.includes(newDuration)
                                      ? prev.available_durations
                                      : [...prev.available_durations, newDuration].sort((a, b) => a - b)
                                  }))
                                  setNewDuration(null) // Limpiar el input
                                }
                              }
                            }}
                            className={cn(
                              "w-full px-3 py-2 rounded-lg",
                              "border border-gray-200 bg-white",
                              "focus:outline-none focus:border-gray-300",
                              "transition-colors duration-200",
                              "placeholder:text-gray-400",
                              "text-sm",
                              "[appearance:textfield]",
                              "[&::-webkit-outer-spin-button]:appearance-none",
                              "[&::-webkit-inner-spin-button]:appearance-none",
                              "pr-12"
                            )}
                            min="1"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                            min
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 pl-1">
                          Presiona ENTER para agregar
                        </p>
                      </div>

                      {/* Duraciones seleccionadas */}
                      {formData.available_durations.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <span className="text-xs text-gray-500">
                            Duraciones seleccionadas
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {formData.available_durations.sort((a, b) => a - b).map((duration) => (
                              <div
                                key={duration}
                                className={cn(
                                  "group inline-flex items-center gap-1.5",
                                  "h-7 pl-2.5 pr-1.5 rounded-md",
                                  "bg-gray-50 text-gray-700 text-sm",
                                  "border border-gray-200",
                                  "transition-all duration-200"
                                )}
                              >
                                <span>{duration} min</span>
                                <button
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      available_durations: prev.available_durations.filter(d => d !== duration)
                                    }))
                                  }}
                                  className={cn(
                                    "w-4 h-4 rounded-sm",
                                    "inline-flex items-center justify-center",
                                    "text-gray-400 hover:text-gray-600",
                                    "transition-colors duration-200"
                                  )}
                                >
                                  <span className="sr-only">Eliminar</span>
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="p-6">
                <DurationPricing
                  durations={formData.available_durations}
                  pricing={formData.duration_pricing}
                  onChange={(pricing) => setFormData(prev => ({ ...prev, duration_pricing: pricing }))}
                />

                <div className="pt-6 border-t">
                  <CustomPricing
                    pricing={formData.custom_pricing}
                    onChange={(newCustomPricing) => setFormData(prev => ({
                      ...prev,
                      custom_pricing: newCustomPricing
                    }))}
                    basePricing={formData.duration_pricing}
                    availableDurations={formData.available_durations}
                  />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t bg-white">
          <div className="flex gap-3">
            {currentStep === 'pricing' ? (
              <>
                <button
                  onClick={handleBack}
                  className="flex-1 bg-transparent  text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
                >
                  {mode === 'create' ? 'Guardar' : 'Actualizar'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-sm font-normal bg-transparent text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNext}
                  disabled={!isFirstStepValid()}
                  className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                    isFirstStepValid()
                      ? 'bg-transparent text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-right'
                      : 'bg-transparent text-gray-500 cursor-not-allowed text-right'
                  }`}
                >
                  Siguiente
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <Modal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            className="w-full max-w-md"
            showOverlay={true}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Confirmar eliminación</h3>
              <p className="text-gray-500 mb-6">
                ¿Está seguro que desea eliminar esta pista? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </Modal>
  )
}