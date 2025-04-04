'use client'

import React, { createContext, useContext, useState, useEffect, useRef, Suspense, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { onboardingService } from '@/services/onboardingService'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formPublishService } from "@/lib/services/forms/publish-service";
import { invalidateOnboardingCache } from '@/hooks/useOnboardingStatus'

interface OnboardingContextType {
  currentStep: number
  setCurrentStep: (step: number) => void
  steps: string[]
  completedSteps: boolean[]
  completeStep: (step: number) => void
  canAccessStep: (step: number) => boolean
  completeAndAdvance: (step: number) => void
  formData: any
  updateFormData: (data: any) => void
  branches: Branch[]
  setBranches: (branches: Branch[]) => void
  currentBranchId: string | null
  setCurrentBranchId: (id: string | null) => void
  updateBranchData: (branchId: string, data: any) => void
  isStripeConnected: boolean
  generatedLink: string | null
  isGeneratingLink: boolean
}

interface Branch {
  id: string
  name: string
  courts?: number
  schedule?: {
    open: string
    close: string
  }
  data?: {
    id?: string
    name: string
    address: string
    phone: string
    manager: string
    isActive: boolean
    opening_hours: Record<string, any>
    courts: Array<{
      id: string
      name: string
      sports: string[]
      type: string
      characteristics: string[]
      durations: string[]
      prices: Array<{
        duration: string
        price: string
        timeRanges: Array<{
          day: string
          start: string
          end: string
          percentage: string
        }>
      }>
    }>
  }
}

interface FormData {
  empresaId?: string
  nombre?: string
  businessName?: string
  primaryColor?: string
  publicFormUrl?: string
  country?: string | null
  [key: string]: any // Para permitir propiedades adicionales
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ 
  children,
  empresaId
}: { 
  children: React.ReactNode
  empresaId?: string | null 
}) {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <OnboardingProviderContent empresaId={empresaId}>
        {children}
      </OnboardingProviderContent>
    </Suspense>
  )
}

