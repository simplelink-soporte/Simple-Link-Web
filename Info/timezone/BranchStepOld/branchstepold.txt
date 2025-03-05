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
} from "@/components/ui/alert-dialog"
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CourtsList, type CourtData } from "./components/CourtsList"
import { ScheduleList, type ScheduleData } from "./components/ScheduleList"
import { SectionTitle } from "@/components/ui/section-title"
import { courtService } from "@/services/courtService"
import { supabase } from "@/lib/supabase"
import { onboardingBranchService } from '@/services/onboardingBranchService'
import { useAuth } from '@/contexts/AuthContext'

// Variantes de animación
const fadeInVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
}

const buttonVariants = {
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: {
    scale: 0.98
  }
}

// Datos iniciales
const initialSchedule: ScheduleData = {
  monday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  tuesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  wednesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  thursday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  friday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  saturday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  sunday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] }
}

const daysTranslations: { [key: string]: string } = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
}

interface BranchesStepProps {
  onReturnToSelection: () => void
}

// Función auxiliar para validar una pista
const isCourtValid = (court: CourtData) => {
  return (
    court.name.trim() !== '' &&
    court.sports.length > 0 &&
    court.type !== '' &&
    court.characteristics.length > 0 &&
    court.available_durations.length > 0 &&
    court.duration_pricing &&
    Object.keys(court.duration_pricing).length > 0 &&
    Object.values(court.duration_pricing).every(price => price !== '')
  )
}

// Componentes del input de teléfono
const PhoneInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        className={cn("-ms-px rounded-s-none shadow-none focus-visible:z-10", className)}
        ref={ref}
        {...props}
      />
    );
  },
);

PhoneInput.displayName = "PhoneInput";

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: { label: string; value: RPNInput.Country | undefined }[];
};

const CountrySelect = ({ disabled, value, onChange, options }: CountrySelectProps) => {
  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as RPNInput.Country);
  };

  return (
    <div className="relative inline-flex items-center self-stretch rounded-s-lg border border-input bg-background py-2 pe-2 ps-3 text-muted-foreground transition-shadow focus-within:z-10 focus-within:border-ring focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/20 hover:bg-accent hover:text-foreground has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50">
      <div className="inline-flex items-center gap-1" aria-hidden="true">
        <FlagComponent country={value} countryName={value} aria-hidden="true" />
      </div>
      <select
        disabled={disabled}
        value={value}
        onChange={handleSelect}
        className="absolute inset-0 text-sm opacity-0"
        aria-label="Select country"
      >
        <option key="default" value="">
          Seleccionar país
        </option>
        {options
          .filter((x) => x.value)
          .map((option, i) => (
            <option key={option.value ?? `empty-${i}`} value={option.value}>
              {option.label} {option.value && `+${RPNInput.getCountryCallingCode(option.value)}`}
            </option>
          ))}
      </select>
    </div>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="w-5 overflow-hidden rounded-sm">
      {Flag ? <Flag title={countryName} /> : <Phone size={16} aria-hidden="true" />}
    </span>
  );
};

// Interfaces
interface TimeRange {
  openTime: string;
  closeTime: string;
}

interface CustomPricing {
  [key: string]: {
    isSelected: boolean;
    timeRanges: Array<{
      startTime: string;
      endTime: string;
      percentage: number;
    }>;
  };
}

interface CourtFormData {
  id: string;
  name: string;
  sports: string[];
  type: string;
  characteristics: string[];
  available_durations: number[];
  duration_pricing: Record<string, number>;
  custom_pricing: CustomPricing;
  is_active: boolean;
}

interface BranchFormData {
  name: string
  address: string
  phone: string
  manager: string
  isActive: boolean
  schedule: ScheduleData
  courts: CourtData[]
}

// Mapeo de características de inglés a español
const featureMapEnToEs: Record<string, string> = {
  'wall-glass': 'cristal-estandar',
  'wall-panoramic': 'cristal-panoramico',
  'wall-concrete': 'muro-hormigon',
  'floor-synthetic': 'cesped-sintetico',
  'floor-clay': 'tierra-batida',
  'floor-concrete': 'hormigon-pulido',
  'floor-rubber': 'goma-profesional'
}

// Mapeo de características de español a inglés
const featureMapEsToEn: Record<string, string> = {
  'cristal-estandar': 'wall-glass',
  'cristal-panoramico': 'wall-panoramic',
  'muro-hormigon': 'wall-concrete',
  'cesped-sintetico': 'floor-synthetic',
  'tierra-batida': 'floor-clay',
  'hormigon-pulido': 'floor-concrete',
  'goma-profesional': 'floor-rubber'
}

