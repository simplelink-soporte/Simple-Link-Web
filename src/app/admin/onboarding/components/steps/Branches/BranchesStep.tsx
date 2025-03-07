'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ArrowLeft, Check, Trash2, Plus, Phone } from "lucide-react"
import { useOnboarding } from "../../../context/OnboardingContext"
import { useState, useEffect } from "react"
import * as RPNInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import 'react-phone-number-input/style.css'
import { branchService } from "@/services/branchService"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"
import { onboardingBranchService } from '@/services/onboardingBranchService'
import { useAuth } from '@/contexts/AuthContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SingleSelect } from "@/components/ui/single-select"
import { ArrowRight } from "lucide-react"

// Componentes
import { BranchBasicInfo } from './components/BranchBasicInfo'
import { ScheduleList } from './components/ScheduleList'
import { CourtsList } from './components/CourtsList'
import { StepIndicator } from './components/StepIndicator'
import { StepNavigation } from './components/StepNavigation'
import { StepHeader } from './components/StepHeader'

// Tipos
import { BranchesStepProps, BranchFormData, ScheduleData, CourtData } from './types'

// Hooks personalizados
import { useBranchData } from './hooks/useBranchData'

// Constantes
import { initialSchedule, fadeInVariants } from './constants'

// Función auxiliar para validar una pista
const isCourtValid = (court: CourtData) => {
  return (
    court.name?.trim() !== '' &&
    court.sports.length > 0 &&
    court.type?.trim() !== '' &&
    court.available_durations.length > 0 &&
    court.duration_pricing &&
    Object.keys(court.duration_pricing).length > 0 &&
    Object.values(court.duration_pricing).every(price => price > 0)
  )
}

// Componente PhoneInput personalizado
const PhoneInput = ({ className, ...rest }: { className?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} {...rest} />
)

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: { label: string; value: RPNInput.Country | undefined }[];
};

