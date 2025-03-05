'use client'

import React, { createContext, useContext, useState, useEffect, useRef, Suspense, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { onboardingService } from '@/services/onboardingService'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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
  empresaId?: string;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <OnboardingProviderContent>
        {children}
      </OnboardingProviderContent>
    </Suspense>
  )
}

function OnboardingProviderContent({ children }: { children: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signOut } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false])
  const [formData, setFormData] = useState({})
  const [branches, setBranches] = useState<Branch[]>([])
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null)
  const [isStripeConnected, setIsStripeConnected] = useState(false)
  
  const steps = ['Empresa', 'Sedes', 'Integración', 'Planes']

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

  // Cargar el estado inicial del onboarding
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        if (!user) return

        const { data: empresa } = await supabase
          .from('empresas')
          .select('id, onboarding')
          .eq('auth_user_id', user.id)
          .single()

        if (!empresa) return

        // Si el onboarding está completo, marcar todos los pasos
        if (empresa.onboarding === 'Completo') {
          setCompletedSteps(steps.map(() => true))
          return
        }

        // Marcar los pasos completados según el estado actual
        const currentStepIndex = steps.findIndex(step => step === empresa.onboarding)
        if (currentStepIndex !== -1) {
          setCompletedSteps(prev => 
            prev.map((_, index) => index <= currentStepIndex)
          )
          // Actualizar el paso actual basado en el onboarding de la empresa
          setCurrentStep(currentStepIndex + 1)
        }
      } catch (error) {
        console.error('Error al cargar el estado del onboarding:', error)
      }
    }

    loadOnboardingState()
  }, [user, steps])

  const completeStep = async (step: number) => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      // Obtener el ID de la empresa
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!empresa) {
        throw new Error('No se encontró la empresa')
      }

      // Mapear el número de paso al valor correspondiente
      const stepValue = steps[step] as 'Empresa' | 'Sedes' | 'Integración' | 'Planes'

      // Actualizar el estado local
      setCompletedSteps(prev => {
        const newCompleted = [...prev]
        newCompleted[step] = true
        return newCompleted
      })

      // Si todos los pasos están completados, marcar como "Completo"
      const allStepsCompleted = completedSteps.every((step, index) => index === completedSteps.length - 1 || step)
      const onboardingStatus = allStepsCompleted ? 'Completo' : stepValue

      // Actualizar en la base de datos
      const { error } = await onboardingService.updateOnboardingStep(empresa.id, onboardingStatus)
      
      if (error) {
        throw error
      }

    } catch (error: any) {
      console.error('Error al completar el paso:', error)
      toast.error('Error al actualizar el progreso del onboarding')
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
    try {
      await completeStep(step)
      
      // Si es el último paso (Planes)
      if (step === steps.length - 1) {
        // 1. Actualizar el estado de onboarding a "Completo"
        if (user?.metadata?.empresa_id) {
          await onboardingService.updateOnboardingStep(
            user.metadata.empresa_id, 
            'Completo'
          )
        }

        // 2. Mostrar mensaje de éxito
        toast.success('Configuración completada. Por favor, inicia sesión nuevamente.')
        
        // 3. Pequeño delay para asegurar que los datos se guardaron
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 4. Cerrar sesión y redirigir
        await signOut()
        router.push('/admin/login')
        return
      }
      
      setCurrentStep(step + 1)
    } catch (error) {
      console.error('Error al completar y avanzar:', error)
      toast.error('Error al avanzar al siguiente paso')
    }
  }

  const updateFormData = (newData: any) => {
    setFormData(prev => ({ ...prev, ...newData }))
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
        isStripeConnected
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