// Mapeo de deportes
const sportMapping: Record<string, string> = {
  'tenis': 'tennis',
  'tennis': 'tennis',
  'padel': 'padel',
  'badminton': 'badminton',
  'squash': 'squash',
  'pickleball': 'pickleball'
}

// Función para validar y transformar el deporte
const validateSport = (sport: string): string => {
  const validSports = ['padel', 'tennis', 'badminton', 'squash', 'pickleball'];
  const mappedSport = sportMapping[sport.toLowerCase()] || sport.toLowerCase();
  return validSports.includes(mappedSport) ? mappedSport : 'padel';
}

// Tipos para la respuesta de la API
interface CourtResponse {
  id: string;
  name: string;
  sport: string;
  court_type: string;
  features: string[] | string;
  available_durations: number[] | string;
  duration_pricing: Record<string, number> | string;
  custom_pricing: CustomPricing | string;
  is_active: boolean;
}

interface BranchResponse {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager_id: string | null;
  is_active: boolean;
  opening_hours: Record<string, any> | string | null;
}

// Tipos para la tabla courts
type Sport = 'tennis' | 'padel' | 'badminton' | 'squash' | 'pickleball'
type CourtType = 'indoor' | 'outdoor' | 'covered'
type Surface = 'crystal' | 'synthetic' | 'clay' | 'concrete' | 'rubber' | 'premium' | 'grass' | 'panoramic'

interface CourtDataDB {
  id?: string
  name: string
  branch_id: string
  sport: Sport
  court_type: CourtType
  surface: Surface
  features: string[]
  is_active: boolean
  available_durations: number[]
  duration_pricing: Record<string, number>
  custom_pricing: Record<string, any>
  updated_at?: string
}