function OnboardingProviderContent({ 
  children, 
  empresaId
}: { 
  children: ReactNode
  empresaId?: string | null 
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signOut } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false])
  const [formData, setFormData] = useState<FormData>({})
  const [branches, setBranches] = useState<Branch[]>([])
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null)
  const [isStripeConnected, setIsStripeConnected] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  
  const steps = ['Empresa', 'Sedes', 'Integración', 'Planes']

  // Referencias para evitar operaciones duplicadas
  const loadingState = useRef(false)
  const completingStep = useRef(false)
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null)

  // Cargar estado desde localStorage al iniciar
  useEffect(() => {
    const savedState = localStorage.getItem('onboardingState')
    if (savedState) {
      const { 
        completedSteps: savedCompletedSteps, 
        formData: savedFormData,
        isStripeConnected: savedStripeConnected 
      } = JSON.parse(savedState)
      setCompletedSteps(savedCompletedSteps)
      setFormData(savedFormData)
      setIsStripeConnected(savedStripeConnected || false)
    }
  }, [])

  // Manejar parámetros de URL al volver de Stripe
  useEffect(() => {
    const handleStripeCallback = async () => {
      const success = searchParams.get('success')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (success === 'true') {
        setIsStripeConnected(true)
      }
      
      // Si hay parámetros de Stripe, limpiar la URL
      if (success || error) {
        router.replace('/admin/onboarding')
      }
    }

    handleStripeCallback()
  }, [searchParams])

  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('onboardingState', JSON.stringify({
      completedSteps,
      formData,
      isStripeConnected
    }))
  }, [completedSteps, formData, isStripeConnected])

  // Implementación del useEffect para evitar refetch innecesarios
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        if (!user) return

        // Si no hay ID de empresa, intentar obtenerlo
        let empresaData
        
        // Primero verificar si ya tenemos el ID en formData
        if (formData.empresaId) {
          console.log('ℹ️ Usando empresaId existente:', formData.empresaId)
          // Si ya tenemos el ID de empresa en formData, usar directamente ese ID
          try {
            const { data } = await supabase
              .from('empresas')
              .select('id, onboarding, business_name, name, country')
              .eq('id', formData.empresaId)
              .maybeSingle()
            
            empresaData = data
          } catch (e) {
            console.warn('Error al consultar por formData.empresaId:', e)
          }
        }
        
        // Si no se pudo obtener por ID, intentar por user_id
        if (!empresaData && user.id) {
          console.log('ℹ️ Buscando empresa por user_id...')
          // Verificar si hay alguna consulta en progreso
          if (loadingState.current) {
            console.log('⏳ Ya hay una carga en progreso, omitiendo')
            return
          }
          
          loadingState.current = true
          
          try {
            const { data } = await supabase
              .from('empresas')
              .select('id, onboarding, business_name, name, country')
              .eq('auth_user_id', user.id)
              .maybeSingle()
            
            empresaData = data
          } catch (e) {
            console.error('Error al buscar empresa por user_id:', e)
          } finally {
            loadingState.current = false
          }
        }

        if (!empresaData) {
          console.log('ℹ️ No se encontró empresa para este usuario')
          return
        }

        // Actualizar formData con el ID de la empresa si no lo tenemos
        if (empresaData.id && !formData.empresaId) {
          console.log('✅ Actualizando formData con empresaId:', empresaData.id)
          setFormData(prev => ({
            ...prev,
            empresaId: empresaData.id,
            nombre: formData.nombre || empresaData.name,
            businessName: empresaData.business_name || empresaData.name,
            country: empresaData.country || null // Guardar el país en el contexto
          }))
        } else if (empresaData.id) {
          // Si ya tenemos el ID pero no el business_name o el country, actualizarlos
          if (!formData.businessName || !formData.country) {
            setFormData(prev => ({
              ...prev,
              businessName: prev.businessName || empresaData.business_name || empresaData.name,
              nombre: prev.nombre || empresaData.name,
              country: prev.country || empresaData.country || null
            }))
          }
        }

        // Evitar actualizaciones innecesarias comparando con el estado actual
        const currentStepIndex = steps.findIndex(step => step === empresaData.onboarding)
        const isCompleted = empresaData.onboarding === 'Completo'
        
        // Si el estado ya está correctamente configurado, salir
        if (isCompleted && completedSteps.every(step => step === true)) {
          console.log('⏭️ Todos los pasos ya están marcados como completados')
          return
        }
        
        if (currentStepIndex !== -1 && 
            completedSteps.every((complete, idx) => idx <= currentStepIndex ? complete : !complete) && 
            currentStep === currentStepIndex + 1) {
          console.log('⏭️ Estado de pasos ya está actualizado correctamente')
          return
        }

        // Si el onboarding está completo, marcar todos los pasos
        if (isCompleted) {
          console.log('✅ Marcando todos los pasos como completados')
          setCompletedSteps(steps.map(() => true))
          return
        }

        // Marcar los pasos completados según el estado actual
        if (currentStepIndex !== -1) {
          console.log(`✅ Actualizando pasos completados hasta ${currentStepIndex}`)
          setCompletedSteps(prev => 
            prev.map((_, index) => index <= currentStepIndex)
          )
          // Actualizar el paso actual si es necesario
          if (currentStep !== currentStepIndex + 1) {
            console.log(`✅ Actualizando paso actual a ${currentStepIndex + 1}`)
            setCurrentStep(currentStepIndex + 1)
          }
        }
      } catch (error) {
        console.error('Error al cargar el estado del onboarding:', error)
      }
    }

    // Usar un setTimeout para evitar múltiples cargas en sucesión rápida
    const timerId = setTimeout(() => {
      loadOnboardingState()
    }, 300)

    return () => clearTimeout(timerId)
  }, [user, steps, formData.empresaId, completedSteps, currentStep])

  // Optimizar completeStep para reducir consultas
  const completeStep = async (step: number) => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      // Obtener el ID de la empresa del formData si está disponible
      let empresa_id = formData.empresaId
      
      // Si no está en formData, buscarlo en la base de datos
      if (!empresa_id) {
        // Evitar consultas simultáneas
        if (completingStep.current) {
          console.log('⏳ Ya hay una actualización de paso en progreso')
          return
        }
        
        completingStep.current = true
        
        try {
          const { data: empresa } = await supabase
            .from('empresas')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle()

          if (!empresa) {
            throw new Error('No se encontró la empresa')
          }
          
          empresa_id = empresa.id
          
          // Actualizar formData con el ID encontrado
          setFormData(prev => ({
            ...prev,
            empresaId: empresa_id
          }))
        } finally {
          completingStep.current = false
        }
      }

      // Determinar el estado del onboarding basado en el paso actual
      let onboardingStatus
      
      if (step === steps.length - 1) {
        // Si es el último paso (Planes), no marcarlo como Completo todavía
        // Mantenerlo como el nombre del paso actual
        onboardingStatus = steps[step]
      } else {
        // Si no, usar el nombre del siguiente paso
        onboardingStatus = steps[step]
      }
      
      console.log(`📍 Actualizando paso del onboarding: {empresaId: '${empresa_id}', step: '${onboardingStatus}'}`)

      // Actualizar en la base de datos
      const { error } = await onboardingService.updateOnboardingStep(empresa_id, onboardingStatus)
      
      if (error) {
        throw error
      }

      console.log('✅ Paso del onboarding actualizado')
      
      // No necesitamos invalidar caché aquí, ya lo hacemos en completeAndAdvance
      
      return { success: true }
    } catch (error) {
      console.error('Error al completar paso del onboarding:', error)
      return { success: false, error }
    }
  }

  const canAccessStep = (step: number) => {
    // Si el paso está completado, no se puede acceder
    if (completedSteps[step]) return false
    
    // Si es el primer paso
    if (step === 0) return !isStripeConnected
    
    // Para los pasos intermedios (Sucursales e Integraciones)
    if (step === 1 || step === 2) {
      return !isStripeConnected && completedSteps[step - 1] && !completedSteps[step]
    }
    
    // Para el último paso (Planes)
    return completedSteps[step - 1] && !completedSteps[step]
  }

  const completeAndAdvance = async (step: number) => {
    // Evitar múltiples llamadas simultáneas
    if (throttleTimeout.current) {
      console.log('⏳ Operación en curso, omitiendo solicitud')
      return
    }

    // Establecer un tiempo mínimo entre operaciones
    throttleTimeout.current = setTimeout(() => {
      throttleTimeout.current = null
    }, 2000)
    
    // Si estamos completando el último paso (Planes), generar el link si hay Stripe conectado
    if (step === steps.length - 1) {
      try {
        setIsGeneratingLink(true);
        
        // Asegurarse de que tenemos los datos necesarios
        if (!formData.empresaId) {
          console.error('No se encontró el ID de la empresa');
          setIsGeneratingLink(false);
          // Continuamos con el avance aunque no se pueda generar el link
        } else {
          // Modificado: Generamos el enlace independientemente de si hay Stripe conectado o no
          console.log(`${isStripeConnected ? 'Usuario con Stripe conectado' : 'Usuario sin Stripe conectado'}. Generando enlace de reservas.`);
          
          // Preparar los datos del formulario para la publicación
          const publishData = {
            empresa_id: formData.empresaId,
            title: `Reservas ${formData.nombre || 'Sin nombre'}`,
            description: `Realiza tu reserva en ${formData.nombre || 'nuestra instalación'}`,
            business_name: formData.businessName || formData.nombre || 'Sin nombre',
            // Pasar el país desde el contexto
            country: formData.country,
            // Usar una plantilla básica o tomar campos desde los datos guardados
            fields: [], // Esto se llenará con campos por defecto en el servicio
            theme: {
              mode: 'light',
              primary_color: formData.primaryColor || '#000000'
            },
            // Configuración de métodos de pago según si tiene Stripe o no
            settings: {
              paymentMethods: {
                available: isStripeConnected 
                  ? ["garantia", "sena", "completo", "local"] 
                  : ["local"], // Solo local si no hay Stripe
                percentages: isStripeConnected
                  ? {
                      sena: 30,
                      garantia: 30
                    }
                  : {}
              }
            }
          };
          
          console.log(`🌍 País de la empresa en onboarding: ${formData.country || 'No disponible'}`);
          
          // Llamar al servicio para publicar el formulario
          const url = await formPublishService.publish(publishData);
          setGeneratedLink(url);
          
          // También puedes guardar esto en el formData para persistencia
          setFormData((prev: FormData) => ({
            ...prev,
            publicFormUrl: url
          }));
        }
      } catch (error) {
        console.error('Error al generar el enlace del formulario:', error);
        // Continuamos con el avance aunque haya error
      } finally {
        setIsGeneratingLink(false);
      }
    }
    
    try {
      console.log(`🔄 Completando y avanzando paso ${step}`)
      
      // Primero completar el paso actual
      const result = await completeStep(step)
      
      if (!result?.success) {
        throw new Error('Error al completar el paso')
      }
      
      // Invalidar caché para forzar una actualización de los datos
      invalidateOnboardingCache()
      
      // Luego actualizar el estado local para efectos inmediatos de UI
      const newCompleted = [...completedSteps]
      newCompleted[step] = true
      
      // Verificar si no estamos haciendo una actualización redundante
      if (!completedSteps[step]) {
        setCompletedSteps(newCompleted)
      }
      
      // Finalmente avanzar al siguiente paso
      if (step < steps.length - 1) {
        setCurrentStep(step + 1)
      }
      
      console.log(`✅ Paso ${step} completado, avanzando al siguiente`)
    } catch (error) {
      console.error('Error al completar y avanzar:', error)
      toast.error('Error al avanzar al siguiente paso')
    } finally {
      // Limpiar el timeout si existe
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current)
        throttleTimeout.current = null
      }
    }
  }

  const updateFormData = (newData: any) => {
    setFormData((prev: FormData) => ({ ...prev, ...newData }))
  }

  const updateBranchData = (branchId: string, data: any) => {
    setBranches(prev => prev.map(branch => 
      branch.id === branchId 
        ? { ...branch, data: { ...branch.data, ...data } }
        : branch
    ))
  }

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        steps,
        completedSteps,
        completeStep,
        canAccessStep,
        completeAndAdvance,
        formData,
        updateFormData,
        branches,
        setBranches,
        currentBranchId,
        setCurrentBranchId,
        updateBranchData,
        isStripeConnected,
        generatedLink,
        isGeneratingLink
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
} 