const CountrySelect = ({ disabled, value, onChange, options }: CountrySelectProps) => {
  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value || undefined;
    onChange(newValue as RPNInput.Country);
  };

  return (
    <select
      disabled={disabled}
      value={value}
      onChange={handleSelect}
      className="absolute inset-0 opacity-0 cursor-pointer"
    >
      {options.map(({ value, label }) => (
        <option key={label} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country as keyof typeof flags];
  return (
    <span className="inline-flex items-center justify-center w-6 mx-1">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

export function BranchesStep({ onReturnToSelection }: BranchesStepProps) {
  const { user } = useAuth()
  const { 
    completeAndAdvance, 
    currentBranchId, 
    branches, 
    setBranches, 
    setCurrentBranchId,
    formData: contextFormData
  } = useOnboarding()
  
  // Estados
  const [currentStep, setCurrentStep] = React.useState(1)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Usar el hook personalizado para cargar los datos de la sede
  const { 
    loading: loadingBranchData, 
    error: branchError,
    branchData: loadedBranchData,
    isBranchSaved,
    setIsBranchSaved
  } = useBranchData(currentBranchId || undefined, initialSchedule);
  
  // Estado del formulario 
  const [formData, setFormData] = React.useState<BranchFormData>(() => {
    if (currentBranchId) {
      const branch = branches.find(b => b.id === currentBranchId)
      if (branch?.data) {
        return branch.data as BranchFormData
      }
    }
    
    return {
      name: '',
      address: '',
      phone: '',
      manager: '',
      isActive: true,
      timezone: 'Europe/Madrid',
      schedule: initialSchedule,
      courts: []
    }
  });
  
  // Actualizar el formulario cuando se cargan los datos de la sede
  useEffect(() => {
    if (loadedBranchData) {
      setFormData(loadedBranchData);
    }
  }, [loadedBranchData]);

  // Manejadores de eventos
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleScheduleChange = (schedule: ScheduleData) => {
    setFormData(prev => ({
      ...prev,
      schedule
    }))
  }

  // Funciones de validación
  const isBasicFormValid = () => {
    return formData.name?.trim() !== '' &&
      formData.address?.trim() !== '' &&
      formData.phone?.trim() !== ''
  }

  const isScheduleFormValid = () => {
    return true // Los horarios ya tienen valores por defecto válidos
  }

  const isCourtsFormValid = () => {
    return formData.courts.length > 0
  }

  // Navegación entre pasos
  const goToNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    } else {
      handleReturn()
    }
  }

  // Función para guardar la sede
  const handleSaveBranch = async () => {
    try {
      setIsSubmitting(true)
      
      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      // Obtener el ID de la empresa del contextFormData o usar el valor por defecto
      let empresaId = contextFormData?.empresaId;
      
      // Si no hay empresaId en el contexto, intentar usar el ID de empresa por defecto
      if (!empresaId) {
        empresaId = process.env.NEXT_PUBLIC_DEFAULT_EMPRESA_ID;
      }
      
      if (!empresaId) {
        console.error('No se pudo obtener el ID de empresa del contexto ni de las variables de entorno');
        throw new Error('No se pudo obtener el ID de la empresa');
      }
      
      console.log('Usando empresa_id:', empresaId);

      // Crear el objeto opening_hours correctamente como un JSON serializado
      const opening_hours_obj = {
        schedule: Object.entries(formData.schedule).reduce((acc: Record<string, any>, [day, dayData]) => {
          // Asegurarnos de que dayData tenga la estructura correcta
          const typedDayData = dayData as {
            isOpen: boolean;
            timeRanges: Array<{ openTime: string; closeTime: string }>;
          };
          
          acc[day] = {
            isOpen: typedDayData.isOpen,
            timeRanges: typedDayData.timeRanges.map((range) => ({
              openTime: range.openTime,
              closeTime: range.closeTime
            }))
          };
          return acc;
        }, {}),
        timezone: formData.timezone
      };

      // Preparar los datos para guardar con todos los campos requeridos
      const branchData = {
        name: formData.name.trim(), // Campo obligatorio
        address: formData.address?.trim() || '',
        phone: formData.phone?.trim() || '',
        manager_id: formData.manager?.trim() || '',
        is_active: formData.isActive,
        timezone: formData.timezone, // Campo obligatorio
        opening_hours: opening_hours_obj, // El tipo JSONB acepta objetos directamente en Supabase
        empresa_id: empresaId, // Campo obligatorio
        organization_id: empresaId
      }

      console.log('Datos a guardar:', branchData)

      let response: any

      // Actualizar o crear la sede
      if (currentBranchId) {
        // Actualizar sede existente
        const { data, error } = await supabase
          .from('sedes')
          .update({
            ...branchData,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentBranchId)
          .select('*')
          .single()

        if (error) {
          console.error('Error al actualizar sede:', error)
          throw error
        }
        
        response = { data, error: null }
      } else {
        // Crear nueva sede - importante no incluir id ya que se genera automáticamente
        const { data, error } = await supabase
          .from('sedes')
          .insert([{
            ...branchData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select('*')
          .single()

        if (error) {
          console.error('Error al crear sede:', error)
          throw error
        }
        
        response = { data, error: null }

        // Actualizar el currentBranchId con el ID de la nueva sede
        if (response.data && response.data.id) {
          setCurrentBranchId(response.data.id)
        } else {
          throw new Error('No se recibió el ID de la sede creada')
        }
      }

      // Actualizar el estado local
      if (response.data) {
        setIsBranchSaved(true)
        
        // Actualizar la lista de sedes en el contexto
        setBranches((prevBranches) => {
          const updatedBranches = currentBranchId
            ? prevBranches.map((branch) => branch.id === currentBranchId ? { 
                ...branch, 
                data: { 
                  ...formData,
                  id: currentBranchId
                } 
              } : branch)
            : [...prevBranches, { 
                id: response.data.id, 
                name: response.data.name,
                data: { 
                  ...formData,
                  id: response.data.id
                } 
              }]

          return updatedBranches
        })

        // Mostrar mensaje de éxito
        toast({
          title: "¡Éxito!",
          description: "Sede guardada correctamente. Ahora puedes configurar las pistas."
        })
        
        // Avanzar al paso de configuración de pistas
        setCurrentStep(3)
      } else {
        throw new Error('No se recibieron datos de la sede guardada')
      }
      
    } catch (error: any) {
      console.error('Error al guardar la sede:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la sede",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para finalizar el proceso
  const handleFinish = async () => {
    try {
      setIsSubmitting(true)

      // Actualizar los datos de la sede en el contexto
      setBranches((prevBranches) => {
        return prevBranches.map((branch) => 
          branch.id === currentBranchId 
            ? { ...branch, data: { ...formData } } 
            : branch
        )
      })

      // Marcar como completado
      if (completeAndAdvance) {
        completeAndAdvance(2) // Usando número en lugar de string
      }
      
      toast({
        title: "¡Completado!",
        description: "Has completado la configuración de la sede y sus pistas."
      })
      
    } catch (error: any) {
      console.error('Error al finalizar:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo finalizar el proceso",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para volver a la selección de pasos
  const handleReturn = () => {
    onReturnToSelection()
  }

  // Obtener información del paso actual
  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return {
          title: "Información de la sede",
          description: "Completa los datos básicos de tu sede"
        }
      case 2:
        return {
          title: "Horarios de apertura",
          description: "Configura los horarios de funcionamiento"
        }
      case 3:
        return {
          title: "Configuración de pistas",
          description: isBranchSaved || currentBranchId
            ? "Configura las pistas disponibles en tu sede" 
            : "Guarda la información básica de la sede para configurar las pistas"
        }
      default:
        return {
          title: "Información de la sede",
          description: "Completa los datos básicos de tu sede"
        }
    }
  }

  const { title, description } = getStepInfo()

  // Mostrar indicador de carga mientras se cargan los datos
  if (currentBranchId && loadingBranchData) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-sm text-gray-500">Cargando datos de la sede...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-2 md:p-6"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeInVariants}
    >
      {/* Encabezado y Navegación */}
      <StepHeader 
        title={title}
        description={description}
        onBack={goToPreviousStep}
      />

      {/* Indicador de pasos */}
      <StepIndicator currentStep={currentStep} />

      <div className={cn(
        "max-w-5xl mx-auto flex-1 overflow-y-auto px-2 md:px-8",
        "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100",
        "scrollbar-thumb-rounded-md hover:scrollbar-thumb-gray-400"
      )}>
        <div className="space-y-8 py-4 md:py-8">
          {/* Paso 1: Información básica */}
          {currentStep === 1 && (
            <BranchBasicInfo 
              data={{
                name: formData.name,
                address: formData.address,
                phone: formData.phone,
                manager: formData.manager,
                isActive: formData.isActive,
                timezone: formData.timezone
              }}
              onChange={handleInputChange}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Paso 2: Horarios */}
          {currentStep === 2 && (
            <ScheduleList 
              schedule={formData.schedule}
              onScheduleChange={handleScheduleChange}
            />
          )}

          {/* Paso 3: Pistas */}
          {currentStep === 3 && (
            <div className={cn(
              !isBranchSaved && !currentBranchId && "opacity-50 pointer-events-none"
            )}>
              <CourtsList 
                courts={formData.courts}
                onCourtsChange={(courts) => setFormData(prev => ({ ...prev, courts } as BranchFormData))}
              />
            </div>
          )}

          {/* Botones de navegación */}
          <StepNavigation 
            currentStep={currentStep}
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
            onSave={handleSaveBranch}
            onFinish={handleFinish}
            isNextDisabled={!isBasicFormValid()}
            isSaveDisabled={!isBasicFormValid() || !isScheduleFormValid()}
            isFinishDisabled={!isCourtsFormValid()}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </motion.div>
  )
} 