export function BranchesStep({ onReturnToSelection }: BranchesStepProps) {
  const { user } = useAuth()
  const { completeAndAdvance, currentBranchId, updateBranchData, branches, setBranches, setCurrentBranchId } = useOnboarding()
  const [isSuccess, setIsSuccess] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBranchSaved, setIsBranchSaved] = useState(false)
  const [formData, setFormData] = useState<BranchFormData>(() => {
    // Si hay un currentBranchId, buscar los datos guardados
    if (currentBranchId) {
      const branch = branches.find(b => b.id === currentBranchId)
      if (branch?.data) {
        return branch.data
      }
    }
    // Si no hay datos guardados, usar los valores iniciales
    return {
      name: '',
      address: '',
      phone: '',
      manager: '',
      isActive: true,
      schedule: {
        monday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
        tuesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
        wednesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
        thursday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
        friday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
        saturday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
        sunday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] }
      },
      courts: []
    }
  })

  // Efecto para cargar los datos de la sede si estamos en modo edición
  useEffect(() => {
    const loadBranchData = async () => {
      if (currentBranchId) {
        try {
          console.log('📍 Cargando datos de la sede:', currentBranchId)
          const { data: branchData, error } = await onboardingBranchService.getBranchById(currentBranchId)
          
          if (error) throw error
          if (!branchData) throw new Error('No se encontraron datos de la sede')

          // Actualizar el estado del formulario con los datos de la sede
          setFormData({
            name: branchData.name || '',
            address: branchData.address || '',
            phone: branchData.phone || '',
            manager: branchData.manager_id || '',
            isActive: branchData.is_active ?? true,
            schedule: branchData.opening_hours || initialSchedule,
            courts: (branchData.data?.courts || []).map(court => ({
              id: court.id,
              name: court.name,
              sports: court.sports,
              type: court.type,
              characteristics: court.characteristics,
              available_durations: court.durations.map(Number),
              duration_pricing: court.prices.reduce((acc, price) => {
                acc[price.duration] = Number(price.price)
                return acc
              }, {} as Record<string, number>),
              custom_pricing: court.prices.reduce((acc, price) => {
                if (price.timeRanges && price.timeRanges.length > 0) {
                  price.timeRanges.forEach(range => {
                    if (!acc[range.day]) {
                      acc[range.day] = {
                        isSelected: true,
                        timeRanges: []
                      }
                    }
                    acc[range.day].timeRanges.push({
                      startTime: range.start,
                      endTime: range.end,
                      percentage: Number(range.percentage)
                    })
                  })
                }
                return acc
              }, {} as Record<string, any>),
              is_active: true
            }))
          })

          setIsBranchSaved(true)
          
        } catch (error: any) {
          console.error('❌ Error al cargar los datos:', error)
          toast({
            title: "Error",
            description: error.message || "No se pudieron cargar los datos de la sede",
            variant: "destructive",
          })
        }
      }
    }

    loadBranchData()
  }, [currentBranchId])

  // Manejadores de eventos
  const handleInputChange = (field: keyof BranchFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleScheduleChange = (schedule: ScheduleData) => {
    setFormData(prev => ({
      ...prev,
      schedule
    }))
  }

  // Función para validar el formulario básico de la sede
  const isBasicFormValid = () => {
    return formData.name?.trim() !== '' &&
      formData.address?.trim() !== '' &&
      formData.phone?.trim() !== ''
  }

  // Función para validar la sección de pistas
  const isCourtsFormValid = () => {
    return formData.courts.length > 0
  }

  const handleSaveBranch = async () => {
    try {
      setIsSubmitting(true)
      
      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      // 1. Obtener el ID de la empresa
      const empresaId = await onboardingBranchService.getEmpresaIdByUserId(user.id)

      // 2. Preparar los datos de la sede
      const branchData = {
        name: formData.name.trim(),
        address: formData.address?.trim() || '',
        phone: formData.phone?.trim() || '',
        manager_id: formData.manager?.trim() || '',
        is_active: formData.isActive,
        opening_hours: formData.schedule,
        empresa_id: empresaId,
        organization_id: empresaId
      }

      console.log('📍 Datos a guardar:', branchData)

      let response: any

      // 3. Actualizar o crear la sede
      if (currentBranchId) {
        const { data, error } = await supabase
          .from('sedes')
          .update({
            ...branchData,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentBranchId)
          .select()
          .single()

        if (error) throw error
        response = { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('sedes')
          .insert([{
            ...branchData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error
        response = { data, error: null }
        
        // Actualizar el currentBranchId con el ID de la nueva sede
        setCurrentBranchId(response.data.id)
      }

      // 4. Actualizar el estado local
      if (response.data) {
        setIsBranchSaved(true)
        
        // Actualizar la lista de sedes en el contexto
        setBranches(prev => {
          const updatedBranches = currentBranchId
            ? prev.map(b => b.id === currentBranchId ? { 
                ...b, 
                data: { 
                  ...formData,
                  id: currentBranchId
                } 
              } : b)
            : [...prev, { 
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
      }

    } catch (error: any) {
      console.error('Error al guardar la sede:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la sede",
        variant: "destructive",
      })
      setIsBranchSaved(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinish = async () => {
    try {
      setIsSubmitting(true)

      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      // Verificar que la sede esté guardada y tengamos su ID
      if (!isBranchSaved || !currentBranchId) {
        throw new Error('No se ha guardado la sede. Por favor, guarda la sede primero.')
      }

      // Verificar que haya pistas para guardar
      if (!formData.courts || formData.courts.length === 0) {
        throw new Error('Debes agregar al menos una pista')
      }

      // 1. Procesar las canchas con el ID de sede correcto
      for (const court of formData.courts) {
        try {
          const courtData: CourtDataDB = {
            name: court.name,
            sport: (court.sports[0] || 'padel') as Sport,
            court_type: (court.type === 'interior' ? 'indoor' : 
                        court.type === 'exterior' ? 'outdoor' : 'covered') as CourtType,
            features: court.characteristics,
            surface: 'synthetic' as Surface,
            available_durations: court.available_durations,
            duration_pricing: court.duration_pricing,
            custom_pricing: court.custom_pricing,
            branch_id: currentBranchId,
            is_active: court.is_active,
            updated_at: new Date().toISOString()
          }

          console.log('📍 Datos de la cancha a guardar:', courtData)

          if (court.id && !court.id.startsWith('court-')) {
            const { error: updateError } = await supabase
              .from('courts')
              .update(courtData)
              .eq('id', court.id)

            if (updateError) throw updateError
          } else {
            const { error: insertError } = await supabase
              .from('courts')
              .insert([courtData])

            if (insertError) throw insertError
          }
        } catch (error: any) {
          console.error('❌ Error al procesar la cancha:', error)
          throw new Error(`Error al ${court.id && !court.id.startsWith('court-') ? 'actualizar' : 'crear'} la cancha ${court.name}`)
        }
      }

      toast({
        title: "¡Éxito!",
        description: "Canchas guardadas correctamente"
      })
      
      // Volvemos a la selección de sedes
      onReturnToSelection()
    } catch (error: any) {
      console.error('❌ Error al guardar las canchas:', error)
      toast({
        title: "Error",
        description: error.message || 'Error al guardar los cambios',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasUnsavedChanges = () => {
    if (!currentBranchId) {
      // Si es una nueva sede, verificar si hay datos ingresados
      return formData.name !== '' || 
             formData.address !== '' || 
             formData.phone !== '' || 
             formData.manager !== '' ||
             formData.courts.length > 0
    }
    
    // Si es una sede existente, comparar con los datos originales
    const currentBranch = branches.find(b => b.id === currentBranchId)
    if (!currentBranch?.data) return false
    
    return JSON.stringify(currentBranch.data) !== JSON.stringify(formData)
  }

  const handleReturn = () => {
    if (hasUnsavedChanges()) {
      setShowExitDialog(true)
    } else {
      onReturnToSelection()
    }
  }

  return (
    <motion.div
      className="p-6"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeInVariants}
    >
      <div className="relative">
        <div className="max-w-5xl mx-auto w-full px-8 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReturn}
            className="text-gray-600 hover:text-gray-900 -ml-2 h-8 text-sm"
          >
            Volver
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/80 to-transparent" />
      </div>

      <div className={cn(
        "max-w-5xl mx-auto flex-1 overflow-y-auto px-8",
        "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100",
        "scrollbar-thumb-rounded-md hover:scrollbar-thumb-gray-400"
      )}>
        {/* Sección 1: Información básica y horarios */}
        <div className="space-y-8 py-8">
        <div className="space-y-2 mb-0">
          <h2 className="text-xl font-medium">Información de la sede</h2>
          <p className="text-sm text-gray-500">
            Completa los datos básicos de tu sede
          </p>
        </div>

          {/* Campos del formulario básico */}
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-sm">Nombre de la sede</Label>
              <Input
                id="name"
                placeholder="Ej: Club Deportivo Central"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="address" className="text-sm">Dirección</Label>
              <Input
                id="address"
                placeholder="Ej: Calle Principal 123"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="phone" className="text-sm">Teléfono</Label>
                <RPNInput.default
                  className="flex rounded-lg shadow-sm shadow-black/5"
                  international
                  flagComponent={FlagComponent}
                  countrySelectComponent={CountrySelect}
                  inputComponent={PhoneInput}
                  id="phone"
                  placeholder="Ingresa el número de teléfono"
                  value={formData.phone}
                  onChange={(value: string | undefined) => handleInputChange('phone', value || '')}
                  defaultCountry="ES"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="manager" className="text-sm">Encargado</Label>
                <Input
                  id="manager"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={formData.manager}
                  onChange={(e) => handleInputChange('manager', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Horarios */}
          <div className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Horarios de apertura</h3>
          <ScheduleList 
            schedule={formData.schedule}
            onScheduleChange={handleScheduleChange}
          />
            </div>
          </div>

          {/* Botón Guardar para la primera sección */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={handleSaveBranch}
              disabled={!isBasicFormValid() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Guardar Sede
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t my-8" />

        {/* Sección 2: Pistas */}
        <div className={cn(
          "space-y-8 py-8",
          !isBranchSaved && !currentBranchId && "opacity-50 pointer-events-none"
        )}>
          <div className="space-y-2">
            <h2 className="text-xl font-medium">Configuración de Pistas</h2>
            <p className="text-sm text-gray-500">
              {isBranchSaved || currentBranchId
                ? "Configura las pistas disponibles en tu sede" 
                : "Guarda la información básica de la sede para configurar las pistas"}
            </p>
          </div>

          {/* Lista de pistas */}
          <CourtsList 
            courts={formData.courts}
            onCourtsChange={(courts) => setFormData(prev => ({ ...prev, courts }))}
          />

          {/* Botón Finalizar */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={handleFinish}
              disabled={!isBranchSaved || !isCourtsFormValid()}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Finalizar
            </Button>
          </div>
        </div>
      </div>

          {/* Diálogo de confirmación de salida */}
          <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de salir?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tienes cambios sin guardar. Si sales ahora, perderás todos los cambios realizados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowExitDialog(false)
                    onReturnToSelection()
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Salir sin guardar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Mensaje de éxito */}
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg"
            >
              ¡Sede guardada con éxito!
            </motion.div>
          )}
    </motion.div>
  )
} 