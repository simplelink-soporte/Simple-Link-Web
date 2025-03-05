"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { toast } from "sonner"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ModalFooter } from "../NewBookingModal/components/ModalFooter"
import { ModalHeader } from "./components/ModalHeader"
import { PackageDetails } from "./components/PackageDetails"
import { PackagePaymentMethods } from "./components/PackagePaymentMethods"
import { PackageConfirmationStep } from "./components/PackageConfirmationStep"
import type { PackageStep, PackageDetails as IPackageDetails, PackagePaymentConfig, PackageFormData } from "./types"
import { useCurrentEmpresa } from "@/hooks/useCurrentEmpresa"
import { useBranches } from "@/hooks/useBranches"

interface NewPackageModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NewPackageModal({ isOpen, onClose }: NewPackageModalProps) {
  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState<PackageStep>('package-details')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const { empresa } = useCurrentEmpresa()
  const { currentBranch } = useBranches()

  const [packageDetails, setPackageDetails] = useState<IPackageDetails>({
    name: '',
    classCount: 1,
    price: 0,
    expirationDays: 30,
    advanceBookingDays: 7,
    branchIds: currentBranch ? [currentBranch.id] : [],
    includePrivateClasses: false,
    tag: null
  })
  const [packagePayment, setPackagePayment] = useState<PackagePaymentConfig>({
    paymentMethods: []
  })

  // Manejar montaje/desmontaje
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reiniciar el estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('package-details')
      setIsSubmitting(false)
      setIsCreated(false)
      setShowHeader(true)
      setPackageDetails({
        name: '',
        classCount: 1,
        price: 0,
        expirationDays: 30,
        advanceBookingDays: 7,
        branchIds: currentBranch ? [currentBranch.id] : [],
        includePrivateClasses: false,
        tag: null
      })
      setPackagePayment({
        paymentMethods: []
      })
    }
  }, [isOpen, currentBranch])

  const validatePackage = (): boolean => {
    // Validar campos requeridos según la estructura de la tabla
    if (!packageDetails.name.trim()) return false
    if (packageDetails.classCount <= 0) return false
    if (packageDetails.price < 0) return false
    if (packageDetails.expirationDays <= 0) return false
    if (packageDetails.advanceBookingDays < 0) return false
    if (!packageDetails.branchIds.length) return false
    if (!packagePayment.paymentMethods.length) return false

    return true
  }

  const createPackageData = (): PackageFormData => {
    if (!empresa?.id) throw new Error('No se encontró la empresa')
    if (!empresa.auth_user_id) throw new Error('No se encontró el usuario')

    return {
      name: packageDetails.name,
      class_count: packageDetails.classCount,
      price: packageDetails.price,
      expiration_days: packageDetails.expirationDays,
      advance_booking_days: packageDetails.advanceBookingDays || 7,
      branch_ids: packageDetails.branchIds,
      include_private_classes: packageDetails.includePrivateClasses || false,
      tag: packageDetails.tag,
      available_payment_methods: packagePayment.paymentMethods,
      status: 'active'
    }
  }

  const handleCreatePackage = async () => {
    try {
      setIsSubmitting(true)

      if (!empresa?.id || !empresa.auth_user_id) {
        throw new Error('No se encontró la información de la empresa')
      }

      if (!validatePackage()) {
        throw new Error('Por favor complete todos los campos requeridos')
      }

      const supabase = createClientComponentClient()
      const packageData = createPackageData()

      console.log('📦 Creando paquete:', {
        empresa_id: empresa.id,
        created_by: empresa.auth_user_id,
        packageData
      })

      const { data: newPackage, error: packageError } = await supabase
        .from('packages')
        .insert({
          ...packageData,
          empresa_id: empresa.id,
          created_by: empresa.auth_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (packageError) {
        console.error('Error detallado al crear paquete:', packageError)
        throw new Error('Error al crear el paquete: ' + packageError.message)
      }

      console.log('✅ Paquete creado:', newPackage)
      setIsCreated(true)
      toast.success('Paquete creado exitosamente')
    } catch (error) {
      console.error('❌ Error al crear el paquete:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear el paquete')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentStep === 'package-details') {
      setCurrentStep('package-payment')
    } else if (currentStep === 'package-payment') {
      setCurrentStep('package-confirmation')
    } else {
      handleCreatePackage()
    }
  }

  const handleBack = () => {
    if (currentStep === 'package-confirmation') {
      setCurrentStep('package-payment')
    } else if (currentStep === 'package-payment') {
      setCurrentStep('package-details')
    } else {
      onClose()
    }
  }

  const getFooterText = () => {
    if (currentStep === 'package-confirmation') {
      return 'Crear Paquete'
    }
    return 'Continuar'
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'package-details':
        return (
          <PackageDetails
            details={packageDetails}
            onChange={setPackageDetails}
            onValidationChange={setIsValid}
          />
        )
      case 'package-payment':
        return (
          <PackagePaymentMethods
            config={packagePayment}
            onChange={setPackagePayment}
            onValidationChange={setIsValid}
          />
        )
      case 'package-confirmation':
        return (
          <PackageConfirmationStep
            details={packageDetails}
            payment={packagePayment}
            isCreated={isCreated}
            onSuccess={() => setShowHeader(false)}
          />
        )
    }
  }

  if (!mounted) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      className="flex flex-col"
    >
      {/* Header */}
      {showHeader && (
        <ModalHeader 
          currentStep={currentStep}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {currentStep === 'package-confirmation' ? (
            <PackageConfirmationStep
              details={packageDetails}
              payment={packagePayment}
              isCreated={isCreated}
              onSuccess={() => setShowHeader(false)}
            />
          ) : (
            renderStep()
          )}
        </div>
      </div>

      {/* Footer */}
      {!isCreated && (
        <ModalFooter 
          currentStep={currentStep}
          onBack={handleBack}
          onContinue={handleNext}
          isValid={isValid}
          isSubmitting={isSubmitting}
          continueText={getFooterText()}
        />
      )}
    </Modal>
  )
} 